import { multiLinePrompt } from "@packages/agentic";
import { makeIndexer } from "@packages/indexer";
import { z } from "zod";

export type SearchToolContext = {
  queries: string[];
};

const MIN_QUERY_WORDS = 3;

export function makeSearchTool(
  scrapeId: string,
  indexerKey: string | null,
  options?: {
    onPreSearch?: (query: string) => Promise<void>;
    topN?: number;
    minScore?: number;
    queryContext?: SearchToolContext;
  }
) {
  const indexer = makeIndexer({ key: indexerKey, topN: options?.topN });

  return {
    id: "search_data",
    description: multiLinePrompt([
      "Search the vector database for the most relevant documents.",
      `Minimum ${MIN_QUERY_WORDS} words required to search.`,
    ]),
    schema: z.object({
      query: z.string({
        description:
          "The query to search the vector database with. Minimum 4 words required.",
      }),
    }),
    execute: async ({ query }: { query: string }) => {
      console.log("[search_data] called with:", { query });
      if (options?.queryContext?.queries.includes(query)) {
        console.log("Query already searched -", query);
        return {
          content: `The query "${query}" is already searched.`,
        };
      }
      if (options?.queryContext && options.queryContext.queries.length >= 5) {
        console.log("Maximum number of queries reached -", query);
        return {
          content: `Maximum number of queries reached. Now frame your answer.`,
        };
      }

      const queryWords = query?.split(" ");
      if (
        query.length < MIN_QUERY_WORDS ||
        queryWords?.length < MIN_QUERY_WORDS
      ) {
        console.log("Query is too short -", query);
        return {
          content: multiLinePrompt([
            `The query "${query}" is too short`,
            `Minimum ${MIN_QUERY_WORDS} words.`,
          ]),
        };
      }

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
        options.queryContext.queries.push(query);
      }
      const context = JSON.stringify(
        filtered.map((r, i) => ({
          url: r.url,
          content: r.content,
          fetchUniqueId: r.fetchUniqueId,
          scrapeItemId: r.scrapeItemId,
        }))
      );
      return {
        content:
          filtered.length > 0
            ? `<context>\n${context}\n</context>`
            : "No relevant information found. Don't answer the query. Inform that you don't know the answer.",
        customMessage: {
          result: processed.map((r) => ({ ...r, searchType: "search_data" })),
          query,
        },
      };
    },
  };
}
