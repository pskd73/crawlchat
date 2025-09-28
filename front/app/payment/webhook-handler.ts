import { prisma } from "libs/prisma";
import type { PaymentGateway } from "./gateway";
import { activatePlan, PLAN_FREE, resetCredits } from "libs/user-plan";

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

    if (
      webhook.paymentId &&
      webhook.metadata?.datafastVisitorId &&
      webhook.paymentAmount &&
      webhook.paymentCurrency
    ) {
      const res = await fetch("https://datafa.st/api/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: webhook.paymentAmount / 100,
          currency: webhook.paymentCurrency,
          transaction_id: webhook.paymentId,
          datafast_visitor_id: webhook.metadata.datafast_visitor_id,
        }),
      });

      if (!res.ok) {
        console.error(
          "Error sending payment to Datafast",
          res.statusText,
          await res.text()
        );
      }
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

    if (webhook.plan && webhook.type === "renewed") {
      await resetCredits(user.id, webhook.plan.id);

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
