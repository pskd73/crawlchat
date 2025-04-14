import { makeIndexer } from "../indexer/factory";
import {
  FlowMessage,
  multiLinePrompt,
  SimpleAgent,
  SimpleTool,
} from "./agentic";
import { Flow } from "./flow";
import { z } from "zod";

export type RAGAgentCustomMessage = {
  result?: {
    id: string;
    content: string;
    url?: string;
    score: number;
    scrapeItemId?: string;
    fetchUniqueId?: string;
  }[];
};

export function makeRagTool(
  scrapeId: string,
  indexerKey: string | null,
  options?: { onPreSearch?: (query: string) => Promise<void>; topN?: number }
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
      if (options?.onPreSearch) {
        await options.onPreSearch(query);
      }

      console.log("Searching RAG for -", query);
      const result = await indexer.search(scrapeId, query, {
        topK: 20,
      });

      let processed = await indexer.process(query, result);

      return {
        content:
          processed.length > 0
            ? JSON.stringify(
                processed.map((r, i) => ({
                  url: r.url,
                  content: r.content,
                  fetchUniqueId: r.fetchUniqueId,
                }))
              )
            : "No relevant information found. Don't answer the query. Inform that you don't know the answer.",
        customMessage: {
          result: processed,
        },
      };
    },
  });
}

export function makeFlow(
  scrapeId: string,
  systemPrompt: string,
  query: string,
  messages: FlowMessage<RAGAgentCustomMessage>[],
  indexerKey: string | null,
  options?: {
    onPreSearch?: (query: string) => Promise<void>;
    model?: string;
    baseURL?: string;
    apiKey?: string;
    topN?: number;
  }
) {
  const ragTool = makeRagTool(scrapeId, indexerKey, options);

  const ragAgent = new SimpleAgent<RAGAgentCustomMessage>({
    id: "rag-agent",
    prompt: multiLinePrompt([
      "You are a helpful assistant that can answer questions about the context provided.",
      "Use the search_data tool to search the vector database for the relavent information.",
      "You can run search_data tool multiple times to get more information.",
      "Don't hallucinate. You cannot add new topics to the query. It should be inside the context of the query.",
      "The query should be very short and should not be complex.",
      "Break the complex queries into smaller queries.",
      "Example: If the query is 'How to build a site and deploy it on Vercel?', break it into 'How to build a site' and 'Deploy it on Vercel'.",
      "Example: If the topic is about a tool called 'Remotion', turn the query 'What is it?' into 'What is Remotion?'",
      "These queries are for a vector database. Don't use extra words that do not add any value in vectorisation.",
      "Example: If the query is 'How to make a composition?', better you use 'make a composition'",
      "The query should not be more than 3 words. Keep only the most important words.",
      "Don't repeat the same or similar queries.",
      "Break multi level queries as well. For example: 'What is the average score?' should be split into 'score list' and then calculate the average.",
      "You need to find indirect questions. For example: 'What is the cheapest pricing plan?' should be converted into 'pricing plans' and then find cheapest",

      "Don't repeat the question in the answer.",
      "Don't inform about searching using the RAG tool. Just fetch and answer.",
      "Don't use headings in the answer.",
      "Query only related items from RAG. Keep the search simple and small",
      "Don't repeat similar search terms. Don't use more than 3 searches from RAG.",
      "Don't use the RAG tool once you have the answer.",
      "Output should be very very short and under 200 words.",

      "Once you have the context,",
      `Given above context, answer the query "${query}".`,
      "Cite the sources in the format of !!<fetchUniqueId>!! at the end of the sentance or paragraph. Example: !!123!!",
      "<fetchUniqueId> should be the 'fetchUniqueId' mentioned above context json.",
      "Cite only for the sources that are used to answer the query.",
      "Pick most relevant sources and cite them.",
      "Don't ask more than 3 questions for the entire answering flow.",
      systemPrompt,
    ]),
    tools: [ragTool.make()],
    model: options?.model,
    baseURL: options?.baseURL,
    apiKey: options?.apiKey,
  });

  const flow = new Flow([ragAgent], {
    messages: [
      ...messages,
      {
        llmMessage: {
          role: "user",
          content: query,
        },
      },
    ],
  });

  flow.addNextAgents(["rag-agent"]);

  return flow;
}
