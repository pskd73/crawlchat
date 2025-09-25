import { prisma } from "./prisma";
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
  },
  resetType: "monthly",
  category: "BASE",
};

export const planMap: Record<string, Plan> = {
  [PLAN_FREE.id]: PLAN_FREE,
  [PLAN_STARTER.id]: PLAN_STARTER,
  [PLAN_PRO.id]: PLAN_PRO,
  [PLAN_HOBBY.id]: PLAN_HOBBY,
};

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
  amount: number
) => {
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
                  [type]: { decrement: amount },
                },
              },
            },
          },
        },
      },
    },
  });
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
          update: { credits: plan.credits },
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
