import { prisma } from "./prisma";
import { PlanCredits, PlanType, UserPlanProvider } from "@prisma/client";

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
};

export const PLAN_FREE: Plan = {
  id: "free",
  name: "Free",
  price: 0,
  type: "ONE_TIME",
  credits: {
    messages: 100,
    scrapes: 100,
  },
  resetType: "one-time",
  category: "BASE",
};

export const PLAN_STARTER: Plan = {
  id: "starter",
  name: "Starter",
  price: 29,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 3000,
    messages: 15000,
  },
  resetType: "monthly",
  category: "BASE",
};

export const PLAN_PRO: Plan = {
  id: "pro",
  name: "Pro",
  price: 79,
  type: "SUBSCRIPTION",
  credits: {
    scrapes: 10000,
    messages: 50000,
  },
  resetType: "monthly",
  category: "BASE",
};

export const planMap: Record<string, Plan> = {
  [PLAN_FREE.id]: PLAN_FREE,
  [PLAN_STARTER.id]: PLAN_STARTER,
  [PLAN_PRO.id]: PLAN_PRO,
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
