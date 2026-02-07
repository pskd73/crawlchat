import {
  Pinecone,
  RecordMetadata,
  QueryResponse,
} from "@pinecone-database/pinecone";
import { Indexer, IndexDocument } from "./indexer";
import { randomFetchId } from "./random-fetch-id";

export class MarsIndexer implements Indexer {
  private pinecone: Pinecone;
  private indexName: string;
  private denseModel: string;
  private sparseModel: string;
  private topN: number;

  constructor({ topN }: { topN?: number } = {}) {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    this.indexName = "mars";
    this.denseModel = "multilingual-e5-large";
    this.sparseModel = "pinecone-sparse-english-v0";
    this.topN = topN ?? 4;
  }

  getKey(): string {
    return this.indexName;
  }

  makeRecordId(scrapeId: string, id: string) {
    return `${scrapeId}/${id}`;
  }

  getMinBestScore(): number {
    return 10;
  }

  async makeEmbedding(text: string) {
    return await this.pinecone.inference.embed(this.denseModel, [text], {
      inputType: "passage",
      truncate: "END",
    });
  }

  async makeSparseEmbedding(text: string) {
    const response = await fetch("https://api.pinecone.io/embed", {
      method: "POST",
      headers: {
        "Api-Key": process.env.PINECONE_API_KEY!,
        "Content-Type": "application/json",
        "X-Pinecone-API-Version": "2025-01",
      },
      body: JSON.stringify({
        model: this.sparseModel,
        parameters: {
          input_type: "passage",
        },
        inputs: [
          {
            text: text,
          },
        ],
      }),
    });
    return await response.json();
  }

  async upsert(
    scrapeId: string,
    knowledgeGroupId: string,
    documents: IndexDocument[]
  ): Promise<void> {
    if (documents.length === 0) {
      return;
    }
    const index = this.pinecone.index(this.indexName);
    await index.upsert(
      await Promise.all(
        documents.map(async (document) => {
          const sparseData = await this.makeSparseEmbedding(document.text);

          return {
            id: document.id,
            values: ((await this.makeEmbedding(document.text)) as any)[0]
              .values!,
            sparseValues: {
              indices: sparseData.data[0].sparse_indices,
              values: sparseData.data[0].sparse_values,
            },
            metadata: {
              ...document.metadata,
              scrapeId,
              id: document.id,
              knowledgeGroupId,
            },
          };
        })
      )
    );
  }

  async search(
    scrapeId: string,
    query: string,
    options?: { topK?: number; excludeIds?: string[] }
  ) {
    const topK = options?.topK ?? 5;

    const filter: Record<string, any> = {
      scrapeId,
    };

    if (options?.excludeIds) {
      filter.id = {
        $nin: options.excludeIds,
      };
    }

    const index = this.pinecone.index(this.indexName);

    const queryEmbedding = await this.makeEmbedding(query);
    const querySparseEmbedding = await this.makeSparseEmbedding(query);
    const queryResponse = await index.query({
      topK,
      vector: queryEmbedding[0].values!,
      sparseVector: {
        indices: querySparseEmbedding.data[0].sparse_indices,
        values: querySparseEmbedding.data[0].sparse_values,
      },
      includeValues: false,
      includeMetadata: true,
      filter,
    });

    return queryResponse;
  }

  async process(query: string, result: QueryResponse<RecordMetadata>) {
    if (result.matches.length === 0) {
      return [];
    }

    const rerank = await this.pinecone.inference.rerank(
      "bge-reranker-v2-m3",
      query,
      result.matches.map((m) => ({
        id: m.id,
        text: m.metadata!.content as string,
        url: m.metadata!.url as string,
        scrapeItemId: m.metadata!.scrapeItemId as string,
      })),
      {
        topN: this.topN,
        returnDocuments: true,
        parameters: {
          truncate: "END",
        },
      }
    );

    return rerank.data.map((r) => ({
      content: r.document!.text,
      url: r.document!.url,
      score: r.score,
      scrapeItemId: r.document!.scrapeItemId,
      fetchUniqueId: randomFetchId(),
      id: r.document!.id,
      query,
    }));
  }

  async deleteScrape(scrapeId: string): Promise<void> {
    const index = this.pinecone.index(this.indexName);

    let page;

    do {
      page = await index.listPaginated({
        prefix: scrapeId,
        paginationToken: page?.pagination?.next,
      });
      const ids = page.vectors?.map((vector) => vector.id) ?? [];

      if (ids.length === 0) {
        break;
      }

      await index.deleteMany(ids);
    } while (page.pagination?.next);
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const index = this.pinecone.index(this.indexName);
    await index.deleteMany(ids);
  }
}
