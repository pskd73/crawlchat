import { makeIndexer } from "../indexer/factory";
import { multiLinePrompt, SimpleTool } from "./agentic";
import { z } from "zod";

export type QueryContext = {
  ragQueries: string[];
};

export function makeRagTool(
  scrapeId: string,
  indexerKey: string | null,
  options?: {
    onPreSearch?: (query: string) => Promise<void>;
    topN?: number;
    minScore?: number;
    queryContext?: QueryContext;
  }
) {
  const indexer = makeIndexer({ key: indexerKey, topN: options?.topN });

  return new SimpleTool({
    id: "search_data",
    description: multiLinePrompt([
      "Search the vector database for the most relevant documents.",
    ]),
    schema: z.object({
      query: z.string({
        description: "The query to search the vector database with",
      }),
    }),
    execute: async ({ query }: { query: string }) => {
      if (options?.queryContext?.ragQueries.includes(query)) {
        console.log("Query already searched -", query);
        return {
          content: `The query "${query}" is already searched.`,
        };
      }
      if (
        options?.queryContext &&
        options.queryContext.ragQueries.length >= 5
      ) {
        console.log("Maximum number of queries reached -", query);
        return {
          content: `Maximum number of queries reached. Now frame your answer.`,
        };
      }

      const queryWords = query?.split(" ");
      if (query.length < 5 || queryWords?.length < 4) {
        console.log("Query is too short -", query);
        return {
          content: `The query "${query}" is too short. Search again with a longer query.`,
        };
      }

      console.log("Searching RAG for -", query);

      if (options?.onPreSearch) {
        await options.onPreSearch(query);
      }

      const result = await indexer.search(scrapeId, query, {
        topK: 20,
      });

      const processed = await indexer.process(query, result);
      const filtered = processed.filter(
        (r) => options?.minScore === undefined || r.score >= options.minScore
      );
      if (options?.queryContext) {
        options.queryContext.ragQueries.push(query);
      }
      const context = JSON.stringify(
        filtered.map((r, i) => ({
          url: r.url,
          content: r.content,
          fetchUniqueId: r.fetchUniqueId,
        }))
      );
      return {
        content:
          filtered.length > 0
            ? `<context>\n${context}\n</context>`
            : "No relevant information found. Don't answer the query. Inform that you don't know the answer.",
        customMessage: {
          result: processed,
          query,
        },
      };
    },
  });
}
