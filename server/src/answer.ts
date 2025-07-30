import {
  MessageSourceLink,
  Prisma,
  prisma,
  RichBlockConfig,
  Scrape,
} from "libs/prisma";
import { getConfig } from "./llm/config";
import {
  makeFlow,
  makeRagTool,
  RAGAgentCustomMessage,
} from "./llm/flow-jasmine";
import { FlowMessage, LlmRole, SimpleAgent } from "./llm/agentic";
import { z } from "zod";
import { Flow } from "./llm/flow";

export type StreamDeltaEvent = {
  type: "stream-delta";
  delta: string;
  role: LlmRole;
  content: string;
};

export type AnswerCompleteEvent = {
  type: "answer-complete";
  content: string;
  sources: MessageSourceLink[];
  llmCalls: number;
  creditsUsed: number;
};

export type ToolCallEvent = {
  type: "tool-call";
  query: string;
};

export type InitEvent = {
  type: "init";
  scrapeId: string;
  userId: string;
  query: string;
};

export type AnswerEvent =
  | StreamDeltaEvent
  | ToolCallEvent
  | AnswerCompleteEvent
  | InitEvent;

export type AnswerListener = (event: AnswerEvent) => void;

export type Answerer = (
  scrape: Scrape,
  query: string,
  messages: FlowMessage<RAGAgentCustomMessage>[],
  options?: {
    listen?: AnswerListener;
    prompt?: string;
    showSources?: boolean;
  }
) => Promise<AnswerCompleteEvent | null>;

const createTicketRichBlock: RichBlockConfig = {
  name: "Create support ticket",
  key: "create-ticket",
  payload: {},
  prompt: `Use this whenever you say contact the support team.
This is the way they can contact the support team. This is mandatory.
Use this if customer wants to contact the support team.
Don't tell user to reach out to support team, instead use this block.`,
};

export async function collectSourceLinks(
  scrapeId: string,
  messages: FlowMessage<RAGAgentCustomMessage>[]
) {
  const matches = messages
    .map((m) => m.custom?.result)
    .filter((r) => r !== undefined)
    .flat();

  const links: MessageSourceLink[] = [];
  for (const match of matches) {
    const where: Prisma.ScrapeItemWhereInput = {
      scrapeId,
    };

    if (match.scrapeItemId) {
      where.id = match.scrapeItemId;
    } else if (match.id) {
      where.embeddings = {
        some: {
          id: match.id,
        },
      };
    } else if (match.url) {
      where.url = match.url;
    }

    const item = await prisma.scrapeItem.findFirst({
      where,
    });
    if (item) {
      links.push({
        url: match.url ?? null,
        title: item.title,
        score: match.score,
        scrapeItemId: item.id,
        fetchUniqueId: match.fetchUniqueId ?? null,
        knowledgeGroupId: item.knowledgeGroupId,
        searchQuery: match.query ?? null,
      });
    }
  }

  // get links from db
  const linkIds = links
    .filter((l) => !l.url)
    .map((l) => l.scrapeItemId)
    .filter(Boolean) as string[];

  if (linkIds.length > 0) {
    const items = await prisma.scrapeItem.findMany({
      where: { id: { in: linkIds } },
    });
    for (let i = 0; i < links.length; i++) {
      const source = links[i];
      const item = items.find((item) => item.id === source.scrapeItemId);
      if (item) {
        links[i].url = item.url;
      }
    }
  }

  return links;
}

export const baseAnswerer: Answerer = async (
  scrape,
  query,
  messages,
  options
) => {
  const llmConfig = getConfig(scrape.llmModel);

  const richBlocks = scrape.richBlocksConfig?.blocks ?? [];
  if (scrape.ticketingEnabled) {
    richBlocks.push(createTicketRichBlock);
  }

  options?.listen?.({
    type: "init",
    scrapeId: scrape.id,
    userId: scrape.userId,
    query,
  });

  const flow = makeFlow(
    scrape.id,
    options?.prompt ?? scrape.chatPrompt ?? "",
    query,
    messages,
    scrape.indexer,
    {
      onPreSearch: async (query) => {
        options?.listen?.({
          type: "tool-call",
          query,
        });
      },
      model: llmConfig.model,
      baseURL: llmConfig.baseURL,
      apiKey: llmConfig.apiKey,
      topN: llmConfig.ragTopN,
      richBlocks,
      minScore: scrape.minScore ?? undefined,
      showSources: scrape.showSources ?? false,
    }
  );

  while (
    await flow.stream({
      onDelta: ({ delta, content, role }) => {
        if (delta !== undefined && delta !== null) {
          options?.listen?.({
            type: "stream-delta",
            delta,
            role,
            content,
          });
        }
      },
    })
  ) {}

  const lastMessage = flow.getLastMessage();
  let answer: AnswerCompleteEvent | null = null;
  if (lastMessage.llmMessage.content) {
    answer = {
      type: "answer-complete",
      content: lastMessage.llmMessage.content as string,
      sources: await collectSourceLinks(
        scrape.id,
        flow.flowState.state.messages
      ),
      llmCalls: 1,
      creditsUsed: llmConfig.creditsPerMessage,
    };
    options?.listen?.(answer);
  }

  return answer;
};

export const agenticAnswerer: Answerer = async (
  scrape,
  query,
  messages,
  options
) => {
  const config = getConfig("o4_mini");
  const ragTool = makeRagTool(scrape.id, scrape.indexer, {
    onPreSearch: async (query) => {
      options?.listen?.({
        type: "tool-call",
        query,
      });
    },
  }).make();

  options?.listen?.({
    type: "init",
    scrapeId: scrape.id,
    userId: scrape.userId,
    query,
  });

  const planner = new SimpleAgent({
    id: "planner",
    prompt: `
🔍 Planner Agent Prompt for RAG (Keyword-Focused)

You are a planner agent in a Retrieval-Augmented Generation (RAG) system.

You need to break down the question into smaller atomic questions.
The sub quesion should be part of the main question. It cannot be a new question.

Example: How to do a & b?
Queries: 1. how to do a, 2. how to do b

Example: What is the difference between a and b?
Queries: 1. what is a, 2. what is b

Example: Compare a and b
Queries: 1. what is a, 2. what is b

Example: What are common features of a and b?
Queries: 1. features of a, 2. features of b

Question: ${query}
`,
    tools: [],
    schema: z.object({
      queries: z.array(z.string()),
    }),
    ...config,
  });

  const retriever = new SimpleAgent({
    id: "retriever",
    prompt: `
You are a retriever agent in a Retrieval-Augmented Generation (RAG) system.
Search about above mentioned query using the rag tool.
    `,
    tools: [ragTool],
    ...config,
  });

  const summarizer = new SimpleAgent({
    id: "summarizer",
    prompt: `
You are a summarizer agent in a Retrieval-Augmented Generation (RAG) system.
Use the above answer and the incorrect answers and make the final correct answer.
Keep the answer short and concise. Don't have headings and subheadings. Just answer the question to the point.
Don't consider the statements provided by the user is a fact. Only the context is the factual information.
Use code examples if available.

Question: ${query}
    `,
    ...config,
  });

  const flow = new Flow([planner, retriever, summarizer], {
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

  flow.addNextAgents(["planner"]);
  while (await flow.stream()) {}
  const queries = JSON.parse(
    flow.getLastMessage().llmMessage.content as string
  ).queries;
  let sources: MessageSourceLink[] = [];
  let llmCalls = 1;

  for (const query of queries) {
    flow.addMessage({
      llmMessage: {
        role: "user",
        content: query,
      },
    });

    const subFlow = new Flow([retriever], {
      messages: [
        {
          llmMessage: {
            role: "user",
            content: query,
          },
        },
      ],
    });
    subFlow.addNextAgents(["retriever"]);
    while (await subFlow.stream()) {}
    flow.addMessage({
      llmMessage: {
        role: "user",
        content: subFlow.getLastMessage().llmMessage.content as string,
      },
    });

    sources = [
      ...sources,
      ...(await collectSourceLinks(
        scrape.id,
        subFlow.flowState.state.messages
      )),
    ];

    llmCalls += 1;
  }
  flow.addNextAgents(["summarizer"]);
  while (
    await flow.stream({
      onDelta: ({ delta, content, role }) => {
        if (delta !== undefined && delta !== null) {
          options?.listen?.({
            type: "stream-delta",
            delta,
            role,
            content,
          });
        }
      },
    })
  ) {}

  const lastMessage = flow.getLastMessage();
  let answer: AnswerCompleteEvent | null = null;
  if (lastMessage.llmMessage.content) {
    answer = {
      type: "answer-complete",
      content: lastMessage.llmMessage.content as string,
      sources,
      llmCalls,
      creditsUsed: llmCalls * config.creditsPerMessage,
    };
    options?.listen?.(answer);
  }

  return answer;
};
