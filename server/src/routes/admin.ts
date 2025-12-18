import { Router } from "express";
import { prisma } from "../prisma";
import { adminAuthenticate } from "../auth";
import { PLAN_FREE, planMap } from "libs/user-plan";

const router = Router();

router.use(adminAuthenticate);

const collectionIcons = "😵🤠🥸😎😱😇🤐🤢🤒😷😈💀🤡"

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
      count: number;
      title: string;
      icon: string;
    }
  > = {};
  for (const question of questions) {
    if (!messagesByCollection[question.scrape.id]) {
      messagesByCollection[question.scrape.id] = {
        count: 0,
        title: question.scrape.title ?? question.scrape.id,
        icon: "🌐",
      };
    }
    messagesByCollection[question.scrape.id].count++;
  }

  const customers = await prisma.user.findMany({
    where: {
      plan: {
        isNot: {
          planId: PLAN_FREE.id,
        },
      },
      email: {
        not: "pramodkumar.damam73@gmail.com",
      },
    },
  });

  const mrr = customers.reduce((acc, customer) => {
    return acc + planMap[customer.plan?.planId ?? PLAN_FREE.id].price;
  }, 0);

  res.json({
    mrr,
    counts: {
      today: {
        questions: questions.length,
        answers,
        messagesByCollection,
      },
      customers: customers.length,
    },
  });
});

export default router;
