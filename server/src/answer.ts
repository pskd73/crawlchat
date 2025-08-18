import {
  ApiAction,
  ApiActionCall,
  MessageSourceLink,
  Prisma,
  prisma,
  RichBlockConfig,
  Scrape,
} from "libs/prisma";
import { getConfig } from "./llm/config";
import { makeFlow, RAGAgentCustomMessage } from "./llm/flow-jasmine";
import { FlowMessage, LlmRole } from "./llm/agentic";

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
  actionCalls: ApiActionCall[];
  llmCalls: number;
  creditsUsed: number;
  messages: FlowMessage<RAGAgentCustomMessage>[];
};

export type ToolCallEvent = {
  type: "tool-call";
  query?: string;
  action?: string;
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
    actions?: ApiAction[];
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

export async function collectActionCalls(
  scrapeId: string,
  messages: FlowMessage<RAGAgentCustomMessage>[]
) {
  return messages
    .map((m) => m.custom?.actionCall)
    .filter((r) => r !== undefined)
    .flat();
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
      onPreAction: async (title) => {
        options?.listen?.({
          type: "tool-call",
          action: title,
        });
      },
      model: llmConfig.model,
      baseURL: llmConfig.baseURL,
      apiKey: llmConfig.apiKey,
      topN: llmConfig.ragTopN,
      richBlocks,
      minScore: scrape.minScore ?? undefined,
      showSources: scrape.showSources ?? false,
      actions: options?.actions,
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
      actionCalls: await collectActionCalls(
        scrape.id,
        flow.flowState.state.messages
      ),
      llmCalls: 1,
      creditsUsed: llmConfig.creditsPerMessage,
      messages: flow.flowState.state.messages,
    };
    options?.listen?.(answer);
  }

  return answer;
};
