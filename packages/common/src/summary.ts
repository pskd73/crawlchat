import {
  KnowledgeGroupType,
  MessageChannel,
  MessageSourceLink,
  prisma,
} from "./prisma";

type SummaryMessage = {
  createdAt: Date;
  llmMessage: {
    role: string | null;
  } | null;
  rating: string | null;
  analysis: any;
  links: MessageSourceLink[];
  fingerprint: string | null;
  channel: MessageChannel | null;
  thread: {
    location: any | null;
  };
};

function monoString(str: string) {
  return str.trim().toLowerCase().replace(/^\n+/, "").replace(/\n+$/, "");
}

export function calcUniqueUsers(messages: SummaryMessage[]) {
  const usersMap = new Map<
    string,
    {
      fingerprint: string;
      questionsCount: number;
      firstAsked: Date;
      lastAsked: Date;
      channel: MessageChannel | null;
      location: any | null;
    }
  >();

  for (const message of messages) {
    const fingerprint = message.fingerprint;
    if (!fingerprint || (message.llmMessage as any)?.role !== "user") {
      continue;
    }

    const existing = usersMap.get(fingerprint);
    if (existing) {
      existing.questionsCount++;
      if (message.createdAt < existing.firstAsked) {
        existing.firstAsked = message.createdAt;
        existing.channel = message.channel;
      }
      if (message.createdAt > existing.lastAsked) {
        existing.lastAsked = message.createdAt;
      }
      if (!existing.location && message.thread.location) {
        existing.location = message.thread.location;
      }
    } else {
      usersMap.set(fingerprint, {
        fingerprint,
        questionsCount: 1,
        firstAsked: message.createdAt,
        lastAsked: message.createdAt,
        channel: message.channel,
        location: message.thread.location,
      });
    }
  }

  const dayMs = 1000 * 60 * 60 * 24;
  return Array.from(usersMap.values())
    .map((user) => ({
      ...user,
      ageDays: Math.ceil(
        (user.lastAsked.getTime() - user.firstAsked.getTime()) / dayMs
      ),
    }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

export function getMessagesSummary(
  messages: SummaryMessage[],
  full: boolean = false
) {
  const dailyMessages: Record<
    string,
    {
      count: number;
      unhappy: number;
      categories: Record<string, number>;
    }
  > = {};

  for (const message of messages) {
    if (!message.createdAt) {
      continue;
    }

    const key = new Date(message.createdAt).toISOString().split("T")[0];
    if (!dailyMessages[key]) {
      dailyMessages[key] = {
        count: 0,
        unhappy: 0,
        categories: {},
      };
    }

    if (message.llmMessage?.role === "assistant") {
      dailyMessages[key].count++;
      if (
        message.rating === "down" ||
        message.analysis?.questionSentiment === "sad"
      ) {
        dailyMessages[key].unhappy++;
      }

      if (message.analysis?.category) {
        dailyMessages[key].categories[message.analysis.category] =
          (dailyMessages[key].categories[message.analysis.category] ?? 0) + 1;
      } else {
        dailyMessages[key].categories.Other =
          (dailyMessages[key].categories.Other ?? 0) + 1;
      }
    }
  }

  const todayKey = new Date().toISOString().split("T")[0];
  const messagesToday = dailyMessages[todayKey]?.count ?? 0;
  const ratingUpCount = full
    ? messages.filter((message) => message.rating === "up").length
    : null;
  const ratingDownCount = messages.filter(
    (message) => message.rating === "down"
  ).length;

  const itemCounts: Record<
    string,
    {
      title: string;
      count: number;
      url: string;
    }
  > = {};

  for (const message of messages) {
    if (
      message.llmMessage?.role !== "assistant" ||
      !message.links ||
      message.links.length === 0
    ) {
      continue;
    }

    for (const link of message.links) {
      if (!link.url || !link.cited) {
        continue;
      }
      itemCounts[link.url] = {
        url: link.url,
        title: link.title ?? link.url,
        count: (itemCounts[link.url]?.count ?? 0) + 1,
      };
    }
  }

  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  let lowRatingQueries: any[] = [];
  let lastUserMessage: SummaryMessage | null = null;
  for (const message of messages) {
    const role = (message.llmMessage as any)?.role;
    if (role === "user") {
      lastUserMessage = message;
    }
    if (role !== "assistant") {
      continue;
    }

    const links = message.links ?? [];
    const maxScore = Math.max(...links.map((link) => link.score ?? 0));
    if (links.length > 0 && maxScore < 0.3 && maxScore > 0) {
      const queries = links.map((link) => link.searchQuery);
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
    .filter((message) => message.links.length > 0)
    .map((message) =>
      Math.max(...message.links.map((link) => link.score ?? 0))
    );
  const avgScore =
    maxScores.length > 0
      ? maxScores.reduce((accumulator, score) => accumulator + score, 0) /
        maxScores.length
      : null;

  const questions = messages.filter(
    (message) => (message.llmMessage as any)?.role === "user"
  ).length;
  const resolvedCount = messages.filter(
    (message) => message.analysis?.resolved
  ).length;

  const sentimentCounts = {
    happy: 0,
    sad: 0,
    neutral: 0,
  };
  for (const message of messages) {
    if (!message.analysis?.questionSentiment) {
      continue;
    }
    const sentiment = message.analysis.questionSentiment as
      | "happy"
      | "sad"
      | "neutral";
    sentimentCounts[sentiment]++;
  }

  const happyPct = questions > 0 ? sentimentCounts.happy / questions : 0;
  const sadPct = questions > 0 ? sentimentCounts.sad / questions : 0;

  const categorySuggestions = messages
    .filter((message) => message.analysis?.categorySuggestions)
    .map((message) =>
      message.analysis.categorySuggestions.map((suggestion: any) => ({
        ...suggestion,
        date: message.createdAt,
      }))
    )
    .reduce((accumulator, suggestions) => [...accumulator, ...suggestions], []);

  const languagesDistribution: Record<string, number> = {};
  for (const message of messages) {
    const language = message.analysis?.language;
    if (!language) {
      continue;
    }
    languagesDistribution[language] =
      (languagesDistribution[language] ?? 0) + 1;
  }

  const categoryCounts: Record<string, { count: number; latestDate: Date }> =
    {};
  for (const category of categorySuggestions) {
    if (!categoryCounts[category.title]) {
      categoryCounts[category.title] = {
        count: 0,
        latestDate: category.date,
      };
    }
    categoryCounts[category.title].count++;
    if (
      category.date &&
      category.date > categoryCounts[category.title].latestDate
    ) {
      categoryCounts[category.title].latestDate = category.date;
    }
  }

  return {
    messagesCount: Object.values(dailyMessages).reduce(
      (accumulator, current) => accumulator + current.count,
      0
    ),
    dailyMessages,
    messagesToday,
    ratingUpCount,
    ratingDownCount,
    topItems,
    lowRatingQueries,
    avgScore,
    questions,
    resolvedCount,
    happyPct,
    sadPct,
    languagesDistribution,
    tags: categoryCounts,
  };
}

export async function getCollectionSummary({
  scrapeId,
  fromTime,
  endTime,
}: {
  scrapeId: string;
  fromTime: Date;
  endTime: Date;
}) {
  const scrape = await prisma.scrape.findFirst({
    where: { id: scrapeId },
    select: {
      id: true,
      title: true,
      slug: true,
      messageCategories: true,
    },
  });

  const messages = (await prisma.message.findMany({
    where: {
      scrapeId,
      createdAt: {
        gte: fromTime,
        lte: endTime,
      },
    },
    select: {
      createdAt: true,
      llmMessage: {
        select: {
          role: true,
        },
      },
      rating: true,
      analysis: true,
      links: true,
      fingerprint: true,
      channel: true,
      thread: {
        select: {
          location: true,
        },
      },
    },
  })) as SummaryMessage[];

  const nScrapeItems = await prisma.scrapeItem.count({
    where: {
      scrapeId,
    },
  });

  const messagesSummary = getMessagesSummary(messages);
  const categoriesSummary = (scrape?.messageCategories ?? [])
    .map((category) => ({
      title: category.title,
      summary: getMessagesSummary(
        messages.filter(
          (message) =>
            message.analysis?.category &&
            monoString(message.analysis.category) === monoString(category.title)
        ),
        true
      ),
    }))
    .sort((a, b) => b.summary.messagesCount - a.summary.messagesCount);

  const topScrapeItems = await prisma.scrapeItem.findMany({
    where: {
      scrapeId,
      url: {
        in: messagesSummary.topItems.map((item) => item.url),
      },
    },
    select: {
      id: true,
      title: true,
      url: true,
      knowledgeGroup: true,
    },
  });

  const topItems = [];
  for (const item of messagesSummary.topItems) {
    const scrapeItem = topScrapeItems.find(
      (topItem) => topItem.url === item.url
    );
    if (scrapeItem) {
      topItems.push({
        id: scrapeItem.id,
        title: scrapeItem.title,
        url: scrapeItem.url,
        knowledgeGroup: scrapeItem.knowledgeGroup,
        count: item.count,
      });
    }
  }

  const allUniqueUsers = calcUniqueUsers(messages);
  const uniqueUsers = allUniqueUsers.slice(0, 10);

  const groupCitations: Record<
    string,
    {
      id: string;
      name: string;
      type: KnowledgeGroupType;
      subType: string | null;
      count: number;
    }
  > = {};
  let totalGroupCitations = 0;

  const groupIds = [
    ...new Set(
      messages
        .flatMap((message) =>
          message.links.map((link) => link.knowledgeGroupId)
        )
        .filter(Boolean)
    ),
  ] as string[];

  const citedGroups = await prisma.knowledgeGroup.findMany({
    where: {
      id: {
        in: groupIds,
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      subType: true,
    },
  });

  const citedGroupMap = new Map(
    citedGroups.map((group) => [
      group.id,
      {
        id: group.id,
        name: group.title ?? "Untitled",
        type: group.type,
        subType: group.subType,
        count: 0,
      },
    ])
  );

  for (const message of messages) {
    for (const link of message.links) {
      if (link.knowledgeGroupId && citedGroupMap.has(link.knowledgeGroupId)) {
        const group = citedGroupMap.get(link.knowledgeGroupId)!;
        group.count++;
        totalGroupCitations++;
      }
    }
  }

  for (const [groupId, group] of citedGroupMap.entries()) {
    groupCitations[groupId] = group;
  }

  const topGroupsCited = Object.values(groupCitations)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((group) => ({
      ...group,
      citedCount: group.count,
      totalCited: totalGroupCitations,
      percent:
        totalGroupCitations > 0 ? (group.count / totalGroupCitations) * 100 : 0,
    }));

  const avgUserLifetime =
    allUniqueUsers.length > 0
      ? allUniqueUsers.reduce(
          (accumulator, current) =>
            accumulator +
            Math.max(
              current.lastAsked.getTime() - current.firstAsked.getTime(),
              1000 * 60 * 60 * 24
            ),
          0
        ) / allUniqueUsers.length
      : 0;

  const avgQuestionsPerUser =
    allUniqueUsers.length > 0
      ? allUniqueUsers.reduce(
          (accumulator, current) => accumulator + current.questionsCount,
          0
        ) / allUniqueUsers.length
      : 0;

  const totalLinksReferred = messages
    .filter((message) => message.llmMessage?.role === "assistant")
    .reduce(
      (accumulator, current) =>
        accumulator + (current.links?.filter((l) => l.cited).length ?? 0),
      0
    );
  const timeSaved = totalLinksReferred * 2;

  return {
    scrape,
    nScrapeItems,
    messagesSummary,
    categoriesSummary,
    topItems,
    uniqueUsers,
    uniqueUsersCount: allUniqueUsers.length,
    topGroupsCited,
    avgUserLifetime,
    avgQuestionsPerUser,
    timeSaved,
  };
}

export type Summary = Awaited<ReturnType<typeof getCollectionSummary>>;
