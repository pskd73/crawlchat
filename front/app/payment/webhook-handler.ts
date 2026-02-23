import { prisma } from "@packages/common/prisma";
import type { PaymentGateway } from "./gateway";
import {
  activatePlan,
  PLAN_FREE,
  planMap,
  resetCredits,
} from "@packages/common/user-plan";

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
            upsert: {
              set: {
                planId: webhook.plan.id,
                type: webhook.plan.type,
                provider: gateway.provider,
                status: "EXPIRED",
                activatedAt: new Date(),
              },
              update: {
                planId: PLAN_FREE.id,
                status: "EXPIRED",
                limits: PLAN_FREE.limits,
                credits: PLAN_FREE.credits,
              },
            },
          },
        },
      });

      return Response.json({ message: "Updated plan to expired" });
    }

    if (webhook.type === "renewed") {
      if (!user.plan?.planId || !planMap[user.plan.planId]) {
        return Response.json({ message: "Plan not found" }, { status: 400 });
      }

      await resetCredits(user.id, user.plan.planId);

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
