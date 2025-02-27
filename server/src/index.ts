import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Express, Request, Response } from "express";
import ws from "express-ws";
import { scrapeLoop, type ScrapeStore } from "./scrape/crawl";
import { OrderedSet } from "./scrape/ordered-set";
import cors from "cors";
import OpenAI from "openai";
import { askLLM } from "./llm";
import { Stream } from "openai/streaming";
import { addMessage } from "./thread/store";
import { prisma } from "./prisma";
import {
  deleteByIds,
  deleteScrape,
  makeEmbedding,
  makeRecordId,
  saveEmbedding,
  search,
} from "./scrape/pinecone";
import { joinRoom, broadcast } from "./socket-room";
import { getRoomIds } from "./socket-room";
import { authenticate, verifyToken } from "./jwt";
import { getMetaTitle } from "./scrape/parse";
import { splitMarkdown } from "./scrape/markdown-splitter";
import {
  AnswerAgent,
  QueryPlannerAgent,
  QuestionSplitterAgent,
} from "./llm/agentic";
import { makeLLMTxt } from "./llm-txt";
import { v4 as uuidv4 } from "uuid";

const app: Express = express();
const expressWs = ws(app);
const port = process.env.PORT || 3000;

app.use(/\/((?!sse).)*/, express.json());
app.use(cors());

function makeMessage(type: string, data: any) {
  return JSON.stringify({ type, data });
}

async function streamLLMResponse(
  ws: any,
  response: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>
) {
  let content = "";
  let role: "developer" | "system" | "user" | "assistant" | "tool" = "user";
  for await (const chunk of response) {
    if (chunk.choices[0]?.delta?.content) {
      content += chunk.choices[0].delta.content;
      ws.send(
        makeMessage("llm-chunk", { content: chunk.choices[0].delta.content })
      );
    }
    if (chunk.choices[0]?.delta?.role) {
      role = chunk.choices[0].delta.role;
    }
  }
  return { content, role };
}

function getUniqueLinks(links: { url: string }[]) {
  return links.filter(
    (link, index, self) => self.findIndex((t) => t.url === link.url) === index
  );
}

app.get("/", function (req: Request, res: Response) {
  res.json({ message: "ok" });
});

app.get("/test", async function (req: Request, res: Response) {
  res.json({ message: "ok" });
});

app.post("/scrape", authenticate, async function (req: Request, res: Response) {
  const userId = req.user!.id;
  const url = req.body.url;
  const scrapeId = req.body.scrapeId!;
  const dynamicFallbackContentLength = req.body.dynamicFallbackContentLength;
  const roomId = req.body.roomId;
  const includeMarkdown = req.body.includeMarkdown;

  const scraping = await prisma.scrape.count({
    where: {
      userId,
      status: "scraping",
    },
  });

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

    await scrapeLoop(store, req.body.url ?? scrape.url, {
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
          const chunkDocs = await Promise.all(
            chunks.map(async (chunk) => ({
              id: makeRecordId(scrape.id, uuidv4()),
              embedding: await makeEmbedding(chunk),
              metadata: { content: chunk, url },
            }))
          );
          await saveEmbedding(scrape.id, chunkDocs);

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
              existingItem.embeddings.map((embedding) => embedding.id)
            );
          }

          await prisma.scrapeItem.upsert({
            where: { scrapeId_url: { scrapeId: scrape.id, url } },
            update: {
              markdown,
              title: getMetaTitle(store.urls[url]?.metaTags ?? []),
              metaTags: store.urls[url]?.metaTags,
              embeddings: chunkDocs.map((doc) => ({
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
              embeddings: chunkDocs.map((doc) => ({
                id: doc.id,
              })),
              status: "completed",
            },
          });

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
      await deleteScrape(scrapeId);
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

        const newQueryMessage = {
          uuid: uuidv4(),
          llmMessage: { role: "user", content: message.data.query },
          links: [],
          createdAt: new Date(),
          pinnedAt: null,
        };
        addMessage(threadId, newQueryMessage);
        ws.send(makeMessage("query-message", newQueryMessage));

        const queryAgent = new QueryPlannerAgent();
        const { query } = await queryAgent.run([
          ...thread.messages,
          newQueryMessage,
        ]);

        console.log({ query });

        const result = await search(scrape.id, await makeEmbedding(query));
        const matches = result.matches.map((match) => ({
          content: match.metadata!.content as string,
          url: match.metadata!.url as string,
        }));
        const context = {
          content: matches.map((match) => match.content).join("\n\n"),
          links: getUniqueLinks(matches).map((match) => ({
            url: match.url,
          })),
        };

        const response = await askLLM(message.data.query, thread.messages, {
          url: scrape.url,
          context: context?.content,
          systemPrompt: scrape.chatPrompt ?? undefined,
        });
        if (context?.links) {
          ws.send(
            makeMessage("links", {
              links: context.links,
            })
          );
        }
        const { content, role } = await streamLLMResponse(ws, response);

        const linksWithTitle: { url: string; title: string | null }[] = [];
        for (const link of context?.links ?? []) {
          const item = await prisma.scrapeItem.findFirst({
            where: { url: link.url },
          });
          if (item) {
            linksWithTitle.push({ ...link, title: item.title });
          }
        }

        const newAnswerMessage = {
          uuid: uuidv4(),
          llmMessage: { role, content },
          links: linksWithTitle,
          createdAt: new Date(),
          pinnedAt: null,
        };
        addMessage(threadId, newAnswerMessage);
        ws.send(
          makeMessage("llm-chunk", {
            end: true,
            content,
            role,
            links: linksWithTitle,
            uuid: newAnswerMessage.uuid,
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

  const query = req.query.query as string;

  const result = await search(scrape.id, await makeEmbedding(query));

  res.json(result.matches.map((match) => match.metadata));
});

app.listen(port, async () => {
  console.log(`Running on port ${port}`);
});
