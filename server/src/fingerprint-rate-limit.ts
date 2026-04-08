import { prisma, Scrape } from "@packages/common/prisma";

async function getQuestionCount(
  scrape: Scrape,
  gte: Date,
  fingerprint?: string
) {
  return await prisma.message.count({
    where: {
      scrapeId: scrape.id,
      fingerprint,
      llmMessage: {
        is: {
          role: "user",
        },
      },
      createdAt: {
        gte,
      },
    },
  });
}

export async function checkUserRateLimits(
  scrape: Scrape,
  fingerprint?: string
) {
  const hourQuestions = await getQuestionCount(
    scrape,
    new Date(Date.now() - 1 * 60 * 60 * 1000),
    fingerprint
  );

  if (
    scrape.fingerprintRateLimitHour !== null &&
    hourQuestions >= scrape.fingerprintRateLimitHour
  ) {
    throw new Error("APP: Hourly question limit exceeded. Try again later.");
  }

  const dayQuestions = await getQuestionCount(
    scrape,
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    fingerprint
  );

  if (
    scrape.fingerprintRateLimitDay !== null &&
    dayQuestions >= scrape.fingerprintRateLimitDay
  ) {
    throw new Error("APP: Daily question limit exceeded. Try again later.");
  }
}
