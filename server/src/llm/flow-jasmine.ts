import { makeIndexer } from "../indexer/factory";
import {
  FlowMessage,
  multiLinePrompt,
  SimpleAgent,
  SimpleTool,
} from "./agentic";
import { Flow } from "./flow";
import { z } from "zod";

type RAGAgentCustomMessage = {
  result?: {
    content: string;
    url?: string;
    score: number;
    scrapeItemId?: string;
  }[];
};

export function makeRagTool(scrapeId: string, indexerKey: string | null) {
  const indexer = makeIndexer({ key: indexerKey });

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
                  index: i,
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
  indexerKey: string | null
) {
  const ragTool = makeRagTool(scrapeId, indexerKey);

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
    ]),
    tools: [ragTool.make()],
  });

  const answerAgent = new SimpleAgent<RAGAgentCustomMessage>({
    id: "answerer",
    prompt: multiLinePrompt([
      `Given above context, answer the query "${query}".`,
      "Cite the sources in the format of !!<index>!! at the end of the sentance or paragraph. Example: !!0!!",
      "Cite only for the sources that are used to answer the query.",
      "Pick most relevant sources and cite them.",
      systemPrompt,
    ]),
  });

  const flow = new Flow(
    [ragAgent, answerAgent],
    {
      messages: [
        ...messages,
        {
          llmMessage: {
            role: "user",
            content: query,
          },
        },
      ],
    },
    { repeatToolAgent: false }
  );

  flow.addNextAgents(["rag-agent", "answerer"]);

  return flow;
}
