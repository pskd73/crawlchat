import {
  ApiAction,
  ApiActionCall,
  MessageSourceLink,
  Prisma,
  prisma,
  RichBlockConfig,
  MessageChannel,
  Scrape,
  Thread,
  ScrapeItem,
} from "libs/prisma";
import { getConfig } from "./llm/config";
import { makeFlow, RAGAgentCustomMessage } from "./llm/flow-jasmine";
import {
  getQueryString,
  MultimodalContent,
  removeImages,
} from "libs/llm-message";
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
  context: string[];
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
  thread: Thread,
  query: string | MultimodalContent[],
  messages: FlowMessage<RAGAgentCustomMessage>[],
  options?: {
    listen?: AnswerListener;
    prompt?: string;
    showSources?: boolean;
    actions?: ApiAction[];
    channel?: MessageChannel;
    clientData?: any;
    secret?: string;
    scrapeItem?: ScrapeItem;
  }
) => Promise<AnswerCompleteEvent | null>;

const createTicketRichBlock: RichBlockConfig = {
  name: "Create support ticket",
  key: "create-ticket",
  payload: {},
  prompt: `Use this whenever you say contact the support team.
This is the way they can contact the support team. This is mandatory.
Use this if customer wants to contact the support team.
If you use this block, you need not to search using the search_data tool.
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

export function collectContext(messages: FlowMessage<RAGAgentCustomMessage>[]) {
  return messages
    .map((m) => m.custom?.result)
    .filter((r) => r !== undefined)
    .flat()
    .map((m) => m.content);
}

export const baseAnswerer: Answerer = async (
  scrape,
  thread,
  query,
  messages,
  options
) => {
  const llmConfig = getConfig(scrape.llmModel);

  const richBlocks = scrape.richBlocksConfig?.blocks ?? [];
  if (scrape.ticketingEnabled && options?.channel === "widget") {
    richBlocks.push(createTicketRichBlock);
  }

  if (options?.channel === "widget") {
    richBlocks.push({
      name: "Verify email",
      key: "verify-email",
      payload: {},
      prompt: `Use this block to verify the email of the user for this thread. 
Just use this block, don't ask the user to enter the email. Use it only if the tool asks for it.`,
    });
  }

  options?.listen?.({
    type: "init",
    scrapeId: scrape.id,
    userId: scrape.userId,
    query: getQueryString(query),
  });

  if (!llmConfig.supportsImages) {
    query = removeImages(query);
    for (let i = 0; i < messages.length; i++) {
      messages[i].llmMessage.content = removeImages(
        messages[i].llmMessage.content as string | MultimodalContent[]
      );
    }
  }

  const flow = makeFlow(
    thread,
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
      clientData: options?.clientData,
      secret: options?.secret,
      scrapeItem: options?.scrapeItem,
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
      context: collectContext(flow.flowState.state.messages),
    };
    options?.listen?.(answer);
  }

  return answer;
};
