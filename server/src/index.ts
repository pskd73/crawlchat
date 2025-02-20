import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Express, Request, Response } from "express";
import ws from "express-ws";
import { scrape, scrapeLoop, type ScrapeStore } from "./scrape/crawl";
import { OrderedSet } from "./scrape/ordered-set";
import cors from "cors";
import OpenAI from "openai";
import { askLLM } from "./llm";
import { Stream } from "openai/streaming";
import { addMessage } from "./thread/store";
import { prisma } from "./prisma";
import {
  deleteScrape,
  makeEmbedding,
  saveEmbedding,
  search,
} from "./scrape/pinecone";
import { joinRoom, broadcast } from "./socket-room";
import { getRoomIds } from "./socket-room";
import { authenticate, verifyToken } from "./jwt";
import fs from "fs/promises";
import { getMetaTitle } from "./scrape/parse";
import { splitMarkdown } from "./scrape/markdown-splitter";

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
  // const url = "https://www.remotion.dev/docs/google-fonts/get-available-fonts"
  const url = "https://www.chakra-ui.com/docs/components/table";
  const content = await scrape(url);
  await fs.writeFile("test.md", content.parseOutput.markdown);
  const chunks = await splitMarkdown(content.parseOutput.markdown);
  for (let i = 0; i < chunks.length; i++) {
    await fs.writeFile(`test-${i}.md`, chunks[i]);
  }
  res.json({ message: "ok", chunks });
});

app.post("/scrape", authenticate, async function (req: Request, res: Response) {
  const userId = req.user!.id;
  const url = req.body.url;
  const scrapeId = req.body.scrapeId!;

  const scraping = await prisma.scrape.count({
    where: {
      userId,
      status: "scraping",
    },
  });

  if (scraping > 0) {
    console.log("Too many scrapes", userId, scraping);
    res.json({ message: "Too many scrapes" });
    return;
  }

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId, userId },
  });

  (async function () {
    getRoomIds({ userKey: userId }).map((roomId) =>
      broadcast(roomId, makeMessage("scrape-complete", { scrapeId }))
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
      limit: req.body.maxLinks
        ? parseInt(req.body.maxLinks)
        : url
        ? 1
        : undefined,
      skipRegex: req.body.skipRegex
        ? req.body.skipRegex
            .split(",")
            .map((regex: string) => new RegExp(regex))
        : undefined,
      onComplete: async () => {
        const roomIds = getRoomIds({ userKey: userId });
        roomIds.forEach((roomId) =>
          broadcast(roomId, makeMessage("scrape-complete", { scrapeId }))
        );
      },
      afterScrape: async (url, { markdown }) => {
        const scrapedUrlCount = Object.values(store.urls).length;
        const maxLinks = req.body.maxLinks
          ? parseInt(req.body.maxLinks)
          : undefined;
        const actualRemainingUrlCount = store.urlSet.size() - scrapedUrlCount;
        const remainingUrlCount = maxLinks
          ? Math.min(maxLinks, actualRemainingUrlCount)
          : actualRemainingUrlCount;
        const roomIds = getRoomIds({ userKey: userId });

        const chunks = await splitMarkdown(markdown);
        for (const chunk of chunks) {
          const embedding = await makeEmbedding(chunk);
          await saveEmbedding(userId, scrape.id, [
            {
              embedding,
              metadata: { content: chunk, url },
            },
          ]);
        }

        if (scrape.url === url) {
          await prisma.scrape.update({
            where: { id: scrape.id },
            data: { title: getMetaTitle(store.urls[url]?.metaTags ?? []) },
          });
        }

        await prisma.scrapeItem.upsert({
          where: { scrapeId_url: { scrapeId: scrape.id, url } },
          update: {
            markdown,
            title: getMetaTitle(store.urls[url]?.metaTags ?? []),
            metaTags: store.urls[url]?.metaTags,
          },
          create: {
            userId,
            scrapeId: scrape.id,
            url,
            markdown,
            title: getMetaTitle(store.urls[url]?.metaTags ?? []),
            metaTags: store.urls[url]?.metaTags,
          },
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

    const roomIds = getRoomIds({ userKey: userId });
    roomIds.forEach((roomId) =>
      broadcast(roomId, makeMessage("saved", { scrapeId }))
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

        addMessage(threadId, {
          llmMessage: { role: "user", content: message.data.query },
          links: [],
        });

        const result = await search(
          scrape.userId,
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
      console.error(error);
      ws.send(makeMessage("error", { message: "Authentication failed" }));
      ws.close();
    }
  });

  ws.on("close", () => {
    userKey = null;
  });
});

app.listen(port, async () => {
  console.log(`Running on port ${port}`);
});
