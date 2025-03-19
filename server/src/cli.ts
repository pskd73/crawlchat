import dotenv from "dotenv";
dotenv.config();

import { cleanupThreads } from "./scripts/thread-cleanup";
import { multiLinePrompt, SimpleAgent, SimpleTool } from "./llm/agentic";
import { z } from "zod";
import { Flow } from "./llm/flow";
import { makeRagTool } from "./llm/flow-jasmine";

async function main() {
  const ragTool = makeRagTool("67c1d700cb1ec09c237bab8a", "mars");

  const query = `hello world is putting the videos together to make the full actual video. root is the main and manages the elements in the composition, correct?`;

  const ragAgent = new SimpleAgent({
    id: "rag-agent",
    prompt: multiLinePrompt([
      "You are a helpful assistant that can fetch information from database about the context provided.",
      "Use the search_data tool to search the vector database for the relavent information.",
      "Don't hallucinate. You cannot add new topics to the query. It should be inside the context of the query.",
      "The query should be very short and should not be complex.",
      "Break the complex queries into smaller queries.",
      "Use the search_data tool only once.",
    ]),
    tools: [ragTool.make()],
  });

  const checker = new SimpleAgent({
    id: "gap-finder",
    prompt: multiLinePrompt([
      `Given the query "${query}", you need to find what details are missing to answer the query.`,
      "Return the missing details in a list of strings.",
      "If nothing is missing, return an empty list.",
      "Keep the list short and concise. Don't include unnecessary details.",
      "Only focus on the query and the context, include details only if they are directly mentioned in the query.",
      "Don't repeat the same or similar queries.",
    ]),
    schema: z.object({
      missingDetails: z.array(z.string()),
    }),
  });

  const answerer = new SimpleAgent({
    id: "answerer",
    prompt: multiLinePrompt([
      `Given above context, answer the query "${query}".`,
    ]),
  });

  const flow = new Flow([ragAgent, checker, answerer], {
    messages: [
      {
        llmMessage: {
          role: "user",
          content: query,
        },
      },
    ],
  });

  flow.addNextAgents(["rag-agent"]);

  while (await flow.stream({})) {
    if (flow.isToolPending()) {
      continue;
    }

    const message = flow.getLastMessage();

    console.log(message);

    if (message.agentId === "gap-finder") {
      const { missingDetails } = JSON.parse(message.llmMessage.content as string);
      if (missingDetails.length > 0) {
        flow.addNextAgents(["rag-agent"]);
      }
    } else if (message.agentId === "rag-agent") {
      flow.addNextAgents(["gap-finder"]);
    }
  }
}

console.log("Starting...");
// main();
cleanupThreads();
