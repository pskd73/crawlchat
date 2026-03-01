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
  ToolCall,
} from "@packages/common/prisma";
import { getConfig, LlmConfig } from "./llm/config";
import { makeRagAgent, makeRagFlow } from "./llm/flow";
import {
  getQueryString,
  MultimodalContent,
  removeImages,
} from "@packages/common/llm-message";
import { Role, Usage } from "@packages/agentic";
import { FlowMessage } from "./llm/flow";
import { CustomMessage, DataGap } from "./llm/custom-message";
import { consumeCredits } from "@packages/common/user-plan";
import { fillMessageAnalysis } from "./analyse-message";
import { ensureRepoCloned } from "@packages/flash";
import { extractCitations } from "@packages/common/citation";
import { retry } from "./retry";

export type StreamDeltaEvent = {
  type: "stream-delta";
  delta: string;
  role: Role;
  content: string;
};

export type AnswerCompleteEvent = {
  type: "answer-complete";
  question: string | MultimodalContent[];
  content: string;
  sources: MessageSourceLink[];
  actionCalls: ApiActionCall[];
  llmCalls: number;
  creditsUsed: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  llmCost: number;
  messages: FlowMessage<CustomMessage>[];
  context: string[];
  dataGap?: DataGap;
  toolCalls: ToolCall[];
  llmConfig: LlmConfig;
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
  messages: FlowMessage<CustomMessage>[],
  options?: {
    listen?: AnswerListener;
    prompt?: string;
    showSources?: boolean;
    actions?: ApiAction[];
    channel?: MessageChannel;
    clientData?: any;
    secret?: string;
    scrapeItem?: ScrapeItem;
    llmConfig?: LlmConfig;
  }
) => Promise<AnswerCompleteEvent>;

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
  messages: FlowMessage<CustomMessage>[]
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
        score: match.score ?? null,
        scrapeItemId: item.id,
        fetchUniqueId: match.fetchUniqueId ?? null,
        knowledgeGroupId: item.knowledgeGroupId,
        searchQuery: match.query ?? null,
        searchType: match.searchType ?? null,
        cited: null,
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
  messages: FlowMessage<CustomMessage>[]
) {
  return messages
    .map((m) => m.custom?.actionCall)
    .filter((r) => r !== undefined)
    .flat();
}

export function collectDataGap(
  messages: FlowMessage<CustomMessage>[]
): DataGap | undefined {
  const gaps = messages
    .map((m) => m.custom?.dataGap)
    .filter((r) => r !== undefined);
  return gaps.length > 0 ? gaps[gaps.length - 1] : undefined;
}

export function collectContext(messages: FlowMessage<CustomMessage>[]) {
  return messages
    .map((m) => m.custom?.result)
    .filter((r) => r !== undefined)
    .flat()
    .map((m) => m.content);
}

export function updateLastMessageAt(threadId: string) {
  return prisma.thread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });
}

function getUsageCredits(usage: Usage, defaultCredits: number) {
  if (usage.totalTokens === 0) {
    return defaultCredits;
  }

  const creditsPerDollar = 120;
  const credits = Math.ceil(usage.cost * creditsPerDollar);
  return Math.min(10, Math.max(1, credits));
}

export const baseAnswererInternal: Answerer = async (
  scrape,
  thread,
  query,
  messages,
  options
) => {
  const llmConfig = options?.llmConfig ?? getConfig(scrape.llmModel);

  const githubRepoGroup = await prisma.knowledgeGroup.findFirst({
    where: {
      scrapeId: scrape.id,
      type: "scrape_github",
    },
  });
  let githubRepoPath: string | undefined;
  const githubRepoUrl = githubRepoGroup?.url ?? githubRepoGroup?.githubUrl;
  if (githubRepoGroup && githubRepoUrl) {
    githubRepoPath = `/tmp/flash-${githubRepoGroup.id}`;
    await ensureRepoCloned(
      githubRepoUrl,
      githubRepoPath,
      githubRepoGroup.githubBranch ?? "main"
    );
  }

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

  const ragAgent = makeRagAgent(
    thread,
    scrape.id,
    options?.prompt ?? scrape.chatPrompt ?? "",
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
      onPreCodebaseTool: (toolId, input) => {
        options?.listen?.({
          type: "tool-call",
          action: `${toolId}: ${JSON.stringify(input)}`,
        });
      },
      llmConfig,
      richBlocks,
      minScore: scrape.minScore ?? undefined,
      showSources: scrape.showSources ?? false,
      actions: options?.actions,
      clientData: options?.clientData,
      secret: options?.secret,
      scrapeItem: options?.scrapeItem,
      githubRepoPath,
    }
  );

  const flow = makeRagFlow(ragAgent, messages, query);
  let lastMessage = null;

  for (let i = 0; i < 3; i++) {
    while (
      await flow.stream(({ delta, content, role }) => {
        if (delta !== undefined && delta !== null) {
          options?.listen?.({
            type: "stream-delta",
            delta,
            role,
            content,
          });
        }
      })
    ) {}
    lastMessage = flow.getLastMessage();

    if (lastMessage?.llmMessage?.content) {
      break;
    }

    console.log("Retrying...", i + 1);
    flow.addMessage({
      llmMessage: {
        role: "user",
        content: "Please answer the question again.",
      },
    });
    flow.addNextAgents(["rag-agent"]);
  }

  if (!lastMessage?.llmMessage?.content) {
    throw new Error("Failed to answer the question");
  }

  const usage = flow.getUsage();
  const toolCalls: ToolCall[] = flow.flowState.toolCalls.map((toolCall) => ({
    toolName: toolCall.toolName,
    params: JSON.stringify(toolCall.params),
    responseLength: toolCall.result.length,
  }));

  const usageCredits = getUsageCredits(usage, llmConfig.creditsPerMessage);
  console.log({ usageCredits, creditsPerMessage: llmConfig.creditsPerMessage });

  const answer: AnswerCompleteEvent = {
    type: "answer-complete",
    content: (lastMessage.llmMessage.content ?? "") as string,
    sources: await collectSourceLinks(scrape.id, flow.flowState.state.messages),
    actionCalls: await collectActionCalls(
      scrape.id,
      flow.flowState.state.messages
    ),
    llmCalls: 1,
    creditsUsed: llmConfig.creditsPerMessage,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    llmCost: usage.cost,
    messages: flow.flowState.state.messages,
    context: collectContext(flow.flowState.state.messages),
    dataGap: collectDataGap(flow.flowState.state.messages),
    question: query,
    toolCalls,
    llmConfig,
  };
  options?.listen?.(answer);

  return answer;
};

export const baseAnswerer: Answerer = async (
  scrape,
  thread,
  query,
  messages,
  options
) => {
  const times = 3;
  return retry(
    async (nTime) => {
      const fallbackLlmConfig = getConfig("openai/gpt-4o-mini");
      const llmConfig = nTime === times - 1 ? fallbackLlmConfig : undefined;
      return baseAnswererInternal(scrape, thread, query, messages, {
        ...options,
        llmConfig,
      });
    },
    {
      times,
      delay: 1000,
    }
  );
};

export async function saveAnswer(
  answer: AnswerCompleteEvent,
  scrape: Scrape,
  threadId: string,
  channel: MessageChannel,
  questionMessageId: string,
  fingerprint?: string,
  onFollowUpQuestion?: (questions: string[]) => void
) {
  const { citedLinks } = extractCitations(answer.content, answer.sources);
  const links = answer.sources.map((link) => ({
    ...link,
    cited: Object.values(citedLinks).some(
      (l) => l.scrapeItemId === link.scrapeItemId
    ),
  }));

  const newAnswerMessage = await prisma.message.create({
    data: {
      threadId,
      scrapeId: scrape.id,
      llmMessage: { role: "assistant", content: answer.content },
      links,
      ownerUserId: scrape.userId,
      channel,
      apiActionCalls: answer.actionCalls as any,
      llmModel: answer.llmConfig.fullName,
      creditsUsed: answer.creditsUsed,
      promptTokens: answer.promptTokens,
      completionTokens: answer.completionTokens,
      totalTokens: answer.totalTokens,
      llmCost: answer.llmCost,
      fingerprint,
      questionId: questionMessageId,
      dataGap: answer.dataGap,
      toolCalls: answer.toolCalls,
    },
  });

  await prisma.message.update({
    where: { id: questionMessageId },
    data: { answerId: newAnswerMessage.id },
  });

  await updateLastMessageAt(threadId);

  await consumeCredits(
    scrape.userId,
    "messages",
    answer.creditsUsed,
    questionMessageId
  );

  if (scrape.analyseMessage) {
    fillMessageAnalysis(
      newAnswerMessage.id,
      questionMessageId,
      getQueryString(answer.question),
      answer.content,
      {
        categories: scrape.messageCategories,
        onFollowUpQuestion,
      }
    );
  }

  return newAnswerMessage;
}
