import type { Message, QuestionSentiment } from "libs/prisma";

export function getMessagesSummary(messages: Message[]) {
  const dailyMessages: Record<string, number> = {};

  for (const message of messages) {
    if (!message.createdAt) continue;
    if (message.llmMessage?.role === "user") continue;
    const date = new Date(message.createdAt);
    const key = date.toISOString().split("T")[0];
    dailyMessages[key] = (dailyMessages[key] ?? 0) + 1;
  }

  const today = new Date();
  const todayKey = today.toISOString().split("T")[0];
  const messagesToday = dailyMessages[todayKey] ?? 0;

  const scoreDestribution: Record<number, { count: number }> = {};
  const points = 10;
  for (let i = 0; i < points; i++) {
    scoreDestribution[i] = { count: 0 };
  }

  for (const message of messages) {
    if (!message.links || message.links.length === 0) continue;

    const max = Math.max(...message.links.map((l) => l.score ?? 0));
    const index = Math.floor(max * points);
    scoreDestribution[index] = {
      count: (scoreDestribution[index]?.count ?? 0) + 1,
    };
  }

  const ratingUpCount = messages.filter((m) => m.rating === "up").length;
  const ratingDownCount = messages.filter((m) => m.rating === "down").length;

  const itemCounts: Record<
    string,
    { title: string; count: number; url: string }
  > = {};
  for (const message of messages) {
    if (!message.links || message.links.length === 0) continue;
    for (const link of message.links) {
      if (!link.url) continue;
      itemCounts[link.url] = {
        url: link.url,
        title: link.title ?? link.url,
        count: (itemCounts[link.url]?.count ?? 0) + 1,
      };
    }
  }

  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const latestQuestions = messages
    .filter((m) => (m.llmMessage as any)?.role === "user")
    .sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    )
    .slice(0, 5);

  let lowRatingQueries = [];
  let lastUserMessage: Message | null = null;
  for (const message of messages) {
    const role = (message.llmMessage as any)?.role;
    if (role === "user") {
      lastUserMessage = message;
    }
    if (role !== "assistant") continue;

    const links = message.links ?? [];
    const maxScore = Math.max(...links.map((l) => l.score ?? 0));
    if (links.length > 0 && maxScore < 0.3 && maxScore > 0) {
      const queries = links.map((l) => l.searchQuery);
      const uniqueQueries = [...new Set(queries)];
      lowRatingQueries.push({
        message,
        maxScore,
        queries: uniqueQueries,
        userMessage: lastUserMessage,
      });
    }
  }

  lowRatingQueries = lowRatingQueries.sort((a, b) => a.maxScore - b.maxScore);

  const maxScores = messages
    .filter((m) => m.links.length > 0)
    .map((m) => Math.max(...m.links.map((l) => l.score ?? 0)));
  const avgScore =
    maxScores.length > 0
      ? maxScores.reduce((acc, curr) => acc + curr, 0) / maxScores.length
      : null;

  const questions = messages.filter(
    (m) => (m.llmMessage as any)?.role === "user"
  ).length;

  const resolvedCount = messages.filter((m) => m.analysis?.resolved).length;

  const sentimentCounts: Record<QuestionSentiment, number> = {
    happy: 0,
    sad: 0,
    neutral: 0,
  };
  for (const message of messages) {
    if (!message.analysis?.questionSentiment) continue;
    sentimentCounts[message.analysis.questionSentiment]++;
  }
  const happyPct = questions > 0 ? sentimentCounts.happy / questions : 0;
  const sadPct = questions > 0 ? sentimentCounts.sad / questions : 0;
  const neutralPct = questions > 0 ? sentimentCounts.neutral / questions : 0;

  return {
    messagesCount: Object.values(dailyMessages).reduce(
      (acc, curr) => acc + curr,
      0
    ),
    dailyMessages,
    messagesToday,
    scoreDestribution,
    ratingUpCount,
    ratingDownCount,
    topItems,
    latestQuestions,
    lowRatingQueries,
    avgScore,
    questions,
    resolvedCount,
    happyPct,
    sadPct,
    neutralPct,
  };
}

export type MessagesSummary = ReturnType<typeof getMessagesSummary>;
