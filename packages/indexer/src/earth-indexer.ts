import { Pool } from "pg";
import pgvector from "pgvector/pg";
import type {
  QueryResponse,
  RecordMetadata,
} from "@pinecone-database/pinecone";
import { Indexer, IndexDocument } from "./indexer";
import { randomFetchId } from "./random-fetch-id";

const EMBEDDING_DIM = 3072;
const TABLE_NAME = "earth_embeddings";
const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";
const EMBEDDING_MODEL = "openai/text-embedding-3-large";

export class EarthIndexer implements Indexer {
  private pool: Pool;
  private indexName: string;
  private topN: number;
  private initPromise: Promise<void> | null = null;

  constructor({ topN }: { topN?: number } = {}) {
    const connectionString = process.env.PGVECTOR_URL;
    if (!connectionString) {
      throw new Error("PGVECTOR_URL is required for Earth indexer");
    }
    this.pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 10000,
    });
    this.indexName = "earth";
    this.topN = topN ?? 4;
  }

  private async ensureInit(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = (async () => {
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      await client.query("CREATE EXTENSION IF NOT EXISTS vector");
      pgvector.registerTypes(client);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id text PRIMARY KEY,
          scrape_id text NOT NULL,
          knowledge_group_id text NOT NULL,
          embedding vector(${EMBEDDING_DIM}) NOT NULL,
          content text NOT NULL,
          url text NOT NULL,
          metadata jsonb DEFAULT '{}'
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS earth_embeddings_scrape_id_idx ON ${TABLE_NAME} (scrape_id)
      `);
      await client
        .query(
          `
        CREATE INDEX IF NOT EXISTS earth_embeddings_embedding_idx ON ${TABLE_NAME}
        USING hnsw (embedding vector_cosine_ops)
      `
        )
        .catch(() => {});
      client.release();
    })();
    return this.initPromise;
  }

  getKey(): string {
    return this.indexName;
  }

  makeRecordId(scrapeId: string, id: string): string {
    return `${scrapeId}/${id}`;
  }

  getMinBestScore(): number {
    return 10;
  }

  private async makeEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });
    clearTimeout(timeout);
    const data = await response.json();
    return data.data[0].embedding;
  }

  async upsert(
    scrapeId: string,
    knowledgeGroupId: string,
    documents: IndexDocument[]
  ): Promise<void> {
    if (documents.length === 0) {
      return;
    }
    await this.ensureInit();
    const client = await this.pool.connect();
    pgvector.registerTypes(client);
    for (const doc of documents) {
      const embedding = await this.makeEmbedding(doc.text);
      const content = (doc.metadata.content as string) ?? doc.text;
      const url = (doc.metadata.url as string) ?? "";
      await client.query(
        `INSERT INTO ${TABLE_NAME} (id, scrape_id, knowledge_group_id, embedding, content, url, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           embedding = EXCLUDED.embedding,
           content = EXCLUDED.content,
           url = EXCLUDED.url,
           metadata = EXCLUDED.metadata`,
        [
          doc.id,
          scrapeId,
          knowledgeGroupId,
          pgvector.toSql(embedding),
          content,
          url,
          JSON.stringify(doc.metadata),
        ]
      );
    }
    client.release();
  }

  async search(
    scrapeId: string,
    query: string,
    options?: { topK?: number; excludeIds?: string[] }
  ): Promise<QueryResponse<RecordMetadata>> {
    await this.ensureInit();
    const topK = options?.topK ?? 5;
    const client = await this.pool.connect();
    pgvector.registerTypes(client);
    const queryEmbedding = await this.makeEmbedding(query);
    let sql = `
      SELECT id, content, url, metadata, 1 - (embedding <=> $1) as score
      FROM ${TABLE_NAME}
      WHERE scrape_id = $2
    `;
    const params: (string | number | string[])[] = [
      pgvector.toSql(queryEmbedding),
      scrapeId,
    ];
    if (options?.excludeIds && options.excludeIds.length > 0) {
      params.push(options.excludeIds);
      sql += ` AND id != ALL($3::text[])`;
    }
    params.push(topK);
    sql += ` ORDER BY embedding <=> $1 LIMIT $${params.length}`;
    const result = await client.query(sql, params);
    client.release();
    const matches = result.rows.map((row: any) => ({
      id: row.id,
      score: row.score as number,
      metadata: {
        content: row.content,
        url: row.url,
        scrapeItemId: (row.metadata as Record<string, unknown>)?.scrapeItemId,
        ...(row.metadata as Record<string, unknown>),
      } as RecordMetadata,
    }));
    return { matches } as QueryResponse<RecordMetadata>;
  }

  async process(
    query: string,
    result: QueryResponse<RecordMetadata>
  ): Promise<
    {
      content: string;
      url: string;
      score: number;
      fetchUniqueId: string;
      id: string;
      scrapeItemId?: string;
      query?: string;
    }[]
  > {
    if (result.matches.length === 0) {
      return [];
    }
    const sorted = [...result.matches].sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0)
    );
    return sorted.slice(0, this.topN).map((m) => ({
      content: (m.metadata?.content as string) ?? "",
      url: (m.metadata?.url as string) ?? "",
      score: m.score ?? 0,
      fetchUniqueId: randomFetchId(),
      id: m.metadata?.id as string,
      scrapeItemId: m.metadata?.scrapeItemId as string | undefined,
      query,
    }));
  }

  async deleteScrape(scrapeId: string): Promise<void> {
    await this.ensureInit();
    await this.pool.query(`DELETE FROM ${TABLE_NAME} WHERE scrape_id = $1`, [
      scrapeId,
    ]);
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.ensureInit();
    await this.pool.query(
      `DELETE FROM ${TABLE_NAME} WHERE id = ANY($1::text[])`,
      [ids]
    );
  }
}
