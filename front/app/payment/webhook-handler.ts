import {
  addCreditTransaction,
  getBalance,
} from "@packages/common/credit-transaction";
import { prisma } from "@packages/common/prisma";
import { activatePlan, PLAN_FREE, planMap } from "@packages/common/user-plan";
import type { PaymentGateway } from "./gateway";

export async function handleWebhook(request: Request, gateway: PaymentGateway) {
  const body = await request.text();

  try {
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

    if (webhook.type === "created" && webhook.plan) {
      await activatePlan(user.id, webhook.plan, {
        provider: gateway.provider,
        subscriptionId: webhook.subscriptionId,
      });

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

      const balance = await getBalance(user.id, "message");
      if (balance > PLAN_FREE.credits.messages) {
        const creditsExpired = balance - PLAN_FREE.credits.messages;
        await addCreditTransaction(
          user.id,
          "expired",
          "message",
          "Expired credits",
          creditsExpired
        );
      }

      return Response.json({ message: "Updated plan to expired" });
    }

    if (webhook.type === "renewed") {
      if (!user.plan?.planId || !planMap[user.plan.planId]) {
        return Response.json({ message: "Plan not found" }, { status: 400 });
      }

      return Response.json({ message: "Updated plan to active" });
    }

    return Response.json({ message: "Default response" });
  } catch (error: any) {
    let errorJson: any = error.message;
    try {
      errorJson = JSON.parse(error.message as string);
    } catch {}
    return Response.json(
      { error: errorJson?.error ?? error.message ?? error },
      { status: errorJson?.status ?? 400 }
    );
  }
}
