import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Express, Request, Response } from "express";
import ws from "express-ws";
import cors from "cors";
import { prisma } from "./prisma";
import { deleteByIds, deleteScrape, makeRecordId } from "./scrape/pinecone";
import { joinRoom } from "./socket-room";
import { getRoomIds } from "./socket-room";
import { authenticate, verifyToken } from "./jwt";
import { splitMarkdown } from "./scrape/markdown-splitter";
import { makeLLMTxt } from "./llm-txt";
import { v4 as uuidv4 } from "uuid";
import {
  Message,
  MessageSourceLink,
  Prisma,
  MessageChannel,
} from "libs/prisma";
import { makeIndexer } from "./indexer/factory";
import { name } from "libs";
import { consumeCredits, hasEnoughCredits } from "libs/user-plan";
import { RAGAgentCustomMessage } from "./llm/flow-jasmine";
import { extractCitations } from "libs/citation";
import { BaseKbProcesserListener } from "./kb/listener";
import { makeKbProcesser } from "./kb/factory";
import { FlowMessage, multiLinePrompt, SimpleAgent } from "./llm/agentic";
import { chunk } from "libs/chunk";
import { retry } from "./retry";
import { Flow } from "./llm/flow";
import { z } from "zod";
import { baseAnswerer, AnswerListener, agenticAnswerer } from "./answer";

const app: Express = express();
const expressWs = ws(app);
const port = process.env.PORT || 3000;

app.use(/\/((?!sse).)*/, express.json());
app.use(cors());

function makeMessage(type: string, data: any) {
  return JSON.stringify({ type, data });
}

function cleanUrl(url: string) {
  if (!url.startsWith("http")) {
    url = "https://" + url;
  }
  return url.toLowerCase();
}

async function collectSourceLinks(
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

  return links;
}

async function updateLastMessageAt(threadId: string) {
  await prisma.thread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });
}

function answerListener(
  scrapeId: string,
  userId: string,
  threadId: string,
  options?: {
    ws?: WebSocket;
    channel?: MessageChannel;
  }
): AnswerListener {
  return async (event) => {
    const { ws, channel } = options ?? {};
    switch (event.type) {
      case "init":
        const newQueryMessage = await prisma.message.create({
          data: {
            threadId,
            scrapeId,
            llmMessage: { role: "user", content: event.query },
            ownerUserId: userId,
            channel: channel ?? null,
          },
        });
        await updateLastMessageAt(threadId);
        ws?.send(makeMessage("query-message", newQueryMessage));
        break;

      case "stream-delta":
        ws?.send(makeMessage("llm-chunk", { content: event.delta }));
        break;

      case "tool-call":
        ws?.send(
          makeMessage("stage", { stage: "tool-call", query: event.query })
        );
        break;

      case "answer-complete":
        await consumeCredits(userId, "messages", event.llmCalls);
        const newAnswerMessage = await prisma.message.create({
          data: {
            threadId,
            scrapeId,
            llmMessage: { role: "assistant", content: event.content },
            links: event.sources,
            ownerUserId: userId,
            channel: channel ?? null,
          },
        });
        await updateLastMessageAt(threadId);
        ws?.send(
          makeMessage("llm-chunk", {
            end: true,
            content: event.content,
            message: newAnswerMessage,
          })
        );
    }
  };
}

app.get("/", function (req: Request, res: Response) {
  res.json({ message: "ok" });
});

app.get("/test", async function (req: Request, res: Response) {
  res.json({ ok: true, name: name() });
});

app.post("/scrape", authenticate, async function (req: Request, res: Response) {
  const userId = req.user!.id;
  const scrapeId = req.body.scrapeId!;
  const knowledgeGroupId = req.body.knowledgeGroupId!;

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId, userId },
  });

  const knowledgeGroup = await prisma.knowledgeGroup.findFirstOrThrow({
    where: { id: knowledgeGroupId, userId },
  });

  console.log("Scraping for", scrape.id);

  const url = req.body.url ? cleanUrl(req.body.url) : req.body.url;
  const roomId = req.body.roomId;
  const includeMarkdown = req.body.includeMarkdown;

  (async function () {
    function getLimit() {
      if (userId === process.env.OPEN_USER_ID) {
        return 25;
      }
      if (req.body.maxLinks) {
        return parseInt(req.body.maxLinks);
      }
      if (url) {
        return 1;
      }
      if (knowledgeGroup.maxPages !== null) {
        return knowledgeGroup.maxPages;
      }
      return undefined;
    }

    const listener = new BaseKbProcesserListener(
      scrape,
      knowledgeGroup,
      () => {},
      {
        includeMarkdown,
      }
    );

    const processer = makeKbProcesser(listener, scrape, knowledgeGroup, {
      hasCredits: () => hasEnoughCredits(userId, "scrapes"),
      limit: getLimit(),
      url,
    });

    await processer.start();
  })();

  res.json({ message: "ok" });
});

app.get("/llm.txt", authenticate, async function (req: Request, res: Response) {
  const userId = req.user!.id;
  const scrapeId = req.query.scrapeId as string;
  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId, userId },
  });
  const scrapeItems = await prisma.scrapeItem.findMany({
    where: { scrapeId: scrape.id },
  });
  res.json({ text: makeLLMTxt(scrapeItems) });
});

app.delete(
  "/scrape",
  authenticate,
  async function (req: Request, res: Response) {
    const scrapeId = req.body.scrapeId;
    try {
      const scrape = await prisma.scrape.findFirstOrThrow({
        where: { id: scrapeId },
      });
      const indexer = makeIndexer({ key: scrape.indexer });
      await deleteScrape(indexer.getKey(), scrapeId);
    } catch (error) {}
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

    const indexer = makeIndexer({ key: scrapeItem.scrape.indexer });
    await deleteByIds(
      indexer.getKey(),
      scrapeItem.embeddings.map((e) => e.id)
    );

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

    const items = await prisma.scrapeItem.findMany({
      where: { knowledgeGroupId },
    });

    const indexer = makeIndexer({ key: knowledgeGroup.scrape.indexer });
    const ids = items.flatMap((item) => item.embeddings.map((e) => e.id));

    const chunks = chunk(ids, 800);
    for (const chunk of chunks) {
      await deleteByIds(indexer.getKey(), chunk);
    }

    await prisma.scrapeItem.deleteMany({
      where: { knowledgeGroupId },
    });

    await prisma.knowledgeGroup.delete({
      where: { id: knowledgeGroupId },
    });

    res.json({ message: "ok" });
  }
);

expressWs.app.ws("/", (ws: any, req) => {
  let userKey: string | null = null;

  ws.on("message", async (msg: Buffer | string) => {
    try {
      const message = JSON.parse(msg.toString());

      if (message.type === "join-room") {
        const authHeader = message.data.headers.Authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          ws.send(makeMessage("error", { message: "Unauthorized" }));
          ws.close();
          return;
        }

        const token = authHeader.split(" ")[1];
        const user = verifyToken(token);
        userKey = user.userId;
        getRoomIds({ userKey: userKey! }).forEach((roomId) =>
          joinRoom(roomId, ws)
        );
        ws.send(makeMessage("connected", { message: "Connected" }));
        return;
      }

      if (!userKey) {
        ws.send(makeMessage("error", { message: "Not authenticated" }));
        ws.close();
        return;
      }

      if (message.type === "ask-llm") {
        const threadId = message.data.threadId;
        const thread = await prisma.thread.findFirstOrThrow({
          where: { id: threadId },
          include: {
            messages: true,
          },
        });

        const scrape = await prisma.scrape.findFirstOrThrow({
          where: { id: thread.scrapeId },
        });

        if (!(await hasEnoughCredits(scrape.userId, "messages"))) {
          ws.send(
            makeMessage("error", {
              message: "Not enough credits. Contact the owner!",
            })
          );
          ws.close();
          return;
        }

        const agentEnabledScrapeIds = [
          "67bca5b7b57f15a3a6f8eac6",
          "67e312247a822a2303f2b8a7", // Polotno
          "67c1d700cb1ec09c237bab8a", // Remotion dev
          "67dbfc7258ed87c571a04b83", // CrawlChat
          "67d29ce750df5f4d86e1db33", // Dev CrawlChat
        ];

        let answerer = baseAnswerer;
        // if (agentEnabledScrapeIds.includes(scrape.id)) {
        //   answerer = agenticAnswerer;
        // }

        await retry(async () => {
          answerer(
            scrape,
            message.data.query,
            thread.messages.map((message) => ({
              llmMessage: message.llmMessage as any,
            })),
            {
              listen: answerListener(scrape.id, scrape.userId, threadId, {
                ws,
              }),
            }
          );
        });
      }
    } catch (error) {
      console.error(error);
      ws.send(
        makeMessage("error", {
          message: "Something went wrong! Please refresh and try again.",
        })
      );
      ws.close();
    }
  });

  ws.on("close", () => {
    userKey = null;
  });
});

app.get("/mcp/:scrapeId", async (req, res) => {
  console.log(`MCP request for ${req.params.scrapeId} and ${req.query.query}`);

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: req.params.scrapeId },
  });

  if (!(await hasEnoughCredits(scrape.userId, "messages"))) {
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

  await prisma.message.create({
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

  await consumeCredits(scrape.userId, "messages", 1);

  const message: FlowMessage<RAGAgentCustomMessage> = {
    llmMessage: {
      role: "assistant",
      content: "Results are hidden as it is from MCP",
    },
    custom: {
      result: processed,
    },
  };
  const links = await collectSourceLinks(scrape.id, [message]);

  await prisma.message.create({
    data: {
      threadId: thread.id,
      scrapeId: scrape.id,
      llmMessage: message.llmMessage as any,
      links,
      ownerUserId: scrape.userId,
      channel: "mcp",
    },
  });
  await updateLastMessageAt(thread.id);
  res.json(processed);
});

app.post("/resource/:scrapeId", authenticate, async (req, res) => {
  const userId = req.user!.id;
  const scrapeId = req.params.scrapeId;
  const knowledgeGroupType = req.body.knowledgeGroupType;
  const defaultGroupTitle = req.body.defaultGroupTitle;
  const markdown = req.body.markdown;
  const title = req.body.title;

  if (!scrapeId || !markdown || !title) {
    res.status(400).json({ message: "Missing scrapeId or markdown or title" });
    return;
  }

  if (!(await hasEnoughCredits(userId, "scrapes"))) {
    res.status(400).json({ message: "Not enough credits" });
    return;
  }

  let knowledgeGroup = await prisma.knowledgeGroup.findFirst({
    where: { userId, scrapeId, type: knowledgeGroupType },
  });

  if (!knowledgeGroup) {
    knowledgeGroup = await prisma.knowledgeGroup.create({
      data: {
        userId,
        type: knowledgeGroupType,
        scrapeId,
        status: "done",
        title: defaultGroupTitle ?? "Default",
      },
    });
  }

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId, userId },
  });

  const indexer = makeIndexer({ key: scrape.indexer });
  const chunks = await splitMarkdown(markdown);

  let scrapeItem = await prisma.scrapeItem.create({
    data: {
      userId,
      scrapeId: scrape.id,
      knowledgeGroupId: knowledgeGroup.id,
      markdown,
      title,
      metaTags: [],
      embeddings: [],
      status: "completed",
    },
  });

  const documents = chunks.map((chunk) => ({
    id: makeRecordId(scrape.id, uuidv4()),
    text: chunk,
    metadata: { content: chunk, scrapeItemId: scrapeItem.id },
  }));
  await indexer.upsert(scrape.id, documents);
  scrapeItem = await prisma.scrapeItem.update({
    where: { id: scrapeItem.id },
    data: {
      embeddings: documents.map((doc) => ({
        id: doc.id,
      })),
    },
  });

  await consumeCredits(userId, "scrapes", 1);

  res.json({ scrapeItem });
});

app.post("/answer/:scrapeId", authenticate, async (req, res) => {
  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: req.params.scrapeId },
  });

  if (!(await hasEnoughCredits(scrape.userId, "messages"))) {
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
  let query = req.body.query as string;

  const messages = req.body.messages as { role: string; content: string }[];
  if (messages && messages.length > 0) {
    query = messages[messages.length - 1].content;
  }

  const reqPrompt = req.body.prompt as string;
  const prompt = [scrape.chatPrompt ?? "", reqPrompt ?? ""]
    .filter(Boolean)
    .join("\n\n");

  const answer = await baseAnswerer(
    scrape,
    query,
    messages.map((m) => ({
      llmMessage: {
        role: m.role as "user" | "assistant",
        content: m.content,
      },
    })),
    {
      listen: answerListener(scrape.id, scrape.userId, thread.id, {
        channel: req.body.channel as MessageChannel,
      }),
      prompt,
    }
  );

  if (!answer) {
    res.status(400).json({ message: "Failed to answer" });
    return;
  }

  const { content, sources } = answer;
  const citation = extractCitations(content, sources, { cleanCitations: true });

  let updatedContent = citation.content;
  if (Object.keys(citation.citedLinks).length > 0) {
    updatedContent +=
      "\n\nSources:\n" +
      Object.values(citation.citedLinks)
        .map((l) => l.url)
        .join("\n");
  }

  res.json({ content: updatedContent });
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
    where: { id: messageId, ownerUserId: userId },
  });

  if (!message) {
    res.status(404).json({ message: "Message not found" });
    return;
  }

  if (!(await hasEnoughCredits(userId, "messages"))) {
    res.status(400).json({ message: "Not enough credits" });
    return;
  }

  const thread = await prisma.thread.findFirstOrThrow({
    where: { id: message.threadId },
    include: {
      messages: true,
    },
  });

  const messageIndex = thread.messages.findIndex((m) => m.id === messageId);

  const messages = thread.messages.slice(0, messageIndex + 1);

  const agent = new SimpleAgent<RAGAgentCustomMessage>({
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

  await consumeCredits(userId, "messages", 1);

  res.json({ content: correctAnswer, title });
});

app.listen(port, async () => {
  console.log(`Running on port ${port}`);
});
