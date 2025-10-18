import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import ws from "express-ws";
import cors from "cors";
import { prisma } from "./prisma";
import { deleteByIds, deleteScrape, makeRecordId } from "./scrape/pinecone";
import { authenticate, AuthMode, authoriseScrapeUser } from "./auth";
import { splitMarkdown } from "./scrape/markdown-splitter";
import { v4 as uuidv4 } from "uuid";
import { LlmModel, Message, MessageChannel, Thread } from "libs/prisma";
import { makeIndexer } from "./indexer/factory";
import { name } from "libs";
import { consumeCredits, hasEnoughCredits } from "libs/user-plan";
import {
  makeRagTool,
  QueryContext,
  RAGAgentCustomMessage,
} from "./llm/flow-jasmine";
import { extractCitations } from "libs/citation";
import { assertLimit, makeKbProcesserListener } from "./kb/listener";
import { makeKbProcesser } from "./kb/factory";
import { FlowMessage, multiLinePrompt, SimpleAgent } from "./llm/agentic";
import { chunk } from "libs/chunk";
import { retry } from "./retry";
import { Flow } from "./llm/flow";
import { z } from "zod";
import { baseAnswerer, AnswerListener, collectSourceLinks } from "./answer";
import { fillMessageAnalysis } from "./llm/analyse-message";
import { createToken, verifyToken } from "libs/jwt";
import { MultimodalContent, getQueryString } from "libs/llm-message";
import {
  draftRateLimiter,
  mcpRateLimiter,
  wsRateLimiter,
} from "./rate-limiter";
import { scrape } from "./scrape/crawl";
import { getConfig } from "./llm/config";
import { getNextNumber } from "libs/mongo-counter";
import { randomUUID } from "crypto";

const app: Express = express();
const expressWs = ws(app);
const port = process.env.PORT || 3000;

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

app.use(/\/((?!sse).)*/, express.json({ limit: "50mb" }));
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

async function updateLastMessageAt(threadId: string) {
  await prisma.thread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });
}

app.get("/", function (req: Request, res: Response) {
  res.json({ message: "ok" });
});

app.get("/test", async function (req: Request, res: Response) {
  res.json({ ok: true, name: name() });
});

app.post("/scrape", authenticate, async function (req: Request, res: Response) {
  const scrapeId = req.body.scrapeId!;
  const knowledgeGroupId = req.body.knowledgeGroupId!;

  authoriseScrapeUser(req.user!.scrapeUsers, scrapeId, res);

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId },
    include: {
      user: true,
    },
  });

  const knowledgeGroup = await prisma.knowledgeGroup.findFirstOrThrow({
    where: { id: knowledgeGroupId },
  });

  console.log("Scraping for", scrape.id);

  const url = req.body.url ? cleanUrl(req.body.url) : req.body.url;

  (async function () {
    function getLimit() {
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

    const listener = makeKbProcesserListener(scrape, knowledgeGroup);

    const processer = makeKbProcesser(listener, scrape, knowledgeGroup, {
      limit: getLimit(),
      url,
    });

    try {
      await processer.start();
    } catch (error: any) {
      await listener.onComplete(error.message);
    }
  })();

  res.json({ message: "ok" });
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
    await deleteScrape(indexer.getKey(), scrapeId);

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

    authoriseScrapeUser(req.user!.scrapeUsers, knowledgeGroup.scrapeId, res);

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
  let userId: string | null = null;

  ws.on("message", async (msg: Buffer | string) => {
    wsRateLimiter.check();

    try {
      const message = JSON.parse(msg.toString());

      if (
        message?.data?.query
          ?.toLowerCase()
          .includes(
            "server side rendering with paremterized videos in a studio"
          )
      ) {
        console.log("Closing spam socket");
        ws.close();
        return;
      }

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
        ws.send(makeMessage("connected", { message: "Connected" }));
        return;
      }

      if (!userId) {
        ws.send(makeMessage("error", { message: "Not authenticated" }));
        ws.close();
        return;
      }

      if (message.type === "ask-llm") {
        const threadId = message.data.threadId;
        const deleteIds = message.data.delete;
        const thread = await prisma.thread.findFirstOrThrow({
          where: { id: threadId },
          include: {
            messages: true,
          },
        });

        if (deleteIds) {
          await prisma.message.deleteMany({
            where: { id: { in: deleteIds }, threadId },
          });
        }

        const scrape = await prisma.scrape.findFirstOrThrow({
          where: { id: thread.scrapeId },
        });

        if (scrape.private) {
          const user = await prisma.user.findFirst({
            where: { id: userId },
            include: {
              scrapeUsers: true,
            },
          });

          const isMember = user?.scrapeUsers.some(
            (su) => su.scrapeId === scrape.id
          );

          if (!isMember) {
            throw new Error("Private collection");
          }
        }

        if (
          !(await hasEnoughCredits(scrape.userId, "messages", {
            alert: {
              scrapeId: scrape.id,
              token: createToken(scrape.userId),
            },
          }))
        ) {
          ws.send(
            makeMessage("error", {
              message: "Not enough credits. Contact the owner!",
            })
          );
          ws.close();
          return;
        }

        const actions = await prisma.apiAction.findMany({
          where: {
            scrapeId: scrape.id,
          },
        });

        let questionMessage: Message | null = null;

        const answerListener: AnswerListener = async (event) => {
          switch (event.type) {
            case "init":
              questionMessage = await prisma.message.create({
                data: {
                  threadId,
                  scrapeId: scrape.id,
                  llmMessage: { role: "user", content: event.query },
                  ownerUserId: scrape.userId,
                },
              });
              await updateLastMessageAt(threadId);
              ws?.send(makeMessage("query-message", questionMessage));
              break;

            case "stream-delta":
              if (event.delta) {
                ws?.send(makeMessage("llm-chunk", { content: event.delta }));
              }
              break;

            case "tool-call":
              ws?.send(
                makeMessage("stage", {
                  stage: "tool-call",
                  query: event.query,
                  action: event.action,
                })
              );
              break;

            case "answer-complete":
              await consumeCredits(
                scrape.userId,
                "messages",
                event.creditsUsed
              );
              const newAnswerMessage = await prisma.message.create({
                data: {
                  threadId,
                  scrapeId: scrape.id,
                  llmMessage: { role: "assistant", content: event.content },
                  links: event.sources,
                  apiActionCalls: event.actionCalls as any,
                  ownerUserId: scrape.userId,
                  questionId: questionMessage?.id ?? null,
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

              await fillMessageAnalysis(
                newAnswerMessage.id,
                message.data.query,
                event.content,
                event.sources,
                event.context,
                {
                  onFollowUpQuestion: (questions) => {
                    ws?.send(makeMessage("follow-up-questions", { questions }));
                  },
                }
              );
          }
        };

        const answerer = baseAnswerer;

        await retry(async () => {
          answerer(
            scrape,
            thread,
            message.data.query,
            thread.messages.map((message) => {
              const llmMessage = message.llmMessage as any;
              if (message.apiActionCalls.length > 0) {
                llmMessage.content = `
                ${llmMessage.content}
                ${message.apiActionCalls
                  .map((call) => {
                    return `
                  Data: ${JSON.stringify(call.data)}
                  Response: ${call.response}
                  `;
                  })
                  .join("\n\n")}
                `;
              }
              return { llmMessage };
            }),
            {
              listen: answerListener,
              actions,
              channel: "widget",
              clientData: message.data.clientData,
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
    userId = null;
  });
});

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
  const scrapeId = req.params.scrapeId;
  const knowledgeGroupType = req.body.knowledgeGroupType;
  const defaultGroupTitle = req.body.defaultGroupTitle;
  const markdown = req.body.markdown;
  const title = req.body.title;
  const knowledgeGroupId = req.body.knowledgeGroupId;

  authoriseScrapeUser(req.user!.scrapeUsers, scrapeId, res);

  if (!scrapeId || !markdown || !title) {
    res.status(400).json({ message: "Missing scrapeId or markdown or title" });
    return;
  }

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId },
    include: {
      user: true,
    },
  });

  let knowledgeGroup = await prisma.knowledgeGroup.findFirst({
    where: { scrapeId, type: knowledgeGroupType },
  });

  if (knowledgeGroupId) {
    knowledgeGroup = await prisma.knowledgeGroup.findFirstOrThrow({
      where: { id: knowledgeGroupId },
    });
  }

  const chunks = await splitMarkdown(markdown);

  if (
    !(await hasEnoughCredits(scrape.userId, "scrapes", {
      amount: chunks.length,
      alert: {
        scrapeId: scrape.id,
        token: createToken(scrape.userId),
      },
    }))
  ) {
    res.status(400).json({ message: "Not enough credits" });
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

  try {
    await assertLimit(
      new Date().toISOString(),
      chunks.length,
      scrape.id,
      scrape.userId,
      scrape.user.plan
    );
  } catch (error) {
    res.status(400).json({ message: "Pages limit reached for the plan" });
    return;
  }

  const indexer = makeIndexer({ key: scrape.indexer });
  let scrapeItem = await prisma.scrapeItem.create({
    data: {
      userId: req.user!.id,
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

  res.json({ scrapeItem });
});

app.post("/answer/:scrapeId", authenticate, async (req, res) => {
  console.log("Answer request for", req.params.scrapeId);

  wsRateLimiter.check();

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
  let query = req.body.query as string | MultimodalContent[];

  const messages = (req.body.messages ?? []) as {
    role: string;
    content: string | MultimodalContent[];
  }[];
  if (messages && messages.length > 0) {
    query = messages[messages.length - 1].content;
  }

  const reqPrompt = req.body.prompt as string;
  const prompt = [scrape.chatPrompt ?? "", reqPrompt ?? ""]
    .filter(Boolean)
    .join("\n\n");

  const channel =
    req.authMode === AuthMode.apiKey
      ? "api"
      : (req.body.channel as MessageChannel);

  await prisma.message.create({
    data: {
      threadId: thread.id,
      scrapeId: scrape.id,
      llmMessage: { role: "user", content: query },
      ownerUserId: scrape.userId,
      channel,
    },
  });
  await updateLastMessageAt(thread.id);

  const actions = await prisma.apiAction.findMany({
    where: {
      scrapeId: scrape.id,
    },
  });

  const answer = await baseAnswerer(
    scrape,
    thread,
    query,
    messages.map((m) => ({
      llmMessage: {
        role: m.role as any,
        content: m.content,
      },
    })),
    {
      prompt,
      actions,
    }
  );

  await consumeCredits(scrape.userId, "messages", answer!.creditsUsed);
  const newAnswerMessage = await prisma.message.create({
    data: {
      threadId: thread.id,
      scrapeId: scrape.id,
      llmMessage: { role: "assistant", content: answer!.content },
      links: answer!.sources,
      ownerUserId: scrape.userId,
      channel,
      apiActionCalls: answer!.actionCalls as any,
    },
  });
  await updateLastMessageAt(thread.id);

  fillMessageAnalysis(
    newAnswerMessage.id,
    getQueryString(query),
    answer!.content,
    answer!.sources,
    answer!.context
  );

  if (!answer) {
    res.status(400).json({ message: "Failed to answer" });
    return;
  }

  const citation = extractCitations(answer.content, answer.sources, {
    cleanCitations: true,
    addSourcesToMessage: channel === "api" ? false : true,
  });

  res.json({ content: citation.content, message: newAnswerMessage });
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

  if (!userEmail || !title || !message) {
    res.status(400).json({ message: "Missing userEmail or title or message" });
    return;
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
      },
    });
  }

  await prisma.message.create({
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
    },
  });

  await consumeCredits(scrape.userId, "messages", 1);

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
  const oldMessages = JSON.parse((req.body.messages as string) || "[]");
  const formatText = req.body.formatText as string;
  const llmModel = req.body.llmModel as LlmModel | undefined;

  const message = {
    role: "user",
    content: prompt,
  };

  const messages = [...oldMessages, message];

  const queryContext: QueryContext = {
    ragQueries: [],
  };

  const llmConfig = getConfig(llmModel ?? "sonnet_4_5");
  const agent = new SimpleAgent({
    id: "compose-agent",
    prompt: `
    Update the answer given above following the prompt and the question.
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

    Don't overwrite the answer with delta. Always apply the delta.

    Just give the answer. Don't give any other text other than the answer.
    Don't include <answer> or any kind of tags in the answer.
    Don't mention about you searching the context etc., it should be pure answer.

    <format-text>${formatText}</format-text>
    `,
    tools: [makeRagTool(scrape.id, scrape.indexer, { queryContext }).make()],
    ...llmConfig,
  });

  const flow = new Flow([agent], {
    messages: messages.map((m) => ({
      llmMessage: {
        role: m.role as any,
        content: m.content,
      },
    })),
  });
  flow.addNextAgents(["compose-agent"]);

  while (await flow.stream()) {}

  const content = flow.getLastMessage().llmMessage.content as string;

  await consumeCredits(scrape.userId, "messages", llmConfig.creditsPerMessage);

  res.json({
    content,
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
      scrape: true,
    },
  });

  res.json(
    memberships.map((m) => ({
      collectionId: m.scrape.id,
      collectionName: m.scrape.title,
      createdAt: m.scrape.createdAt,
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

app.post("/scrape-url", authenticate, async (req, res) => {
  if (req.user?.email !== "pramodkumar.damam73@gmail.com") {
    res.status(400).json({ message: "Unauthorised" });
    return;
  }

  const url = req.body.url as string;

  const result = await scrape(url);
  if (result.error) {
    res.status(400).json({ message: result.error });
    return;
  }

  res.json({ markdown: result.parseOutput.markdown });
});

// Error handling middleware - must be last
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Express Error:", error);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// 404 handler for unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(port, async () => {
  console.log(`Running on port ${port}`);
});
