import { createToken, verifyToken } from "@packages/common/jwt";
import { prisma, ScrapeItem } from "@packages/common/prisma";
import { hasEnoughCredits } from "@packages/common/user-plan";
import expressWs from "express-ws";
import type WebSocket from "ws";
import { baseAnswerer, saveAnswer, type AnswerListener } from "../answer";
import { checkUserRateLimits } from "../fingerprint-rate-limit";
import { socketAskRateLimiter } from "../rate-limiter";

function makeMessage(type: string, data: unknown) {
  return JSON.stringify({ type, data });
}

const threadConnections = new Map<string, Set<WebSocket>>();

function broadcastToThread(threadId: string, message: string) {
  const connections = threadConnections.get(threadId);
  if (!connections) return;
  for (const socket of connections) {
    if (socket.readyState === 1) socket.send(message);
  }
}

function addToThread(threadId: string, socket: WebSocket) {
  if (!threadConnections.has(threadId)) {
    threadConnections.set(threadId, new Set());
  }
  threadConnections.get(threadId)!.add(socket);
}

function removeFromAllThreads(socket: WebSocket) {
  for (const connections of threadConnections.values()) {
    connections.delete(socket);
  }
}

async function updateLastMessageAt(threadId: string) {
  await prisma.thread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });
}

export const handleWs: expressWs.WebsocketRequestHandler = (ws) => {
  let userId: string | null = null;
  const socket = ws as WebSocket & { isAlive?: boolean };
  socket.isAlive = true;
  socket.on("pong", () => {
    socket.isAlive = true;
  });

  const heartbeat = setInterval(() => {
    if (socket.readyState !== 1) return;
    if (socket.isAlive === false) {
      socket.terminate();
      return;
    }
    socket.isAlive = false;
    socket.ping();
  }, 10000);

  const onError = (error: unknown) => {
    console.error(error);
    ws.send(
      makeMessage("error", {
        message: "Something went wrong! Please refresh and try again.",
      })
    );
    ws.close();
  };

  const onMessage = async (msg: Buffer | string) => {
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

      if (message.data.threadId) {
        addToThread(message.data.threadId, ws);
      }

      ws.send(makeMessage("connected", { message: "Connected" }));
      return;
    }

    if (!userId) {
      ws.send(makeMessage("error", { message: "Not authenticated" }));
      ws.close();
      return;
    }

    if (message.type !== "ask-llm") {
      return;
    }

    socketAskRateLimiter.check();

    const threadId = message.data.threadId;
    addToThread(threadId, ws);
    const deleteIds = message.data.delete;
    const thread = await prisma.thread.findFirstOrThrow({
      where: { id: threadId },
      include: {
        messages: true,
      },
    });

    const scrape = await prisma.scrape.findFirstOrThrow({
      where: { id: thread.scrapeId },
    });

    if (message.data.query.length > 3000) {
      // repeated code
      const user = await prisma.user.findFirst({
        where: { id: userId },
        include: {
          scrapeUsers: true,
        },
      });

      const isMember = user?.scrapeUsers.some(
        (su) => su.scrapeId === scrape.id
      );

      if (!isMember || message.data.query.length > 8000) {
        ws.send(
          makeMessage("error", {
            message: "Question too long. Please shorten it.",
          })
        );
        return;
      }
    }

    if (deleteIds) {
      await prisma.message.deleteMany({
        where: { id: { in: deleteIds }, threadId },
      });
    }

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
          threshold: scrape.lowCreditsThreshold,
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

    const fingerprint = message.data.fingerprint as string | undefined;

    if (fingerprint && !thread.fingerprint) {
      await prisma.thread.update({
        where: { id: threadId },
        data: { fingerprint },
      });
    }

    let currentItem: ScrapeItem | null = null;
    if (message.data.url) {
      currentItem = await prisma.scrapeItem.findFirst({
        where: { scrapeId: scrape.id, url: message.data.url },
      });
    }

    try {
      await checkUserRateLimits(scrape, fingerprint);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith("APP: ")) {
        console.log(
          "user rate limit exceeded",
          scrape.slug ?? scrape.title ?? scrape.id
        );
        ws.send(makeMessage("error", { message: error.message.slice(4) }));
        return;
      }
      throw error;
    }

    const questionMessage = await prisma.message.create({
      data: {
        threadId,
        scrapeId: scrape.id,
        llmMessage: { role: "user", content: message.data.query },
        ownerUserId: scrape.userId,
        channel: "widget",
        fingerprint,
        url: currentItem?.url,
      },
    });
    await updateLastMessageAt(threadId);
    broadcastToThread(threadId, makeMessage("query-message", questionMessage));

    const answerListener: AnswerListener = (event) => {
      switch (event.type) {
        case "stream-delta":
          if (event.delta) {
            broadcastToThread(
              threadId,
              makeMessage("llm-chunk", { content: event.delta })
            );
          }
          break;

        case "tool-call":
          broadcastToThread(
            threadId,
            makeMessage("stage", {
              stage: "tool-call",
              query: event.query,
              action: event.action,
            })
          );
          break;
      }
    };

    const recentMessages = thread.messages.slice(-40);

    const answer = await baseAnswerer(
      scrape,
      thread,
      message.data.query,
      recentMessages.map((message) => {
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
        secret: message.data.secret,
        scrapeItem: currentItem ?? undefined,
      }
    );

    const newAnswerMessage = await saveAnswer(
      answer,
      scrape,
      threadId,
      "widget",
      questionMessage.id,
      fingerprint,
      (questions) => {
        broadcastToThread(
          threadId,
          makeMessage("follow-up-questions", { questions })
        );
      }
    );

    broadcastToThread(
      threadId,
      makeMessage("llm-chunk", {
        end: true,
        content: answer.content,
        message: newAnswerMessage,
      })
    );
  };

  ws.on("message", (msg: Buffer | string) => {
    void onMessage(msg).catch(onError);
  });

  ws.on("close", () => {
    userId = null;
    removeFromAllThreads(ws);
    clearInterval(heartbeat);
  });
};
