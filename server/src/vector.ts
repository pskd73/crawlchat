import type { ScrapeStore } from "./scrape/crawl";
import { pipeline } from "@huggingface/transformers";
import faiss from "faiss-node";

export type LinkResult = {
  url: string;
  index: number;
  content: string;
  metaTags: { key: string; value: string }[];
  distance: number;
};

export async function extractMarkdownText(content: string): Promise<string> {
  const { remark } = await import("remark");
  const { default: strip } = await import("strip-markdown");
  const processedContent = await remark().use(strip).process(content);
  return processedContent.toString();
}

export async function generateEmbeddings(
  texts: string[]
): Promise<Float32Array[]> {
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  return Promise.all(
    texts.map(async (text) => {
      const output = await embedder(text, { pooling: "mean", normalize: true });
      return new Float32Array(output.data);
    })
  );
}

export async function makeIndex(store: ScrapeStore) {
  const texts = [];
  for (const url of store.urlSet.values()) {
    texts.push(store.urls[url!]?.markdown ?? "");
  }
  const embeddings = await generateEmbeddings(texts);
  const dimension = embeddings[0].length;

  const index = new faiss.IndexFlatL2(dimension);
  const embeddingsArray = embeddings.flatMap((arr) => Array.from(arr));
  index.add(embeddingsArray);

  return index;
}

export async function searchInIndex(
  query: string,
  index: faiss.IndexFlatL2,
  topK: number = 10
) {
  const queryEmbedding = await generateEmbeddings([query]);
  const queryArray = Array.from(queryEmbedding[0]);
  return index.search(queryArray, topK);
}

export async function getLinks(
  store: ScrapeStore,
  result: faiss.SearchResult
): Promise<LinkResult[]> {
  const urls = store.urlSet.values();
  return result.labels.map((label, index) => ({
    url: urls[label],
    index: label,
    content: store.urls[urls[label]]?.markdown ?? "",
    metaTags: store.urls[urls[label]]?.metaTags ?? [],
    distance: result.distances[index]
  })).sort((a, b) => a.distance - b.distance);
}
