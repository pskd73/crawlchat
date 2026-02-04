import { Indexer } from "./indexer";
import { EarthIndexer } from "./earth-indexer";
import { MarsIndexer } from "./mars-indexer";

export function makeIndexer({
  key,
  topN,
}: {
  key: string | null;
  topN?: number;
}): Indexer {
  const indexers: Indexer[] = [new MarsIndexer({ topN })];
  if (process.env.PGVECTOR_URL) {
    indexers.push(new EarthIndexer({ topN }));
  }
  const indexMap = new Map<string, Indexer>();
  for (const indexer of indexers) {
    indexMap.set(indexer.getKey(), indexer);
  }
  if (key && indexMap.has(key)) {
    return indexMap.get(key)!;
  }

  throw new Error(`Indexer ${key} not found`);
}
