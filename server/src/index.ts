import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import ws from "express-ws";
import cors from "cors";
import { prisma } from "@packages/common/prisma";
import {
  authenticate,
  AuthMode,
  authoriseScrapeUser,
} from "@packages/common/express-auth";
import { v4 as uuidv4 } from "uuid";
import {
  Message,
  MessageAttachment,
  MessageChannel,
  Prisma,
  Thread,
} from "@packages/common/prisma";
import { makeIndexer } from "@packages/indexer";
import { name } from "@packages/common";
import { consumeCredits, hasEnoughCredits } from "@packages/common/user-plan";
import { CustomMessage } from "./llm/custom-message";
import { makeSearchTool, SearchToolContext } from "./llm/search-tool";
import { extractCitations } from "@packages/common/citation";
import { multiLinePrompt, Agent } from "@packages/agentic";
import { FlowMessage } from "./llm/flow";
import { chunk } from "@packages/common/chunk";
import { Flow } from "@packages/agentic";
import { z } from "zod";
import {
  baseAnswerer,
  collectSourceLinks,
  saveAnswer,
  updateLastMessageAt,
} from "./answer";
import { createToken } from "@packages/common/jwt";
import { MultimodalContent } from "@packages/common/llm-message";
import { draftRateLimiter, mcpRateLimiter } from "./rate-limiter";
import { getConfig } from "./llm/config";
import { getNextNumber } from "@packages/common/mongo-counter";
import { randomUUID } from "crypto";
import { handleWs } from "./routes/socket";
import apiRouter from "./routes/api";
import adminRouter from "./routes/admin";
import healthRouter from "./routes/health";
import githubBotRouter from "./github/bot";
import {
  makeTextSearchRegexTool,
  TextSearchToolContext,
} from "./llm/text-search-tool";

declare global {
  namespace Express {
    interface Request {
      user?: Prisma.UserGetPayload<{
        include: {
          scrapeUsers: true;
        };
      }>;
      authMode?: AuthMode;
      rawBody?: Buffer;
    }
  }
}

const app: Express = express();
const expressWs = ws(app);
const port = process.env.PORT || 3000;

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

app.use(
  /\/((?!sse).)*/,
  express.json({
    limit: "50mb",
    verify(req, _res, buf) {
      (req as Request).rawBody = buf;
    },
  })
);
app.use(cors());

app.use("/api", apiRouter);
app.use("/admin", adminRouter);
app.use("/github", githubBotRouter);
app.use("/health", healthRouter);
expressWs.app.ws("/", handleWs);

app.get("/", function (req: Request, res: Response) {
  res.json({ message: "ok" });
});

app.get("/test", async function (req: Request, res: Response) {
  res.json({ ok: true, name: name() });
});

app.delete(
  "/scrape",
  authenticate,
  async function (req: Request, res: Response) {
    const scrapeId = req.body.scrapeId;
    authoriseScrapeUser(req.user!.scrapeUsers, scrapeId, res);

    const scrape = await prisma.scrape.findFirstOrThrow({
      where: { id: scrapeId },
    });
    const indexer = makeIndexer({ key: scrape.indexer });
    await indexer.deleteScrape(scrapeId);

    res.json({ message: "ok" });
  }
);

app.delete(
  "/scrape-item",
  authenticate,
  async function (req: Request, res: Response) {
    const scrapeItemId = req.body.scrapeItemId;

    const scrapeItem = await prisma.scrapeItem.findFirstOrThrow({
      where: { id: scrapeItemId },
      include: {
        scrape: true,
      },
    });

    authoriseScrapeUser(req.user!.scrapeUsers, scrapeItem.scrapeId, res);

    const indexer = makeIndexer({ key: scrapeItem.scrape.indexer });
    await indexer.deleteByIds(scrapeItem.embeddings.map((e) => e.id));

    await prisma.scrapeItem.delete({
      where: { id: scrapeItemId },
    });
    res.json({ message: "ok" });
  }
);

app.delete(
  "/knowledge-group",
  authenticate,
  async function (req: Request, res: Response) {
    const knowledgeGroupId = req.body.knowledgeGroupId;

    const knowledgeGroup = await prisma.knowledgeGroup.findFirstOrThrow({
      where: { id: knowledgeGroupId },
      include: {
        scrape: true,
      },
    });

    authoriseScrapeUser(req.user!.scrapeUsers, knowledgeGroup.scrapeId, res);

    const items = await prisma.scrapeItem.findMany({
      where: { knowledgeGroupId },
    });

    const indexer = makeIndexer({ key: knowledgeGroup.scrape.indexer });
    const ids = items.flatMap((item) => item.embeddings.map((e) => e.id));

    const chunks = chunk(ids, 800);
    for (const chunk of chunks) {
      await indexer.deleteByIds(chunk);
    }

    await prisma.scrapeItem.deleteMany({
      where: { knowledgeGroupId },
    });

    if (!req.body.clear) {
      await prisma.knowledgeGroup.delete({
        where: { id: knowledgeGroupId },
      });
    }

    res.json({ message: "ok" });
  }
);

app.get("/mcp/:scrapeId", async (req, res) => {
  console.log(`MCP request for ${req.params.scrapeId} and ${req.query.query}`);

  mcpRateLimiter.check();

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: req.params.scrapeId },
  });

  if (scrape.private) {
    res.status(400).json({ message: "Private collection" });
    return;
  }

  if (
    !(await hasEnoughCredits(scrape.userId, "messages", {
      alert: {
        scrapeId: scrape.id,
        token: createToken(scrape.userId),
      },
    }))
  ) {
    res.status(400).json({ message: "Not enough credits" });
    return;
  }

  let thread = await prisma.thread.findFirst({
    where: { scrapeId: scrape.id, isDefault: true },
  });
  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        scrapeId: scrape.id,
        isDefault: true,
      },
    });
  }
  const query = req.query.query as string;
  const creditsUsed = 1;

  const questionMessage = await prisma.message.create({
    data: {
      threadId: thread.id,
      scrapeId: scrape.id,
      llmMessage: { role: "user", content: query },
      ownerUserId: scrape.userId,
      channel: "mcp",
    },
  });
  await updateLastMessageAt(thread.id);

  const indexer = makeIndexer({ key: scrape.indexer });
  const result = await indexer.search(scrape.id, query);
  const processed = await indexer.process(query, result);

  const message: FlowMessage<CustomMessage> = {
    llmMessage: {
      role: "assistant",
      content: "Results are hidden as it is from MCP",
    },
    custom: {
      result: processed,
    },
  };
  const links = await collectSourceLinks(scrape.id, [message]);

  const answerMessage = await prisma.message.create({
    data: {
      threadId: thread.id,
      scrapeId: scrape.id,
      llmMessage: message.llmMessage as any,
      links,
      ownerUserId: scrape.userId,
      channel: "mcp",
      creditsUsed,
      questionId: questionMessage.id,
    },
  });

  await consumeCredits(
    scrape.userId,
    "messages",
    creditsUsed,
    questionMessage.id,
    0,
    "MCP"
  );

  await prisma.message.update({
    where: { id: questionMessage.id },
    data: { answerId: answerMessage.id },
  });
  await updateLastMessageAt(thread.id);
  res.json(processed);
});

app.post(
  ["/resource/:scrapeId", "/page/:scrapeId"],
  authenticate,
  async (req, res) => {
    const scrapeId = req.params.scrapeId as string;
    const knowledgeGroupType = req.body.knowledgeGroupType;
    const defaultGroupTitle = req.body.defaultGroupTitle;
    const markdown = req.body.markdown || req.body.content;
    const title = req.body.title;
    const knowledgeGroupId = req.body.knowledgeGroupId;
    const pages = req.body.pages;
    const url = req.body.key ?? `default-${uuidv4()}`;
    const createItem = req.body.createItem;

    authoriseScrapeUser(req.user!.scrapeUsers, scrapeId, res);

    if (!pages && (!markdown || !title)) {
      res.status(400).json({ message: "Missing content or title" });
      return;
    }

    if (!knowledgeGroupType && !knowledgeGroupId) {
      res.status(400).json({
        message:
          "Required any one of knowledgeGroupId or knowledgeGroupType (allowed values: custom)",
      });
      return;
    }

    let knowledgeGroup = await prisma.knowledgeGroup.findFirst({
      where: { scrapeId, type: knowledgeGroupType },
    });

    if (knowledgeGroupId) {
      knowledgeGroup = await prisma.knowledgeGroup.findFirstOrThrow({
        where: { id: knowledgeGroupId, scrapeId },
      });
    }

    if (knowledgeGroupId && !knowledgeGroup) {
      res.status(400).json({ message: "Knowledge group not found" });
      return;
    }

    if (!knowledgeGroup) {
      knowledgeGroup = await prisma.knowledgeGroup.create({
        data: {
          userId: req.user!.id,
          type: knowledgeGroupType,
          scrapeId,
          status: "done",
          title: defaultGroupTitle ?? "Default",
        },
      });
    }

    let scrapeItemId = undefined;

    if (createItem) {
      const scrapeItem = await prisma.scrapeItem.create({
        data: {
          knowledgeGroupId: knowledgeGroup.id,
          scrapeId,
          userId: req.user!.id,
          url,
          title,
        },
      });
      scrapeItemId = scrapeItem.id;
    }

    const response = await fetch(`${process.env.SOURCE_SYNC_URL}/text-page`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${createToken(req.user!.id)}`,
      },
      body: JSON.stringify({
        title,
        text: markdown,
        knowledgeGroupId: knowledgeGroup.id,
        pageId: url,
        pages,
      }),
    });

    if (!response.ok) {
      res.status(500).json({ message: "Failed to add page" });
      return;
    }

    res.json({ status: "ok", scrapeItemId });
  }
);

app.post("/answer/:scrapeId", authenticate, async (req, res) => {
  console.log("Answer request for", req.params.scrapeId);

  const scrape = await prisma.scrape.findFirst({
    where: { id: req.params.scrapeId },
  });
  if (!scrape) {
    res.status(404).json({ message: "Collection not found" });
    return;
  }

  authoriseScrapeUser(req.user!.scrapeUsers, scrape.id, res);

  if (
    !(await hasEnoughCredits(scrape.userId, "messages", {
      alert: {
        scrapeId: scrape.id,
        token: createToken(scrape.userId),
      },
    }))
  ) {
    res.status(400).json({ message: "Not enough credits" });
    return;
  }

  const clientUserId = req.body.clientUserId as string | undefined;
  const fingerprint = (clientUserId ?? req.body.fingerprint) as
    | string
    | undefined;

  let thread = await prisma.thread.findFirst({
    where: { scrapeId: scrape.id, isDefault: true },
  });
  if (req.body.clientThreadId) {
    thread = await prisma.thread.findFirst({
      where: { clientThreadId: req.body.clientThreadId },
    });
  }
  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        scrapeId: scrape.id,
        isDefault: !req.body.clientThreadId,
        clientThreadId: req.body.clientThreadId,
        fingerprint,
      },
    });
  } else if (fingerprint && !thread.fingerprint) {
    await prisma.thread.update({
      where: { id: thread.id },
      data: { fingerprint },
    });
  }
  let query = req.body.query as string | MultimodalContent[];
  let attachments = req.body.attachments as MessageAttachment[] | undefined;

  if (query && JSON.stringify(query).length > 3000) {
    res.status(400).json({ message: "Question too long" });
    return;
  }

  type InputMessage = {
    role: string;
    content: string | MultimodalContent[];
    attachments?: MessageAttachment[];
  };

  let messages = (req.body.messages ?? []) as InputMessage[];
  if (messages && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    query = lastMessage.content;
    attachments = lastMessage.attachments;
    messages = messages.slice(0, -1);

    if (
      attachments?.some(
        (attachment) => attachment.content && attachment.content.length > 3000
      )
    ) {
      res.status(400).json({ message: "Attachment content too long" });
      return;
    }
  }

  const reqPrompt = req.body.prompt as string;
  const prompt = [scrape.chatPrompt ?? "", reqPrompt ?? ""]
    .filter(Boolean)
    .join("\n\n");

  const channel =
    req.authMode === AuthMode.apiKey
      ? "api"
      : (req.body.channel as MessageChannel);

  const questionMessage = await prisma.message.create({
    data: {
      threadId: thread.id,
      scrapeId: scrape.id,
      llmMessage: { role: "user", content: query },
      ownerUserId: scrape.userId,
      channel,
      attachments,
      fingerprint,
    },
  });
  await updateLastMessageAt(thread.id);

  const actions = await prisma.apiAction.findMany({
    where: {
      scrapeId: scrape.id,
    },
  });

  function embedAttachments(
    text: string,
    attachments: MessageAttachment[]
  ): string {
    const parts = [text];
    for (const attachment of attachments) {
      if (!attachment.content) {
        continue;
      }

      parts.push(
        `<attachment name="${attachment.name}" type="${attachment.type}">
            ${attachment.content ?? ""}
          </attachment>`
      );
    }

    return parts.join("\n\n");
  }

  function withAttachments(
    content: string | MultimodalContent[],
    attachments?: MessageAttachment[]
  ): string | MultimodalContent[] {
    if (typeof content === "string") {
      return embedAttachments(content, attachments ?? []);
    }

    const textParts = content.filter(
      (c) => c.type === "text"
    ) as MultimodalContent[];
    const nonTextParts = content.filter(
      (c) => c.type !== "text"
    ) as MultimodalContent[];
    const attachmentPart =
      attachments && attachments.length > 0
        ? ({
            type: "text",
            text: embedAttachments(
              attachments.map((a) => a.content ?? "").join("\n\n"),
              attachments
            ),
          } as MultimodalContent)
        : undefined;

    return [
      ...textParts,
      ...(attachmentPart ? [attachmentPart] : []),
      ...nonTextParts,
    ];
  }

  const recentMessages = messages.slice(-40);

  const answer = await baseAnswerer(
    scrape,
    thread,
    withAttachments(query, attachments),
    recentMessages.map((m) => ({
      llmMessage: {
        role: m.role as any,
        content: withAttachments(m.content, m.attachments),
      },
    })),
    {
      prompt,
      actions,
    }
  );

  const newAnswerMessage = await saveAnswer(
    answer,
    scrape,
    thread.id,
    channel,
    questionMessage.id,
    fingerprint
  );

  const citation = extractCitations(answer.content, answer.sources, {
    cleanCitations: true,
    addSourcesToMessage: channel === "api" ? false : true,
  });

  res.json({ content: citation.content, message: newAnswerMessage });
});

app.post("/google-chat/answer/:scrapeId", async (req, res) => {
  console.log("Google Chat request for", req.params.scrapeId);

  const apiKey = req.query.apiKey as string;
  if (!apiKey) {
    res.status(401).json({ error: "API key required in query params" });
    return;
  }

  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: { key: apiKey },
    include: {
      user: {
        include: {
          scrapeUsers: true,
        },
      },
    },
  });

  if (!apiKeyRecord?.user) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  const user = apiKeyRecord.user;

  const scrape = await prisma.scrape.findFirst({
    where: { id: req.params.scrapeId },
  });
  if (!scrape) {
    res.status(404).json({
      actionResponse: {
        type: "NEW_MESSAGE",
      },
      text: "Collection not found",
    });
    return;
  }

  authoriseScrapeUser(user.scrapeUsers, scrape.id, res);

  if (
    !(await hasEnoughCredits(scrape.userId, "messages", {
      alert: {
        scrapeId: scrape.id,
        token: createToken(scrape.userId),
      },
    }))
  ) {
    res.status(400).json({
      actionResponse: {
        type: "NEW_MESSAGE",
      },
      text: "Not enough credits",
    });
    return;
  }

  const googleChatEvent = req.body;

  const messagePayload = googleChatEvent.chat?.messagePayload?.message;
  if (!messagePayload) {
    res.json({
      actionResponse: {
        type: "NEW_MESSAGE",
      },
      text: "No message payload found",
    });
    return;
  }

  const annotations = messagePayload.annotations || [];
  const isBotMentioned = annotations.some(
    (annotation: any) =>
      annotation.type === "USER_MENTION" &&
      annotation.userMention?.user?.type === "BOT"
  );

  if (!isBotMentioned) {
    res.json({
      actionResponse: {
        type: "NEW_MESSAGE",
      },
      text: "",
    });
    return;
  }

  const messageText = messagePayload.argumentText || messagePayload.text || "";

  if (!messageText.trim()) {
    res.status(400).json({
      actionResponse: {
        type: "NEW_MESSAGE",
      },
      text: "No message text found",
    });
    return;
  }

  if (messageText.length > 3000) {
    res.status(400).json({
      actionResponse: {
        type: "NEW_MESSAGE",
      },
      text: "Question too long",
    });
    return;
  }

  const threadKey = messagePayload.thread?.name || messagePayload.space?.name;
  let thread = await prisma.thread.findFirst({
    where: { scrapeId: scrape.id, isDefault: true },
  });
  if (threadKey) {
    thread = await prisma.thread.findFirst({
      where: { clientThreadId: threadKey },
    });
  }
  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        scrapeId: scrape.id,
        isDefault: !threadKey,
        clientThreadId: threadKey || undefined,
      },
    });
  }

  const prompt = scrape.chatPrompt ?? "";

  const questionMessage = await prisma.message.create({
    data: {
      threadId: thread.id,
      scrapeId: scrape.id,
      llmMessage: { role: "user", content: messageText },
      ownerUserId: scrape.userId,
      channel: "google_chat",
      fingerprint: googleChatEvent.chat.user.email,
    },
  });
  await updateLastMessageAt(thread.id);

  const actions = await prisma.apiAction.findMany({
    where: {
      scrapeId: scrape.id,
    },
  });

  const threadMessages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  const recentMessages = threadMessages.map((m) => ({
    llmMessage: m.llmMessage as any,
  }));

  const answer = await baseAnswerer(
    scrape,
    thread,
    messageText,
    recentMessages,
    {
      prompt,
      actions,
    }
  );

  await saveAnswer(
    answer,
    scrape,
    thread.id,
    "google_chat",
    questionMessage.id,
    googleChatEvent.chat.user.email
  );

  if (!answer) {
    res.status(400).json({
      actionResponse: {
        type: "NEW_MESSAGE",
      },
      text: "Failed to answer",
    });
    return;
  }

  const citation = extractCitations(answer.content, answer.sources, {
    cleanCitations: true,
    addSourcesToMessage: false,
  });

  const citedLinks = Object.values(citation.citedLinks);
  const sourceButtons = citedLinks.map((link, index) => ({
    text: link.title || link.url || `Source ${index + 1}`,
    onClick: {
      openLink: {
        url: link.url || "",
      },
    },
  }));

  const cardSections: any[] = [
    {
      widgets: [
        {
          textParagraph: {
            text: citation.content,
          },
        },
      ],
    },
  ];

  if (citedLinks.length > 0) {
    cardSections.push({
      header: "Sources",
      widgets: [
        {
          buttonList: {
            buttons: sourceButtons,
          },
        },
      ],
    });
  }

  res.json({
    hostAppDataAction: {
      chatDataAction: {
        createMessageAction: {
          message: {
            cardsV2: [
              {
                cardId: "answer-card",
                card: {
                  sections: cardSections,
                },
              },
            ],
          },
        },
      },
    },
  });
});

app.post("/ticket/:scrapeId", authenticate, async (req, res) => {
  const scrape = await prisma.scrape.findFirst({
    where: { id: req.params.scrapeId },
    include: {
      user: true,
      scrapeUsers: {
        include: {
          user: true,
        },
      },
    },
  });
  if (!scrape) {
    res.status(404).json({ message: "Collection not found" });
    return;
  }
  if (!scrape.ticketingEnabled) {
    res.status(400).json({ message: "Ticketing is not enabled" });
    return;
  }

  authoriseScrapeUser(req.user!.scrapeUsers, scrape.id, res);

  const userEmail = req.body.userEmail as string;
  const title = req.body.title as string;
  const message = req.body.message as string;
  const threadId = req.body.threadId as string;
  const customTags = req.body.customTags as Record<string, string>;

  if (!userEmail || !title || !message) {
    res.status(400).json({ message: "Missing userEmail or title or message" });
    return;
  }

  if (customTags) {
    for (const [key, value] of Object.entries(customTags)) {
      if (!["string", "number", "boolean"].includes(typeof value)) {
        res.status(400).json({
          message: "Custom tags must be strings, numbers, or booleans",
        });
        return;
      }
    }
  }

  const ticketKey = randomUUID().slice(0, 8);
  const ticketNumber = await getNextNumber("ticket-number");

  let thread: Thread | null = null;
  if (threadId) {
    thread = await prisma.thread.update({
      where: { id: threadId },
      data: {
        title,
        ticketKey,
        ticketNumber,
        ticketStatus: "open",
        ticketUserEmail: userEmail,
        lastMessageAt: new Date(),
        customTags,
      },
    });
  } else {
    thread = await prisma.thread.create({
      data: {
        scrapeId: scrape.id,

        title,
        ticketKey,
        ticketNumber,
        ticketStatus: "open",
        ticketUserEmail: userEmail,
        lastMessageAt: new Date(),
        customTags,
      },
    });
  }

  const creditsUsed = 1;

  const newMessage = await prisma.message.create({
    data: {
      threadId: thread.id,
      scrapeId: scrape.id,
      ownerUserId: scrape.userId,
      llmMessage: {
        role: "user",
        content: message,
      },
      ticketMessage: {
        role: "user",
        event: "message",
      },
      creditsUsed,
    },
  });

  await consumeCredits(
    scrape.userId,
    "messages",
    creditsUsed,
    newMessage.id,
    0,
    "Ticket"
  );

  await fetch(`${process.env.FRONT_URL}/email-alert`, {
    method: "POST",
    body: JSON.stringify({
      intent: "new-ticket",
      threadId: thread.id,
      message,
    }),
    headers: {
      Authorization: `Bearer ${createToken(scrape.userId)}`,
    },
  });

  const privateUrl = `${process.env.FRONT_URL}/ticket/${thread.ticketNumber}?key=${thread.ticketKey}`;

  res.json({ thread, ticketNumber, privateUrl });
});

app.post("/compose/:scrapeId", authenticate, async (req, res) => {
  console.log("Compose request for", req.params.scrapeId);

  draftRateLimiter.check();

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: req.params.scrapeId },
  });

  authoriseScrapeUser(req.user!.scrapeUsers, scrape.id, res);

  if (
    !(await hasEnoughCredits(scrape.userId, "messages", {
      alert: {
        scrapeId: scrape.id,
        token: createToken(scrape.userId),
      },
    }))
  ) {
    res.status(400).json({ message: "Not enough credits" });
    return;
  }

  const prompt = req.body.prompt as string;
  const formatText = req.body.formatText as string;
  const slate = req.body.slate as string;
  const content = req.body.content as string;
  const title = req.body.title as string;

  const message = {
    role: "user",
    content,
  };

  const messages = [message];

  const queryContext: SearchToolContext & TextSearchToolContext = {
    queries: [],
    textSearchToolCalls: 0,
  };

  const llmConfig = getConfig("openrouter/openai/gpt-5.1");
  const agent = new Agent({
    id: "compose-agent",
    prompt: `
    Update the <slate> given below following the prompt and the question.

    Use the search_data tool to get the relevant information.
    Only update the asked items from <answer>.
    Use the search_data tool only if new information is required.

    The query should be very short and should not be complex.
    Break the complex queries into smaller queries.
    Example: If the query is 'How to build a site and deploy it on Vercel?', break it into 'How to build a site' and 'Deploy it on Vercel'.
    Example: If the topic is about a tool called 'Remotion', turn the query 'What is it?' into 'What is Remotion?'
    These queries are for a vector database. Don't use extra words that do not add any value in vectorisation.
    Example: If the query is 'How to make a composition?', better you use 'make a composition'
    The query should not be more than 5 words. Keep only the most important words.
    Don't repeat the same or similar queries.
    Break multi level queries as well. For example: 'What is the average score?' should be split into 'score list' and then calculate the average.
    You need to find indirect questions. For example: 'What is the cheapest pricing plan?' should be converted into 'pricing plans' and then find cheapest
    Don't use the search_data tool if the latest message is answer for a follow up question. Ex: yes, no.,

    Don't add top level heading to the slate. It is included outside.
    Start the slate with a regular paragraph or text.
    Update the title only if it is asked or the title is empty or not set.


    <title>${title}</title>
    <slate>${slate}</slate>

    Output should be in the following format:

    <format-text>${formatText}</format-text>

    You need to give back the updated slate.
    You should apply changes asked to the current slate.
    You should only apply changes and not do anything else.
    Don't inspire from previous slates. Continue from the current slate.

    Use the provided tools to get the information.
    Don't compose without using the tools.
    Query for search_data should be at least 4 words.
    Use text_search_regex tool to find out about keywords and phrases.
    Recommended to use text_search_regex tool for the technical keywords.

    Once you see that a set of tools are returning the same result, don't use the tools again.

    ${prompt}
    `,
    tools: [
      makeSearchTool(scrape.id, scrape.indexer, { queryContext }),
      makeTextSearchRegexTool(scrape.id, queryContext),
    ],
    schema: z.object({
      slate: z.string({
        description: "The answer in slate format",
      }),
      details: z.string({
        description: "Any additional details while updating the slate",
      }),
      title: z.string({
        description: "The title of the page. Should be under 8 words.",
      }),
    }),
    user: scrape.id,
    maxTokens: 8000,
    ...llmConfig,
  });

  const flow = new Flow([agent], {
    messages: messages.map((m) => ({
      llmMessage: {
        role: m.role,
        content: m.content,
      } as any,
    })),
  });
  flow.addNextAgents(["compose-agent"]);

  while (await flow.stream()) {}

  const response = flow.getLastMessage().llmMessage.content as string;
  const { slate: newSlate, details, title: newTitle } = JSON.parse(response);

  await consumeCredits(
    scrape.userId,
    "messages",
    llmConfig.creditsPerMessage,
    undefined,
    flow.getUsage().cost,
    "Compose"
  );

  res.json({
    content,
    details,
    title: newTitle,
    slate: newSlate,
    messages: [
      ...messages,
      {
        role: "assistant",
        content,
      },
    ],
  });
});

app.get("/collection", authenticate, async (req, res) => {
  const memberships = await prisma.scrapeUser.findMany({
    where: {
      userId: req.user!.id,
    },
    include: {
      scrape: {
        include: {
          knowoledgeGroups: true,
        },
      },
    },
  });

  res.json(
    memberships.map((m) => ({
      collectionId: m.scrape.id,
      collectionName: m.scrape.title,
      createdAt: m.scrape.createdAt,
      knowledgeGroups: m.scrape.knowoledgeGroups.map((g) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        createdAt: g.createdAt,
      })),
    }))
  );
});

app.get("/discord/:channelId", async (req, res) => {
  const scrape = await prisma.scrape.findFirst({
    where: { discordServerId: req.params.channelId },
  });

  if (!scrape) {
    res.status(404).json({ scrapeId: null, userId: null });
    return;
  }

  res.json({
    scrapeId: scrape.id,
    userId: scrape.userId,
    draftChannelIds: scrape.discordDraftConfig?.sourceChannelIds ?? [],
    draftEmoji: scrape.discordDraftConfig?.emoji,
    draftDestinationChannelId: scrape.discordDraftConfig?.destinationChannelId,
  });
});

app.post("/fix-message", authenticate, async (req, res) => {
  const userId = req.user!.id;
  const messageId = req.body.messageId as string;
  const answer = req.body.answer as string;

  const message = await prisma.message.findFirstOrThrow({
    where: { id: messageId },
  });

  if (!message) {
    res.status(404).json({ message: "Message not found" });
    return;
  }

  authoriseScrapeUser(req.user!.scrapeUsers, message.scrapeId, res);

  if (
    !(await hasEnoughCredits(userId, "messages", {
      alert: {
        scrapeId: message.scrapeId,
        token: createToken(userId),
      },
    }))
  ) {
    res.status(400).json({ message: "Not enough credits" });
    return;
  }

  const threadMessages = await prisma.message.findMany({
    where: { threadId: message.threadId },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  const messageIndex = threadMessages.findIndex((m) => m.id === messageId);

  const messages = threadMessages
    .slice(0, messageIndex + 1)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const agent = new Agent<CustomMessage>({
    id: "fix-agent",
    prompt: multiLinePrompt([
      "You are a helpful assistant who fixes the wrongly answer with provided context.",
      "Here is the context for the conversation:",
      messages.map(massageToText).join("\n\n"),
    ]),
    schema: z.object({
      correctAnswer: z.string({
        description: "The correct answer. Can be markdown",
      }),
      title: z.string({
        description: "The short title of the answer under 6 words",
      }),
    }),
  });

  function massageToText(message: Message) {
    const role = (message.llmMessage as any).role as string;
    const content = (message.llmMessage as any).content as string;
    if (role === "user") {
      return `Question: ${content}`;
    }
    return `Answer: ${content}\n---`;
  }

  const flow = new Flow([agent], {
    messages: [
      {
        llmMessage: {
          role: "user",
          content: multiLinePrompt([
            "Fix the above wrongly answered question with the below context and summarise the entire conversation under 200 words.",
            "Add only those details that are relevant to the below question.",
            "Elaborate the answer to be more detailed and accurate.",
            "Give the correctAnswer in markdown format.",
            "Wrong answer: " + (message.llmMessage as any).content,
            "Correct answer: " + answer,
          ]),
        },
      },
    ],
  });

  flow.addNextAgents(["fix-agent"]);

  while (await flow.stream()) {}

  const content = (flow.getLastMessage().llmMessage.content as string) ?? "";
  const { correctAnswer, title } = JSON.parse(content);

  await consumeCredits(
    userId,
    "messages",
    1,
    undefined,
    flow.getUsage().cost,
    "Fix Message"
  );

  res.json({ content: correctAnswer, title });
});

app.get("/test-api", authenticate, async (req, res) => {
  const memberships = await prisma.scrapeUser.findMany({
    where: {
      userId: req.user!.id,
    },
    include: {
      scrape: true,
    },
  });

  res.json({
    scrapes: memberships.map((m) => ({
      id: m.scrape.id,
      title: m.scrape.title,
    })),
  });
});

app.post("/extract-facts/:scrapeId", authenticate, async (req, res) => {
  const scrapeId = req.params.scrapeId;
  const text = req.body.text as string;

  if (!text || typeof text !== "string") {
    res.status(400).json({ message: "Missing or invalid text parameter" });
    return;
  }

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId },
  });

  authoriseScrapeUser(req.user!.scrapeUsers, scrape.id, res);

  if (
    !(await hasEnoughCredits(scrape.userId, "messages", {
      alert: {
        scrapeId: scrape.id,
        token: createToken(scrape.userId),
      },
    }))
  ) {
    res.status(400).json({ message: "Not enough credits" });
    return;
  }

  const queryContext: SearchToolContext = {
    queries: [],
  };

  const llmConfig = getConfig("openrouter/google/gemini-3-flash-preview");
  const agent = new Agent({
    id: "extract-facts-agent",
    prompt: `Extract all facts mentioned in the given text. Each fact should be a complete, standalone statement that exactly matches the wording from the source text. Do not paraphrase, summarize, or combine facts. Each fact should be extracted verbatim from the source.

Use the search_data tool to search the knowledge base for additional context and information that might help identify all facts mentioned in the text. Search for relevant information that could help extract complete and accurate facts.

Important requirements:
- Extract every fact mentioned in the text
- Each fact string must exactly match the source text
- Do not miss any facts
- Each fact should be a separate string in the array
- Preserve the exact wording from the source text
- Use the search_data tool to find additional context if needed

Text to analyze:
${text}`,
    tools: [makeSearchTool(scrape.id, scrape.indexer, { queryContext })],
    schema: z.object({
      facts: z
        .array(z.string())
        .describe(
          "Array of facts extracted from the text, each exactly matching the source"
        ),
    }),
    user: scrape.id,
    maxTokens: 4000,
    ...llmConfig,
  });

  const flow = new Flow([agent], {
    messages: [
      {
        llmMessage: {
          role: "user",
          content:
            "Extract all facts from the provided text. Use the search_data tool if you need additional context from the knowledge base.",
        },
      },
    ],
  });
  flow.addNextAgents(["extract-facts-agent"]);

  while (await flow.stream()) {}

  const response = flow.getLastMessage().llmMessage.content as string;
  const parsed = JSON.parse(response);
  const facts = parsed.facts || [];

  await consumeCredits(
    scrape.userId,
    "messages",
    llmConfig.creditsPerMessage,
    undefined,
    flow.getUsage().cost,
    "Extract Facts"
  );

  res.json({ facts });
});

app.post("/fact-check/:scrapeId", authenticate, async (req, res) => {
  const scrapeId = req.params.scrapeId;
  const fact = req.body.fact as string;

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId },
  });

  authoriseScrapeUser(req.user!.scrapeUsers, scrape.id, res);

  if (
    !(await hasEnoughCredits(scrape.userId, "messages", {
      alert: {
        scrapeId: scrape.id,
        token: createToken(scrape.userId),
      },
    }))
  ) {
    res.status(400).json({ message: "Not enough credits" });
    return;
  }

  const queryContext: SearchToolContext = {
    queries: [],
  };

  const llmConfig = getConfig("openrouter/google/gemini-3-flash-preview");
  const agent = new Agent({
    id: "fact-check-agent",
    prompt: `You are a fact-checking assistant. Your task is to evaluate how accurate a given fact is based on the knowledge base context.

Use the search_data tool to search the knowledge base for information related to the fact. Search for relevant information that can verify or refute the fact.

After searching the knowledge base, analyze the fact against the context and provide a score from 0 to 1:
- 1.0: The fact is completely accurate and well-supported by the knowledge base
- 0.8-0.9: The fact is mostly accurate with minor discrepancies
- 0.5-0.7: The fact is partially accurate but has some inaccuracies
- 0.2-0.4: The fact is mostly inaccurate
- 0.0-0.1: The fact is completely inaccurate or contradicted by the knowledge base

Fact to check: ${fact}`,
    tools: [makeSearchTool(scrape.id, scrape.indexer, { queryContext })],
    schema: z.object({
      score: z.number().min(0).max(1).describe("Accuracy score from 0 to 1"),
      reason: z
        .string()
        .max(50)
        .describe("Brief reasoning for the score in 10 words"),
    }),
    user: scrape.id,
    maxTokens: 2000,
    ...llmConfig,
  });

  const flow = new Flow([agent], {
    messages: [
      {
        llmMessage: {
          role: "user",
          content: `Check the accuracy of this fact: "${fact}". Use the search_data tool to search the knowledge base for relevant information, then provide a score.`,
        },
      },
    ],
  });
  flow.addNextAgents(["fact-check-agent"]);

  while (await flow.stream()) {}

  const response = flow.getLastMessage().llmMessage.content as string;
  const parsed = JSON.parse(response);
  const score =
    typeof parsed.score === "number"
      ? Math.max(0, Math.min(1, parsed.score))
      : 0;
  const reason = parsed.reason || "";

  await consumeCredits(
    scrape.userId,
    "messages",
    llmConfig.creditsPerMessage,
    undefined,
    flow.getUsage().cost,
    "Fact Check"
  );

  res.json({ fact, score, reason });
});

app.get("/search-items/:scrapeId", authenticate, async (req, res) => {
  const scrapeId = req.params.scrapeId;
  const query = req.query.query as string;

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId },
  });

  authoriseScrapeUser(req.user!.scrapeUsers, scrape.id, res);

  const indexer = makeIndexer({ key: scrape.indexer, topN: 20 });
  const results = await indexer.search(scrape.id, query, {
    topK: 50,
  });
  const processed = await indexer.process(query, results);

  res.json({ results: processed });
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Express Error:", error);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(port, async () => {
  console.log(`Running on port ${port}`);
});
