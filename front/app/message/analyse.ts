import type {
  ApiActionCall,
  MessageSourceLink,
  Prisma,
} from "@packages/common/prisma";

export type MessageWithThread = Prisma.MessageGetPayload<{
  include: {
    thread: true;
  };
}>;

export type MessagePair = {
  scrapeId: string;
  queryMessage?: MessageWithThread;
  responseMessage: MessageWithThread;
  maxScore: number | undefined;
  minScore: number | undefined;
  averageScore: number | undefined;
  uniqueLinks: MessageSourceLink[];
  actionCalls: ApiActionCall[];
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
    if (pair.maxScore === undefined) {
      continue;
    }

    const score = pair.maxScore;
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
  function findQuestion(questionId: string) {
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].id === questionId) {
        return messages[i];
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
    let minScore: number | undefined = 0;
    let maxScore: number | undefined = 0;
    let averageScore: number | undefined = 0;
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

    if (
      message.links.length === 0 ||
      message.links.every((l) => l.score === null)
    ) {
      minScore = undefined;
      maxScore = undefined;
      averageScore = undefined;
    }

    messagePairs.push({
      scrapeId: message.thread.scrapeId,
      queryMessage: message.questionId
        ? findQuestion(message.questionId)
        : undefined,
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
      actionCalls: message.apiActionCalls,
    });
  }

  return messagePairs.sort(
    (a, b) =>
      (b.responseMessage.createdAt?.getTime() ?? 0) -
      (a.responseMessage.createdAt?.getTime() ?? 0)
  );
}
