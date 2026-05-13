import {
  addCreditTransaction,
  clearBalance,
  getTotal,
} from "@packages/common/credit-transaction";
import { PLAN_FREE, planMap } from "@packages/common/plans";
import { prisma } from "@packages/common/prisma";
import { activatePlan } from "@packages/common/user-plan";
import type { PaymentGateway } from "./gateway";

async function getCreditsToClear(userId: string) {
  const latestSubscriptionTxn = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      purpose: "message",
      type: "subscription",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!latestSubscriptionTxn) {
    return 0;
  }

  const subscriptionCredits = latestSubscriptionTxn.credits;
  const usageDebitsSum = await getTotal(
    userId,
    "message",
    -1,
    latestSubscriptionTxn.createdAt
  );

  return Math.max(0, subscriptionCredits + usageDebitsSum);
}

export async function handleWebhook(request: Request, gateway: PaymentGateway) {
  const body = await request.text();

  const webhook = await gateway.validateWebhookRequest(body, request.headers);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: webhook.email }, { billingEmail: webhook.email }],
    },
  });

  if (!user) {
    return Response.json({ message: "User not found" }, { status: 400 });
  }

  if (webhook.webhookType === "topup") {
    await addCreditTransaction(
      user.id,
      "topup",
      "message",
      "Topup",
      webhook.credits
    );
    return Response.json({ message: "Added topup" });
  }

  if (webhook.plan && webhook.type === "created") {
    await clearBalance(
      user.id,
      "message",
      "Clear credits on subscription start"
    );

    await activatePlan(user.id, webhook.plan, {
      provider: gateway.provider,
      subscriptionId: webhook.subscriptionId,
      activatedAt: webhook.eventCreatedAt ?? undefined,
    });

    await addCreditTransaction(
      user.id,
      "subscription",
      "message",
      "Subscription credits",
      webhook.plan.credits.messages
    );

    return Response.json({ message: "Activated subscription plan" });
  }

  if (
    webhook.plan &&
    (webhook.type === "cancelled" || webhook.type === "expired")
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: {
          update: {
            planId: PLAN_FREE.id,
            status: "EXPIRED",
            limits: PLAN_FREE.limits,
          },
        },
      },
    });

    await clearBalance(user.id, "message", "Expired credits");

    return Response.json({ message: "Expired and cleared monthly credits" });
  }

  if (webhook.type === "renewed" && webhook.eventCreatedAt) {
    const plan = webhook.plan || planMap[user.plan.planId];

    const creditsToClear = await getCreditsToClear(user.id);

    if (creditsToClear > 0) {
      await addCreditTransaction(
        user.id,
        "expired",
        "message",
        "Monthly reset",
        -creditsToClear
      );
    }

    await addCreditTransaction(
      user.id,
      "subscription",
      "message",
      "Subscription credits",
      plan.credits.messages
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: {
          update: {
            creditsResetAt: webhook.eventCreatedAt,
          },
        },
      },
    });

    return Response.json({ message: "Reset monthly credits" });
  }

  return Response.json({ message: "Default response" });
}
