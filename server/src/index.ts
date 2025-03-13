import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Express, Request, Response } from "express";
import ws from "express-ws";
import { scrapeLoop, type ScrapeStore } from "./scrape/crawl";
import { OrderedSet } from "./scrape/ordered-set";
import cors from "cors";
import { addMessage } from "./thread/store";
import { prisma } from "./prisma";
import { deleteByIds, deleteScrape, makeRecordId } from "./scrape/pinecone";
import { joinRoom, broadcast } from "./socket-room";
import { getRoomIds } from "./socket-room";
import { authenticate, verifyToken } from "./jwt";
import { getMetaTitle } from "./scrape/parse";
import { splitMarkdown } from "./scrape/markdown-splitter";
import { makeLLMTxt } from "./llm-txt";
import { v4 as uuidv4 } from "uuid";
import { Message, MessageSourceLink } from "libs/prisma";
import { makeIndexer } from "./indexer/factory";
import { Flow } from "./llm/flow";
import { RAGAgent, RAGAgentCustomMessage } from "./llm/rag-agent";
import { ChatCompletionAssistantMessageParam } from "openai/resources/chat/completions";
import { name } from "libs";
import { consumeCredits, hasEnoughCredits } from "libs/user-plan";

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

app.get("/", function (req: Request, res: Response) {
  res.json({ message: "ok" });
});

app.get("/test", async function (req: Request, res: Response) {
  res.json({ ok: true, name: name() });
});

app.post("/scrape", authenticate, async function (req: Request, res: Response) {
  const userId = req.user!.id;
  const url = req.body.url ? cleanUrl(req.body.url) : req.body.url;
  const scrapeId = req.body.scrapeId!;
  const dynamicFallbackContentLength = req.body.dynamicFallbackContentLength;
  const roomId = req.body.roomId;
  const includeMarkdown = req.body.includeMarkdown;

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId, userId },
  });

  console.log("Scraping for", scrape.id);

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
      return undefined;
    }

    const roomIds = getRoomIds({ userKey: userId, roomId });

    roomIds.forEach((roomId) =>
      broadcast(roomId, makeMessage("scrape-start", { scrapeId }))
    );
    await prisma.scrape.update({
      where: { id: scrape.id },
      data: { status: "scraping" },
    });

    const store: ScrapeStore = {
      urls: {},
      urlSet: new OrderedSet(),
    };
    store.urlSet.add(url ?? scrape.url);

    const urlToScrape = cleanUrl(req.body.url ?? scrape.url);
    await scrapeLoop(store, urlToScrape, {
      removeHtmlTags: req.body.removeHtmlTags,
      dynamicFallbackContentLength,
      limit: getLimit(),
      skipRegex: req.body.skipRegex
        ? req.body.skipRegex
            .split(",")
            .map((regex: string) => new RegExp(regex))
        : undefined,
      onComplete: async () => {
        roomIds.forEach((roomId) =>
          broadcast(roomId, makeMessage("scrape-complete", { scrapeId }))
        );
      },
      afterScrape: async (url, { markdown, error }) => {
        try {
          if (error) {
            throw new Error(error);
          }

          const scrapedUrlCount = Object.values(store.urls).length;
          const maxLinks = req.body.maxLinks
            ? parseInt(req.body.maxLinks)
            : undefined;
          const actualRemainingUrlCount = store.urlSet.size() - scrapedUrlCount;
          const remainingUrlCount = maxLinks
            ? Math.min(maxLinks, actualRemainingUrlCount)
            : actualRemainingUrlCount;

          const chunks = await splitMarkdown(markdown);

          const indexer = makeIndexer({ key: scrape.indexer });
          const documents = chunks.map((chunk) => ({
            id: makeRecordId(scrape.id, uuidv4()),
            text: chunk,
            metadata: { content: chunk, url },
          }));
          await indexer.upsert(scrape.id, documents);

          if (scrape.url === url) {
            await prisma.scrape.update({
              where: { id: scrape.id },
              data: { title: getMetaTitle(store.urls[url]?.metaTags ?? []) },
            });
          }

          const existingItem = await prisma.scrapeItem.findFirst({
            where: { scrapeId: scrape.id, url },
          });
          if (existingItem) {
            await deleteByIds(
              indexer.getKey(),
              existingItem.embeddings.map((embedding) => embedding.id)
            );
          }

          await prisma.scrapeItem.upsert({
            where: { scrapeId_url: { scrapeId: scrape.id, url } },
            update: {
              markdown,
              title: getMetaTitle(store.urls[url]?.metaTags ?? []),
              metaTags: store.urls[url]?.metaTags,
              embeddings: documents.map((doc) => ({
                id: doc.id,
              })),
              status: "completed",
            },
            create: {
              userId,
              scrapeId: scrape.id,
              url,
              markdown,
              title: getMetaTitle(store.urls[url]?.metaTags ?? []),
              metaTags: store.urls[url]?.metaTags,
              embeddings: documents.map((doc) => ({
                id: doc.id,
              })),
              status: "completed",
            },
          });

          await consumeCredits(userId, "scrapes", 1);

          roomIds.forEach((roomId) =>
            broadcast(
              roomId,
              makeMessage("scrape-pre", {
                url,
                scrapedUrlCount,
                remainingUrlCount,
                markdown: includeMarkdown ? markdown : undefined,
              })
            )
          );
        } catch (error: any) {
          console.error(error);
          store.urls[url] = {
            metaTags: [],
            text: "ERROR",
          };
          await prisma.scrapeItem.upsert({
            where: { scrapeId_url: { scrapeId: scrape.id, url } },
            update: {
              status: "failed",
              error: error.message.toString(),
            },
            create: {
              userId,
              scrapeId: scrape.id,
              url,
              status: "failed",
              error: error.message.toString(),
            },
          });
        }
      },
    });

    await prisma.scrape.update({
      where: { id: scrape.id },
      data: {
        status: "done",
      },
    });

    roomIds.forEach((roomId) =>
      broadcast(roomId, makeMessage("saved", { scrapeId }))
    );
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

        const newQueryMessage: Message = {
          uuid: uuidv4(),
          llmMessage: { role: "user", content: message.data.query },
          links: [],
          createdAt: new Date(),
          pinnedAt: null,
        };
        addMessage(threadId, newQueryMessage);
        ws.send(makeMessage("query-message", newQueryMessage));

        const indexer = makeIndexer({ key: scrape.indexer });
        const flow = new Flow<{}, RAGAgentCustomMessage>(
          {
            "rag-agent": new RAGAgent(indexer, scrape.id),
          },
          {
            messages: [
              ...thread.messages.map((message) => ({
                llmMessage: message.llmMessage as any,
              })),
              {
                llmMessage: {
                  role: "user",
                  content: message.data.query,
                },
              },
            ],
          }
        );
        flow.addNextAgents(["rag-agent"]);

        while (
          await flow.stream({
            onDelta: ({ delta }) => {
              if (delta !== undefined && delta !== null) {
                ws.send(makeMessage("llm-chunk", { content: delta }));
              }
            },
          })
        ) {
          const message = flow.getLastMessage();
          if (flow.isToolCall(message)) {
            ws.send(
              makeMessage("stage", {
                stage: "tool-call",
                queries: (
                  message.llmMessage as ChatCompletionAssistantMessageParam
                ).tool_calls?.map(
                  (toolCall) => JSON.parse(toolCall.function.arguments).query
                ),
              })
            );
          }
        }

        const content =
          (flow.getLastMessage().llmMessage.content as string) ?? "";

        const matches = flow.flowState.state.messages
          .map((m) => m.custom?.result)
          .filter((r) => r !== undefined)
          .flat();

        const links: MessageSourceLink[] = [];
        for (const match of matches) {
          const item = await prisma.scrapeItem.findFirst({
            where: {
              OR: [{ url: match.url }, { id: match.scrapeItemId }],
            },
          });
          if (item) {
            links.push({
              url: match.url ?? null,
              title: item.title,
              score: match.score ?? null,
            });
          }
        }

        const newAnswerMessage: Message = {
          uuid: uuidv4(),
          llmMessage: { role: "assistant", content },
          links,
          createdAt: new Date(),
          pinnedAt: null,
        };
        await consumeCredits(scrape.userId, "messages", 1);
        addMessage(threadId, newAnswerMessage);
        ws.send(
          makeMessage("llm-chunk", {
            end: true,
            content,
            message: newAnswerMessage,
          })
        );
      }
    } catch (error) {
      console.error(error);
      ws.send(makeMessage("error", { message: "Authentication failed" }));
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

  const indexer = makeIndexer({ key: scrape.indexer });
  const result = await indexer.search(scrape.id, query);
  const processed = await indexer.process(query, result);

  await consumeCredits(scrape.userId, "messages", 1);
  await addMessage(thread.id, {
    uuid: uuidv4(),
    llmMessage: { role: "user", content: query },
    links: processed.map((p) => ({
      url: p.url,
      title: null,
      score: p.score,
    })),
    createdAt: new Date(),
    pinnedAt: null,
  });

  res.json(processed);
});

app.post("/resource/:scrapeId", authenticate, async (req, res) => {
  const userId = req.user!.id;
  const scrapeId = req.params.scrapeId;
  const markdown = req.body.markdown;
  const title = req.body.title;

  if (!scrapeId || !markdown || !title) {
    res.status(400).json({ message: "Missing scrapeId or markdown or title" });
    return;
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

  res.json({ scrapeItem });
});

app.post("/answer/:scrapeId", async (req, res) => {
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

  const indexer = makeIndexer({ key: scrape.indexer });

  await addMessage(thread.id, {
    uuid: uuidv4(),
    llmMessage: { role: "user", content: query },
    links: [],
    createdAt: new Date(),
    pinnedAt: null,
  });

  const flow = new Flow<{}, RAGAgentCustomMessage>(
    {
      "rag-agent": new RAGAgent(indexer, scrape.id),
    },
    {
      messages: [
        ...messages.map((m) => ({
          llmMessage: {
            role: m.role as "user" | "assistant",
            content: m.content,
          },
        })),
        {
          llmMessage: {
            role: "user",
            content: query,
          },
        },
      ],
    }
  );
  flow.addNextAgents(["rag-agent"]);

  while (await flow.stream()) {}

  const content = (flow.getLastMessage().llmMessage.content as string) ?? "";

  const matches = flow.flowState.state.messages
    .map((m) => m.custom?.result)
    .filter((r) => r !== undefined)
    .flat();

  const links: MessageSourceLink[] = [];
  for (const match of matches) {
    const item = await prisma.scrapeItem.findFirst({
      where: {
        OR: [{ url: match.url }, { id: match.scrapeItemId }],
      },
    });
    if (item) {
      links.push({
        url: match.url ?? null,
        title: item.title,
        score: match.score ?? null,
      });
    }
  }

  await addMessage(thread.id, {
    uuid: uuidv4(),
    llmMessage: { role: "user", content: query },
    links,
    createdAt: new Date(),
    pinnedAt: null,
  });

  const newAnswerMessage: Message = {
    uuid: uuidv4(),
    llmMessage: { role: "assistant", content },
    links,
    createdAt: new Date(),
    pinnedAt: null,
  };
  await consumeCredits(scrape.userId, "messages", 1);
  addMessage(thread.id, newAnswerMessage);

  res.json({ message: newAnswerMessage });
});

app.get("/discord/:channelId", async (req, res) => {
  const scrape = await prisma.scrape.findFirst({
    where: { discordServerId: req.params.channelId },
  });

  if (!scrape) {
    res.status(404).json({ scrapeId: null, userId: null });
    return;
  }

  res.json({ scrapeId: scrape.id, userId: scrape.userId });
});

app.listen(port, async () => {
  console.log(`Running on port ${port}`);
});
