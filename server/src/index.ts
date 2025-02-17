import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Express, Request, Response } from "express";
import ws from "express-ws";
import { scrape, scrapeLoop, type ScrapeStore } from "./scrape/crawl";
import { OrderedSet } from "./scrape/ordered-set";
import cors from "cors";
import OpenAI from "openai";
import { askLLM, getSystemPrompt } from "./llm";
import { Stream } from "openai/streaming";
import { addMessage } from "./thread/store";
import { prisma } from "./prisma";
import {
  chunkText,
  deleteScrape,
  makeEmbedding,
  saveEmbedding,
  search,
} from "./scrape/pinecone";
import { joinRoom, broadcast } from "./socket-room";
import { getRoomIds } from "./socket-room";
import { authenticate, verifyToken } from "./jwt";
import fs from "fs/promises";
import { Prisma } from "@prisma/client";
import { getMetaTitle } from "./scrape/parse";

const app: Express = express();
const expressWs = ws(app);
const port = process.env.PORT || 3000;

app.use(express.json());
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
  // const result = await search(
  //   "6790c3cc84f4e51db33779c5",
  //   "67b09ed1857e093b09ca7ace",
  //   await makeEmbedding("How to setup google auth?")
  // );

  // const result = await scrape(
  //   "https://www.hindustantimes.com/entertainment/tv/ranveer-allahbadia-s-new-note-my-remark-was-insensitive-101739630398181.html"
  // );
  // const result = await scrape(
  //   "https://docs.firecrawl.dev/features/crawl"
  // );

  const result = await scrape(
    "https://www.chakra-ui.com/docs/components/empty-state"
  );

  await fs.writeFile("test.md", result.markdown);

  res.json({ result });
});

app.post("/scrape", authenticate, async function (req: Request, res: Response) {
  const userId = req.user!.id;
  const url = req.body.url;

  const existingScrape = await prisma.scrape.findFirst({
    where: { url, userId },
  });
  if (existingScrape) {
    res
      .status(212)
      .json({ message: "already-scraped", scrapeId: existingScrape.id });
    return;
  }

  (async function () {
    const scrape = await prisma.scrape.create({
      data: { url, status: "pending", userId, urls: [] },
    });

    const store: ScrapeStore = {
      urls: {},
      urlSet: new OrderedSet(),
    };
    store.urlSet.add(url);

    await prisma.scrape.update({
      where: { id: scrape.id },
      data: { status: "scraping" },
    });

    await scrapeLoop(store, req.body.url, {
      limit: req.body.maxLinks ? parseInt(req.body.maxLinks) : undefined,
      skipRegex: req.body.skipRegex
        ? req.body.skipRegex
            .split(",")
            .map((regex: string) => new RegExp(regex))
        : undefined,
      onComplete: async () => {
        const roomIds = getRoomIds({ userId });
        roomIds.forEach((roomId) =>
          broadcast(roomId, makeMessage("scrape-complete", { url }))
        );
      },
      afterScrape: async (url, { markdown }) => {
        const scrapedUrlCount = Object.values(store.urls).length;
        const maxLinks = req.body.maxLinks
          ? parseInt(req.body.maxLinks)
          : undefined;
        const remainingUrlCount = maxLinks
          ? maxLinks - scrapedUrlCount
          : store.urlSet.size() - scrapedUrlCount;
        const roomIds = getRoomIds({ userId });

        const chunks = await chunkText(markdown);

        const batchSize = 20;
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          const embeddings = [];
          for (const chunk of batch) {
            const embedding = await makeEmbedding(chunk);
            embeddings.push({
              embedding,
              metadata: { content: chunk, url },
            });
          }
          await saveEmbedding(userId, scrape.id, embeddings);
        }

        const update: Prisma.ScrapeUpdateInput = {
          urls: Object.keys(store.urls)
            .filter(Boolean)
            .map((url) => ({
              url,
              title: getMetaTitle(store.urls[url]?.metaTags ?? []),
            })),
        };
        if (url === scrape.url && store.urls[url]?.metaTags) {
          update.metaTags = store.urls[url].metaTags;
        }

        await prisma.scrape.update({
          where: { id: scrape.id },
          data: update,
        });

        roomIds.forEach((roomId) =>
          broadcast(
            roomId,
            makeMessage("scrape-pre", {
              url,
              scrapedUrlCount,
              remainingUrlCount,
            })
          )
        );
      },
    });

    await prisma.scrape.update({
      where: { id: scrape.id },
      data: {
        status: "done",
      },
    });

    const roomIds = getRoomIds({ userId });
    roomIds.forEach((roomId) =>
      broadcast(roomId, makeMessage("saved", { url }))
    );
  })();

  res.json({ message: "ok" });
});

app.delete(
  "/scrape",
  authenticate,
  async function (req: Request, res: Response) {
    const userId = req.user!.id;
    const scrapeId = req.body.scrapeId;
    try {
      await deleteScrape(userId, scrapeId);
    } catch (error) {}
    res.json({ message: "ok" });
  }
);

expressWs.app.ws("/", (ws: any, req) => {
  let userId: string | null = null;

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
        userId = user.userId;
        getRoomIds({ userId }).forEach((roomId) => joinRoom(roomId, ws));
        return;
      }

      // Check authentication for all other messages
      if (!userId) {
        ws.send(makeMessage("error", { message: "Not authenticated" }));
        ws.close();
        return;
      }

      if (message.type === "create-thread") {
        const scrape = await prisma.scrape.findFirstOrThrow({
          where: { url: message.data.url, userId },
        });

        const thread = await prisma.thread.create({
          data: { userId, scrapeId: scrape.id, messages: [] },
        });
        ws.send(makeMessage("thread-created", { threadId: thread.id }));
      }

      if (message.type === "ask-llm") {
        const threadId = message.data.threadId;
        const thread = await prisma.thread.findFirstOrThrow({
          where: { id: threadId, userId },
        });

        const scrape = await prisma.scrape.findFirstOrThrow({
          where: { id: thread.scrapeId },
        });

        addMessage(threadId, {
          llmMessage: { role: "user", content: message.data.query },
          links: [],
        });

        const result = await search(
          userId,
          scrape.id,
          await makeEmbedding(message.data.query)
        );
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
          systemPrompt: getSystemPrompt(thread.responseType ?? "long"),
        });
        if (context?.links) {
          ws.send(
            makeMessage("links", {
              links: context.links,
            })
          );
        }
        const { content, role } = await streamLLMResponse(ws, response);

        const linksWithTitle = context?.links.map((link) => ({
          ...link,
          title: scrape.urls.find((url) => url.url === link.url)?.title ?? null,
        }));
        addMessage(threadId, {
          llmMessage: { role, content },
          links: linksWithTitle,
        });
        ws.send(
          makeMessage("llm-chunk", {
            end: true,
            content,
            role,
            links: linksWithTitle,
          })
        );
      }
    } catch (error) {
      ws.send(makeMessage("error", { message: "Authentication failed" }));
      ws.close();
    }
  });

  ws.on("close", () => {
    userId = null;
  });
});

app.listen(port, async () => {
  console.log(`Running on port ${port}`);
});
