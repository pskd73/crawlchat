import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";
import {
  pipeline,
  AutoTokenizer,
  FeatureExtractionPipeline,
} from "@huggingface/transformers";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

let embedder: FeatureExtractionPipeline;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      dtype: "fp16",
    });
  }
  return embedder;
}

function makeIndexName(userId: string) {
  return `user-${userId}`;
}

function makeNamespaceName(scrapeId: string) {
  return `scrape-${scrapeId}`;
}

export async function makeEmbedding(text: string) {
  const embedder = await getEmbedder();
  const output = await embedder(text, {
    pooling: "mean",
    normalize: true,
  });
  return new Float32Array(output.data);
}

export async function chunkText(
  text: string,
  modelName = "Xenova/all-MiniLM-L6-v2",
  maxTokens = 512,
  overlap = 50
) {
  const tokenizer = await AutoTokenizer.from_pretrained(modelName);
  const tokens = await tokenizer(text, { add_special_tokens: false });

  const inputIds = Array.from(
    tokens.input_ids.data || tokens.input_ids
  ) as number[];

  const chunks = [];
  let start = 0;

  while (start < inputIds.length) {
    let end = Math.min(start + maxTokens, inputIds.length);
    let chunkTokens = inputIds.slice(start, end);
    let chunkText = await tokenizer.decode(chunkTokens, {
      skip_special_tokens: true,
    });

    chunks.push(chunkText);
    start += maxTokens - overlap;
  }

  return chunks;
}

export async function createIndex(userId: string) {
  const indexName = makeIndexName(userId);
  const indexes = await pc.listIndexes();

  if (indexes.indexes?.some((index) => index.name === indexName)) {
    return;
  }

  await pc.createIndex({
    name: indexName,
    dimension: 384,
    metric: "cosine",
    spec: {
      serverless: {
        cloud: "aws",
        region: "us-east-1",
      },
    },
  });
}

export async function saveEmbedding(
  userId: string,
  scrapeId: string,
  docs: {
    embedding: Float32Array<ArrayBuffer>;
    metadata: {
      content: string;
      url: string;
    };
  }[]
) {
  const index = pc.index(makeIndexName(userId));
  await index.namespace(makeNamespaceName(scrapeId)).upsert(
    docs.map((doc) => ({
      id: uuidv4(),
      values: Array.from(doc.embedding),
      metadata: doc.metadata,
    }))
  );
}

export async function search(
  userId: string,
  scrapeId: string,
  queryEmbedding: Float32Array<ArrayBuffer>,
  options?: {
    topK?: number;
  }
) {
  const topK = options?.topK ?? 5;

  const index = pc.index(makeIndexName(userId));
  return await index.namespace(makeNamespaceName(scrapeId)).query({
    topK,
    vector: Array.from(queryEmbedding),
    includeMetadata: true,
  });
}

export async function deleteScrape(userId: string, scrapeId: string) {
  const index = pc.index(makeIndexName(userId));
  await index.namespace(makeNamespaceName(scrapeId)).deleteAll();
}
