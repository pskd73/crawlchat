import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Express, Request, Response } from "express";
import ws from "express-ws";
import { scrapeLoop, type ScrapeStore } from "./scrape/crawl";
import { OrderedSet } from "./scrape/ordered-set";
import cors from "cors";
import OpenAI from "openai";
import { askLLM, makeContext } from "./llm";
import { Stream } from "openai/streaming";
import mongoose from "mongoose";
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
      data: { url, status: "pending", userId },
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
      onPreScrape: async (url) => {
        broadcast(makeMessage("scrape-pre", { url }));
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
      data: { status: "done" },
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

      addMessage(threadId, { role: "user", content: message.data.query });

      const store = await loadStore(scrape.id);
      const index = await loadIndex(scrape.id);
      if (!store || !index) {
        ws.send(makeMessage("error", { message: "Store or index not found" }));
        return;
      }

      const response = await askLLM(
        message.data.query,
        thread.messages as any,
        {
          url: scrape.url,
          context: await makeContext(message.data.query, index, store),
        }
      );
      const { content, role } = await streamLLMResponse(ws as any, response);
      addMessage(threadId, { role, content } as any);
      ws.send(makeMessage("llm-chunk", { end: true, content, role }));
    }
  });
});

app.listen(port, async () => {
  await mongoose.connect(process.env.DATABASE_URL!);
  console.log(`Running on port ${port}`);
});
