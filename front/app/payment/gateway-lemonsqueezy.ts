import { PLAN_HOBBY, PLAN_PRO, PLAN_STARTER, type Plan } from "libs/user-plan";
import type { PaymentGateway, PaymentGatewayWebhookType } from "./gateway";
import crypto from "crypto";

function validateRequest(headers: Headers, body: string) {
  const xSignature = headers.get("x-signature");
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET as string;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = Buffer.from(hmac.update(body).digest("hex"), "utf8");
  const signature = Buffer.from(
    Array.isArray(xSignature) ? xSignature.join("") : xSignature || "",
    "utf8"
  );

  return crypto.timingSafeEqual(digest, signature);
}

const productIdPlanMap: Record<number, Plan> = {
  "466349": PLAN_STARTER,
  "466350": PLAN_PRO,
  "631865": PLAN_HOBBY,

  // dev
  "632206": PLAN_HOBBY,
};

const typeMap: Record<string, PaymentGatewayWebhookType> = {
  subscription_created: "created",
  subscription_cancelled: "cancelled",
  subscription_expired: "expired",
  subscription_payment_success: "renewed",
};

export const lemonsqueezyGateway: PaymentGateway = {
  provider: "LEMONSQUEEZY",
  validateWebhookRequest: async (body, headers) => {
    if (!validateRequest(headers, body)) {
      throw new Error(
        JSON.stringify({ error: "Invalid request", status: 400 })
      );
    }

    const payload = JSON.parse(body);
    console.log("Received Lemonsqueezy webhook", payload.meta.webhook_id);

    const email = payload.data.attributes.user_email;
    const type = typeMap[payload.meta.event_name];
    const productId = payload.data.attributes.product_id;
    const plan = productIdPlanMap[productId];
    const subscriptionId = payload.data.id;

    if (!plan) {
      throw new Error(JSON.stringify({ error: "Plan not found", status: 401 }));
    }

    return { email, type, productId, plan, subscriptionId };
  },

  getSubscription: async (subscriptionId) => {
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
      {
        headers: {
          Accept: "application/vnd.api+json",
          ContentType: "application/vnd.api+json",
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        },
      }
    );

    const json = await res.json();

    return {
      id: json.data.id,
      customerPortalUrl: json.data.attributes.urls.customer_portal,
    };
  },

  getPaymentLink: async (planId) => {
    if (planId === PLAN_HOBBY.id) {
      return {
        url: "https://beestack.lemonsqueezy.com/buy/19cd8f91-a20d-4563-8557-2325c425d87e",
      };
    }
    if (planId === PLAN_STARTER.id) {
      return {
        url: "https://beestack.lemonsqueezy.com/buy/a13beb2a-f886-4a9a-a337-bd82e745396a",
      };
    }
    if (planId === PLAN_PRO.id) {
      return {
        url: "https://beestack.lemonsqueezy.com/buy/3a487266-72de-492d-8884-335c576f89c0",
      };
    }

    throw new Error("Plan not found");
  },
};
