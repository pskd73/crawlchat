import { adminAuthenticate } from "@packages/common/express-auth";
import { prisma } from "@packages/common/prisma";
import { PLAN_FREE, planMap } from "@packages/common/user-plan";
import { Router } from "express";

const router = Router();

router.use(adminAuthenticate);

const collectionIcons: Record<string, string> = {
  "67c0a28c5b075f0bb35e5366": "🎥",
  "68e76b6359e634922828a540": "🎒",
  "67d221efb4b9de65095a2579": "🎨",
  "68ac269d2961657c4b7924a9": "📮",
  "6887d9ca7c36f5b8b4348089": "🤝",
  "67e312247a822a2303f2b8a7": "🪄",
  "686d843711915abf46700f2b": "9️⃣",
  "67dbfc7258ed87c571a04b83": "💬",
  "692bb91325e4f55feefdfe82": "☁️",
};

router.get("/metrics", async (req, res) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const now = new Date();
  const dayStart = new Date(now.getTime() + istOffset);
  dayStart.setUTCHours(0, 0, 0, 0);
  dayStart.setTime(dayStart.getTime() - istOffset);

  const questions = await prisma.message.findMany({
    where: {
      createdAt: { gte: dayStart },
      llmMessage: {
        is: {
          role: "user",
        },
      },
    },
    select: {
      id: true,
      scrape: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const answers = await prisma.message.count({
    where: {
      createdAt: { gte: dayStart },
      llmMessage: {
        is: {
          role: "assistant",
        },
      },
    },
  });

  const messagesByCollection: Record<
    string,
    {
      id: string;
      count: number;
      title: string;
    }
  > = {};
  for (const question of questions) {
    if (!messagesByCollection[question.scrape.id]) {
      messagesByCollection[question.scrape.id] = {
        id: question.scrape.id,
        count: 0,
        title: question.scrape.title ?? question.scrape.id,
      };
    }
    messagesByCollection[question.scrape.id].count++;
  }

  const customers = await prisma.user.findMany({
    where: {
      plan: {
        is: {
          status: "ACTIVE",
          planId: {
            not: PLAN_FREE.id,
          },
          subscriptionId: {
            not: "custom",
          },
        },
      },
    },
  });

  const addOnMrr =
    customers.filter((c) => c.plan?.brandRemoval?.subscriptionId).length * 10;

  const mrr =
    addOnMrr +
    customers.reduce((acc, customer) => {
      return acc + planMap[customer.plan?.planId ?? PLAN_FREE.id].price;
    }, 0);

  const sortedCollections = Object.values(messagesByCollection).sort(
    (a, b) => b.count - a.count
  );
  const collectionsIconString = sortedCollections
    .map((collection) => collectionIcons[collection.id] ?? "❓")
    .join("");

  res.json({
    mrr,
    counts: {
      today: {
        questions: questions.length,
        answers,
        messagesByCollection,
        messageCollections: Object.values(messagesByCollection).length,
        collectionsIconString,
      },
      customers: customers.length,
    },
  });
});

export default router;
