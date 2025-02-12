import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Express, Request, Response } from "express";
import ws from "express-ws";
import { scrape, scrapeLoop, type ScrapeStore } from "./scrape/crawl";
import { OrderedSet } from "./scrape/ordered-set";
import cors from "cors";
import OpenAI from "openai";
import { askLLM, makeContext } from "./llm";
import { Stream } from "openai/streaming";
import { loadIndex, loadStore, saveIndex, saveStore } from "./scrape/store";
import { makeIndex } from "./vector";
import { addMessage } from "./thread/store";
import { prisma } from "./prisma";

const userId = "6790c3cc84f4e51db33779c5";

const app: Express = express();
const expressWs = ws(app);
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

function makeMessage(type: string, data: any) {
  return JSON.stringify({ type, data });
}

function broadcast(message: string) {
  expressWs.getWss().clients.forEach((client) => {
    client.send(message);
  });
}

async function streamLLMResponse(
  ws: WebSocket,
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

app.get("/", function (req: Request, res: Response) {
  res.json({ message: "ok" });
});

app.get("/test", async function (req: Request, res: Response) {
  const store: ScrapeStore = {
    urls: {},
    urlSet: new OrderedSet(),
  };
  store.urlSet.add("https://elevenlabs.io/docs");
  await scrapeLoop(store, "https://elevenlabs.io/docs", {limit: 100});
  res.json(store);
});

app.post("/scrape", async function (req: Request, res: Response) {
  const url = req.body.url;

  if (
    await prisma.scrape.findFirst({
      where: { url, userId },
    })
  ) {
    res.status(212).json({ message: "already-scraped" });
    return;
  }

  (async function () {
    const scrape = await prisma.scrape.create({
      data: { url, status: "pending", userId, urlCount: 0 },
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
      onPreScrape: async (url, store) => {
        const scrapedUrlCount = Object.values(store.urls).length;
        const remainingUrlCount = store.urlSet.size() - scrapedUrlCount;
        broadcast(
          makeMessage("scrape-pre", {
            url,
            scrapedUrlCount,
            remainingUrlCount,
          })
        );
      },
      onComplete: async () => {
        broadcast(makeMessage("scrape-complete", { url }));
      },
    });

    await saveStore(scrape.id, store);

    const index = await makeIndex(store);
    await saveIndex(scrape.id, index);

    await prisma.scrape.update({
      where: { id: scrape.id },
      data: { status: "done", urlCount: store.urlSet.size() },
    });

    broadcast(makeMessage("saved", { url }));
  })();

  res.json({ message: "ok" });
});

expressWs.app.ws("/", function (ws, req) {
  ws.on("message", async function (msg) {
    const message = JSON.parse(msg.toString());

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
        where: { id: threadId },
      });

      const scrape = await prisma.scrape.findFirstOrThrow({
        where: { id: thread.scrapeId },
      });

      addMessage(threadId, {
        llmMessage: { role: "user", content: message.data.query },
        links: [],
      });

      const store = await loadStore(scrape.id);
      const index = await loadIndex(scrape.id);
      if (!store || !index) {
        ws.send(makeMessage("error", { message: "Store or index not found" }));
        return;
      }

      const context = await makeContext(message.data.query, index, store);
      const response = await askLLM(message.data.query, thread.messages, {
        url: scrape.url,
        context: context?.content,
      });
      if (context?.links) {
        ws.send(
          makeMessage("links", {
            links: context.links,
          })
        );
      }
      const { content, role } = await streamLLMResponse(ws as any, response);
      addMessage(threadId, {
        llmMessage: { role, content },
        links:
          context?.links?.map((link) => ({
            url: link.url,
            metaTags: link.metaTags,
          })) ?? [],
      });
      ws.send(
        makeMessage("llm-chunk", {
          end: true,
          content,
          role,
          links: context?.links,
        })
      );
    }
  });
});

app.listen(port, async () => {
  console.log(`Running on port ${port}`);
});
