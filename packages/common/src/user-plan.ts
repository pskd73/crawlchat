import { prisma } from "./prisma";
import { addCreditTransaction } from "./credit-transaction";
import type {
  PlanCredits,
  PlanLimits,
  PlanType,
  User,
  UserPlan,
  UserPlanProvider,
} from "@prisma/client";

type PlanResetType = "monthly" | "yearly" | "one-time" | "on-payment";
type PlanCategory = "BASE" | "SERVICE" | "TOPUP";

export type Plan = {
  id: string;
  name: string;
  price: number;
  type: PlanType;
  category: PlanCategory;
  credits: PlanCredits;
  resetType: PlanResetType;
  limits: PlanLimits;
  description?: string;
  checkoutLink?: string;
  popular?: boolean;
};

export const PLAN_FREE: Plan = {
  id: "free",
  name: "Free",
  price: 0,
  type: "ONE_TIME",
  credits: {
    scrapes: 40,
    messages: 20,
  },
  limits: {
    scrapes: 1,
    teamMembers: 1,
    pages: 40,
  },
  resetType: "one-time",
  category: "BASE",
};

export const PLAN_HOBBY: Plan = {
  id: "hobby",
  name: "Hobby",
  price: 21,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 2000,
    messages: 800,
  },
  limits: {
    scrapes: 1,
    teamMembers: 1,
    pages: 2000,
  },
  resetType: "monthly",
  category: "BASE",
};

export const PLAN_STARTER: Plan = {
  id: "starter",
  name: "Starter",
  price: 45,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 5000,
    messages: 2000,
  },
  limits: {
    scrapes: 2,
    teamMembers: 2,
    pages: 5000,
  },
  resetType: "monthly",
  category: "BASE",
};

export const PLAN_PRO: Plan = {
  id: "pro",
  name: "Pro",
  price: 99,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 14000,
    messages: 7000,
  },
  limits: {
    scrapes: 3,
    teamMembers: 5,
    pages: 14000,
  },
  resetType: "monthly",
  category: "BASE",
};

export const PLAN_STARTER_YEARLY: Plan = {
  id: "starter-yearly",
  name: "Starter",
  price: 450,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 5000 * 12,
    messages: 2000 * 12,
  },
  limits: {
    scrapes: 2,
    teamMembers: 2,
    pages: 5000,
  },
  resetType: "yearly",
  category: "BASE",
};

export const PLAN_PRO_YEARLY: Plan = {
  id: "pro-yearly",
  name: "Pro",
  price: 990,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 14000 * 12,
    messages: 7000 * 12,
  },
  limits: {
    scrapes: 3,
    teamMembers: 5,
    pages: 14000,
  },
  resetType: "yearly",
  category: "BASE",
};

export const PLAN_HOBBY_YEARLY: Plan = {
  id: "hobby-yearly",
  name: "Hobby",
  price: 210,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 2000 * 12,
    messages: 800 * 12,
  },
  limits: {
    scrapes: 1,
    teamMembers: 1,
    pages: 2000,
  },
  resetType: "yearly",
  category: "BASE",
};

export const PLAN_LAUNCH: Plan = {
  id: "launch",
  name: "Launch",
  price: 29,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 0,
    messages: 800,
  },
  limits: {
    scrapes: 1,
    teamMembers: 1,
    pages: 2000,
  },
  resetType: "monthly",
  category: "BASE",
  description: "Get started with CrawlChat",
  checkoutLink:
    "https://checkout.dodopayments.com/buy/pdt_0NVYGTDXnMxIdEJ8TCPQR?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing",
};

export const PLAN_LAUNCH_YEARLY: Plan = {
  id: "launch-yearly",
  name: "Launch",
  price: 290,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 0,
    messages: 800 * 12,
  },
  limits: {
    scrapes: 1,
    teamMembers: 1,
    pages: 2000,
  },
  resetType: "yearly",
  category: "BASE",
  description: "Get started with CrawlChat",
  checkoutLink:
    "https://checkout.dodopayments.com/buy/pdt_0NVYGgRC1GaW0ogaIngH7?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing",
};

export const PLAN_GROW: Plan = {
  id: "grow",
  name: "Grow",
  price: 69,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 0,
    messages: 2000,
  },
  limits: {
    scrapes: 2,
    teamMembers: 2,
    pages: 5000,
  },
  resetType: "monthly",
  category: "BASE",
  description: "For growing teams and projects",
  checkoutLink:
    "https://checkout.dodopayments.com/buy/pdt_0NVYGpvQOVQSs6XD7nWFg?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing",
  popular: true,
};

export const PLAN_GROW_YEARLY: Plan = {
  id: "grow-yearly",
  name: "Grow",
  price: 690,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 0,
    messages: 2000 * 12,
  },
  limits: {
    scrapes: 2,
    teamMembers: 2,
    pages: 5000,
  },
  resetType: "yearly",
  category: "BASE",
  description: "For growing teams and projects",
  checkoutLink:
    "https://checkout.dodopayments.com/buy/pdt_0NVYGypdaV3R7ZKvSkJvd?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing",
  popular: true,
};

export const PLAN_ACCELERATE: Plan = {
  id: "accelerate",
  name: "Accelerate",
  price: 229,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 0,
    messages: 7000,
  },
  limits: {
    scrapes: 3,
    teamMembers: 5,
    pages: 14000,
  },
  resetType: "monthly",
  category: "BASE",
  description: "For teams that need more power",
  checkoutLink:
    "https://checkout.dodopayments.com/buy/pdt_0NVYHBbhSr7JUmQtMcTiV?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing",
};

export const PLAN_ACCELERATE_YEARLY: Plan = {
  id: "accelerate-yearly",
  name: "Accelerate",
  price: 2290,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 0,
    messages: 7000 * 12,
  },
  limits: {
    scrapes: 3,
    teamMembers: 5,
    pages: 14000,
  },
  resetType: "yearly",
  category: "BASE",
  description: "For teams that need more power",
  checkoutLink:
    "https://checkout.dodopayments.com/buy/pdt_0NVYHOktAtrFNDT4qYVhb?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing",
};

export const planMap: Record<string, Plan> = {
  [PLAN_FREE.id]: PLAN_FREE,
  [PLAN_STARTER.id]: PLAN_STARTER,
  [PLAN_PRO.id]: PLAN_PRO,
  [PLAN_HOBBY.id]: PLAN_HOBBY,
  [PLAN_STARTER_YEARLY.id]: PLAN_STARTER_YEARLY,
  [PLAN_PRO_YEARLY.id]: PLAN_PRO_YEARLY,
  [PLAN_HOBBY_YEARLY.id]: PLAN_HOBBY_YEARLY,

  [PLAN_LAUNCH.id]: PLAN_LAUNCH,
  [PLAN_LAUNCH_YEARLY.id]: PLAN_LAUNCH_YEARLY,
  [PLAN_GROW.id]: PLAN_GROW,
  [PLAN_GROW_YEARLY.id]: PLAN_GROW_YEARLY,
  [PLAN_ACCELERATE.id]: PLAN_ACCELERATE,
  [PLAN_ACCELERATE_YEARLY.id]: PLAN_ACCELERATE_YEARLY,
};

export const allActivePlans: Plan[] = [
  PLAN_LAUNCH,
  PLAN_LAUNCH_YEARLY,
  PLAN_GROW,
  PLAN_GROW_YEARLY,
  PLAN_ACCELERATE,
  PLAN_ACCELERATE_YEARLY,
];

export const activatePlan = async (
  userId: string,
  plan: Plan,
  {
    provider,
    subscriptionId,
    orderId,
    expiresAt,
  }: {
    provider: UserPlanProvider;
    subscriptionId?: string;
    orderId?: string;
    expiresAt?: Date;
  }
) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: {
        planId: plan.id,
        provider,
        type: plan.type,
        subscriptionId,
        orderId,
        status: "ACTIVE",
        credits: plan.credits,
        limits: plan.limits,
        expiresAt,
        activatedAt: new Date(),
      },
    },
  });
};

export const consumeCredits = async (
  userId: string,
  type: "messages" | "scrapes",
  credits: number,
  messageId?: string,
  amount?: number,
  description?: string
) => {
  if (type !== "messages") {
    throw new Error("Only message credits are supported for transactions");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: {
        upsert: {
          set: {
            credits: PLAN_FREE.credits,
            planId: PLAN_FREE.id,
            type: PLAN_FREE.type,
            provider: "CUSTOM",
            status: "ACTIVE",
            activatedAt: new Date(),
          },
          update: {
            credits: {
              upsert: {
                set: {
                  messages: PLAN_FREE.credits.messages,
                  scrapes: PLAN_FREE.credits.scrapes,
                },
                update: {
                  [type]: { decrement: credits },
                },
              },
            },
          },
        },
      },
    },
  });

  await addCreditTransaction(
    userId,
    "usage",
    "message",
    description || "Message consumed",
    -credits,
    amount,
    messageId
  );
};

export const resetCredits = async (userId: string, planId?: string) => {
  const plan = planMap[planId ?? PLAN_FREE.id];

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: {
        upsert: {
          set: {
            credits: plan.credits,
            planId: plan.id,
            type: plan.type,
            provider: "CUSTOM",
            status: "ACTIVE",
            activatedAt: new Date(),
          },
          update: { credits: plan.credits, creditsResetAt: new Date() },
        },
      },
    },
  });
};

export const addTopup = async (
  userId: string,
  plan: Plan,
  {
    provider,
    orderId,
  }: {
    provider?: UserPlanProvider;
    orderId?: string;
  }
) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      topups: {
        push: {
          planId: plan.id,
          credits: plan.credits,
          orderId,
          createdAt: new Date(),
          provider,
        },
      },
    },
  });
};

export async function hasEnoughCredits(
  userId: string,
  type: "messages" | "scrapes",
  options?: { amount?: number; alert?: { scrapeId: string; token: string } }
) {
  const amount = options?.amount ?? 1;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  const available = user?.plan?.credits?.[type] ?? 0;
  const has = available >= amount;

  if (!has && options?.alert) {
    try {
      const response = await fetch(`${process.env.FRONT_URL}/email-alert`, {
        method: "POST",
        body: JSON.stringify({
          intent: "low-credits",
          scrapeId: options.alert.scrapeId,
          creditType: type,
          amount,
        }),
        headers: {
          Authorization: `Bearer ${options.alert.token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Error from request. ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to send low credits alert", error);
    }
  }

  return has;
}

export async function getLimits(user: User) {
  if (user.plan?.limits) return user.plan.limits;

  const planId = user.plan?.planId ?? PLAN_FREE.id;
  const plan = planMap[planId];
  return plan.limits;
}

export async function isPaidPlan(userPlan: UserPlan) {
  const plan = planMap[userPlan.planId];

  if (
    ["SUBSCRIPTION", "ONE_TIME"].includes(plan.type) &&
    userPlan.status === "ACTIVE"
  ) {
    return true;
  }

  return false;
}

export async function getPagesCount(userId: string) {
  const scrapes = await prisma.scrape.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  const result = (await prisma.$runCommandRaw({
    aggregate: "ScrapeItem",
    pipeline: [
      {
        $match: {
          scrapeId: { $in: scrapes.map((s) => ({ $oid: s.id })) },
        },
      },
      {
        $project: {
          embeddingsCount: {
            $cond: {
              if: { $isArray: "$embeddings" },
              then: { $size: "$embeddings" },
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalEmbeddings: { $sum: "$embeddingsCount" },
        },
      },
    ],
    cursor: {},
  })) as any;

  return result.cursor?.firstBatch?.[0]?.totalEmbeddings || 0;
}
