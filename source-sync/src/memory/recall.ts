import { Agent, Flow, Message, multiLinePrompt } from "@packages/agentic";
import { z } from "zod";
import { getAllNodes, getAllRelationships, getNodes } from "./graph";

function contentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (content === null || content === undefined) {
    return "";
  }
  return String(content);
}

export async function recall(collectionId: string, question: string) {
  const tools = [
    {
      id: "graph_get_all_nodes",
      description: "Get all nodes from the graph memory collection.",
      schema: z.object({}),
      execute: async () => {
        const nodes = await getAllNodes(collectionId);
        return {
          content: JSON.stringify({ nodes }),
        };
      },
    },
    {
      id: "graph_get_all_relationships",
      description:
        "Get all relationship types from the graph memory collection.",
      schema: z.object({}),
      execute: async () => {
        const relationships = await getAllRelationships(collectionId);
        return {
          content: JSON.stringify({ relationships }),
        };
      },
    },
    {
      id: "graph_get_nodes",
      description:
        "Get detailed node neighborhood with incoming and outgoing relationships.",
      schema: z.object({
        names: z.array(z.string().min(1)).min(1),
      }),
      execute: async ({ names }: { names: string[] }) => {
        const nodes = await getNodes(collectionId, names);
        return {
          content: JSON.stringify({ nodes }),
        };
      },
    },
  ];

  const agent = new Agent({
    id: "memory-recall-agent",
    prompt: multiLinePrompt([
      "You are a graph-memory reasoning assistant.",
      "You answer questions only from graph-memory tool results.",
      "Call tools to gather facts before answering.",
      "If memory has insufficient evidence, return exactly: I don't know.",
      "Do not invent nodes or relationships.",
      "Return only the final answer as plain text.",
      "Do not provide reasoning, caveats, or process explanation.",
      "Do not mention tools, graph memory, or missing context.",
      "Do not use markdown formatting.",
      "Only read tools are available; do not attempt memory mutations.",
    ]),
    tools,
    model: "anthropic/claude-sonnet-4.6",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    maxTokens: 1200,
    user: collectionId,
  });

  const initialMessages: { llmMessage: Message }[] = [
    {
      llmMessage: {
        role: "user",
        content: question,
      },
    },
  ];

  const flow = new Flow<{}, {}>(
    [agent],
    {
      messages: initialMessages,
    },
    { maxToolCalls: 30 }
  );

  flow.addNextAgents(["memory-recall-agent"]);

  for (let i = 0; i < 60; i++) {
    const result = await flow.stream();
    if (!result) {
      break;
    }
  }

  const assistantMessages = flow.flowState.state.messages
    .map((message) => message.llmMessage)
    .filter((message) => message.role === "assistant");
  const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
  const answer = lastAssistantMessage
    ? contentToText((lastAssistantMessage as { content?: unknown }).content)
    : "";

  return {
    answer,
    usage: flow.getUsage(),
    toolCalls: flow.flowState.toolCalls,
  };
}
