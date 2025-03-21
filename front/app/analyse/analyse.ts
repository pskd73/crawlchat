import type { Message, MessageSourceLink, Prisma } from "libs/prisma";

export type MessageWithThread = Prisma.MessageGetPayload<{
  include: {
    thread: true;
  };
}>;

export type MessagePair = {
  scrapeId: string;
  queryMessage?: MessageWithThread;
  responseMessage: MessageWithThread;
  maxScore: number;
  minScore: number;
  averageScore: number;
  uniqueLinks: MessageSourceLink[];
};

export function analysePairMessages(pairs: MessagePair[]) {
  const defaultPairs = pairs.filter(
    (pair) => pair.responseMessage.thread.isDefault
  );

  const performance = {
    0.2: 0,
    0.4: 0,
    0.6: 0,
    0.8: 0,
    1.0: 0,
  };

  for (const pair of pairs) {
    const score = pair.averageScore;
    if (score <= 0.2) {
      performance[0.2]++;
    } else if (score <= 0.4) {
      performance[0.4]++;
    } else if (score <= 0.6) {
      performance[0.6]++;
    } else if (score <= 0.8) {
      performance[0.8]++;
    } else if (score <= 1.0) {
      performance[1.0]++;
    }
  }

  return { performance, defaultPairs };
}

export function makeMessagePairs(messages: MessageWithThread[]) {
  function findUserMessage(i: number, threadId: string) {
    for (let j = i; j >= 0; j--) {
      if (messages[j].threadId !== threadId) {
        continue;
      }
      if ((messages[j].llmMessage as any).role === "user") {
        return messages[j];
      }
    }
  }

  const messagePairs: MessagePair[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const { links } = message;
    if ((message.llmMessage as any).role === "user") {
      continue;
    }
    let minScore = 0;
    let maxScore = 0;
    let averageScore = 0;
    if (links.length > 0) {
      maxScore = Math.max(
        ...links.filter((l) => l.score !== null).map((l) => l.score!)
      );
      minScore = Math.min(
        ...links.filter((l) => l.score !== null).map((l) => l.score!)
      );
      averageScore =
        links
          .filter((l) => l.score !== null)
          .reduce((acc, l) => acc + l.score!, 0) /
        links.filter((l) => l.score !== null).length;
    }

    messagePairs.push({
      scrapeId: message.thread.scrapeId,
      queryMessage: findUserMessage(i, message.threadId),
      responseMessage: message,
      maxScore,
      minScore,
      averageScore,
      uniqueLinks: links
        .filter((l) => l.score !== null)
        .filter(
          (u, i, a) =>
            i === a.findIndex((u2) => u2.scrapeItemId === u.scrapeItemId)
        ),
    });
  }

  return messagePairs.sort(
    (a, b) =>
      (b.responseMessage.createdAt?.getTime() ?? 0) -
      (a.responseMessage.createdAt?.getTime() ?? 0)
  );
}
