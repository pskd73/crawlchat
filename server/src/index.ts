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
  chunkText,
  makeEmbedding,
  saveEmbedding,
  search,
} from "./scrape/pinecone";
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
      afterScrape: async (url, markdown) => {
        const chunks = await chunkText(markdown);

        const batchSize = 20;
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          const embeddings = []
          for (const chunk of batch) {
            const embedding = await makeEmbedding(chunk);
            embeddings.push({
              embedding,
              metadata: { content: chunk, url },
            });
          }
          await saveEmbedding(userId, scrape.id, embeddings);
        }        
      },
    });

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
          metaTags: [],
        })),
      };

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
        links: context?.links,
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
