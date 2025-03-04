import dotenv from "dotenv";
dotenv.config();

import { Agent, logMessage } from "./llm/agentic";
import { Flow } from "./llm/flow";
import { z } from "zod";
import { prisma } from "./prisma";
import { makeIndexer } from "./indexer/factory";
import { ContextCheckerAgent, RAGAgent } from "./llm/rag-agent";
import { scrape, scrapeFetch } from "./scrape/crawl";
import { parseHtml } from "./scrape/parse";
import { Pinecone } from "@pinecone-database/pinecone";

async function main() {
  const scrapeId = "67c1d700cb1ec09c237bab8a";

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: {
      id: scrapeId,
    },
  });
  const indexer = makeIndexer({ key: scrape.indexer });

  const flow = new Flow(
    {
      "rag-agent": new RAGAgent(indexer, scrapeId),
      "context-checker-agent": new ContextCheckerAgent(),
    },
    {
      messages: [
        {
          llmMessage: {
            role: "user",
            content: "How to increase the lambda concurrency?",
          },
        },
      ],
    }
  );

  flow.addNextAgents(["rag-agent"]);

  while (await flow.stream()) {
    logMessage(flow.getLastMessage().llmMessage);
  }
}

async function parse() {
  const result = await scrape("https://help.testable.org/kb/guide/en/general-6tXndMyG9s/Steps/728753");
  console.log(result.parseOutput.markdown);
}

async function search() {
  const scrapeId = "67c4b557938011aa163a7597";
  const scrape = await prisma.scrape.findFirstOrThrow({
    where: {
      id: scrapeId,
    },
  });
  const indexer = makeIndexer({ key: scrape.indexer });

  const query = "What are the button variants available?";

  const result = await indexer.search(scrapeId, query, {
    topK: 20,
  });

  console.log(result.matches.map((m) => [m.metadata!.url, m.score]));

  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

  const rerank = await pc.inference.rerank(
    "bge-reranker-v2-m3",
    query,
    result.matches.map((m) => ({
      id: m.id,
      text: m.metadata!.content as string,
    })),
    {
      topN: 4,
      returnDocuments: true,
      parameters: {
        truncate: "END",
      },
    }
  );

  console.log(rerank.data.map((r) => [r.index, r.score]));

  // const flow = new Flow(
  //   {
  //     "rag-agent": new RAGAgent(indexer, scrapeId),
  //   },
  //   {
  //     messages: [
  //       {
  //         llmMessage: {
  //           role: "user",
  //           content: "What are the button variants available?",
  //         },
  //       },
  //     ],
  //   }
  // );

  // flow.addNextAgents(["rag-agent"]);

  // while (await flow.stream()) {
  //   logMessage(flow.getLastMessage().llmMessage);
  // }
}

console.log("Starting...");
parse();
