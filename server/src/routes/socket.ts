import { prisma } from "libs/prisma";
import { createToken, verifyToken } from "libs/jwt";
import { consumeCredits, hasEnoughCredits } from "libs/user-plan";
import { wsRateLimiter } from "../rate-limiter";
import { baseAnswerer, type AnswerListener } from "../answer";
import { retry } from "../retry";
import { fillMessageAnalysis } from "../analyse-message";
import expressWs from "express-ws";
import { ScrapeItem } from "libs/prisma";

function makeMessage(type: string, data: unknown) {
  return JSON.stringify({ type, data });
}

async function updateLastMessageAt(threadId: string) {
  await prisma.thread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });
}

export const handleWs: expressWs.WebsocketRequestHandler = (ws) => {
  let userId: string | null = null;

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
    wsRateLimiter.check();

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

    const threadId = message.data.threadId;
    const deleteIds = message.data.delete;
    const thread = await prisma.thread.findFirstOrThrow({
      where: { id: threadId },
      include: {
        messages: true,
      },
    });

    if (message.data.query.length > 3000) {
      ws.send(
        makeMessage("error", {
          message: "Question too long. Please shorten it.",
        })
      );
      return;
    }

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

    let questionMessage: any = null;

    const answerListener: AnswerListener = async (event) => {
      switch (event.type) {
        case "init":
          questionMessage = await prisma.message.create({
            data: {
              threadId,
              scrapeId: scrape.id,
              llmMessage: { role: "user", content: event.query },
              ownerUserId: scrape.userId,
              channel: "widget",
              fingerprint,
              url: currentItem?.url,
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
          await consumeCredits(scrape.userId, "messages", event.creditsUsed);
          const newAnswerMessage = await prisma.message.create({
            data: {
              threadId,
              scrapeId: scrape.id,
              llmMessage: { role: "assistant", content: event.content },
              links: event.sources,
              apiActionCalls: event.actionCalls as any,
              ownerUserId: scrape.userId,
              questionId: questionMessage?.id ?? null,
              llmModel: scrape.llmModel,
              creditsUsed: event.creditsUsed,
              channel: "widget",
              fingerprint,
              url: currentItem?.url,
            },
          });
          if (questionMessage) {
            await prisma.message.update({
              where: { id: questionMessage.id },
              data: { answerId: newAnswerMessage.id },
            });
          }
          await updateLastMessageAt(threadId);
          ws?.send(
            makeMessage("llm-chunk", {
              end: true,
              content: event.content,
              message: newAnswerMessage,
            })
          );

          if (questionMessage && scrape.analyseMessage) {
            await fillMessageAnalysis(
              newAnswerMessage.id,
              questionMessage.id,
              message.data.query,
              event.content,
              event.sources,
              event.context,
              {
                categories: scrape.messageCategories,
                onFollowUpQuestion: (questions) => {
                  ws?.send(makeMessage("follow-up-questions", { questions }));
                },
              }
            );
          }
      }
    };

    const recentMessages = thread.messages.slice(-40);

    await retry(async () => {
      baseAnswerer(
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
    });
  };

  ws.on("message", (msg: Buffer | string) => {
    void onMessage(msg).catch(onError);
  });

  ws.on("close", () => {
    userId = null;
  });
};
