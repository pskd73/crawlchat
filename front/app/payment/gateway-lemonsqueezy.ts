import {
  PLAN_HOBBY,
  PLAN_PRO,
  PLAN_STARTER,
  type Plan,
} from "@packages/common/user-plan";
import crypto from "crypto";
import type { PaymentGateway, PaymentGatewayWebhookType } from "./gateway";

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

    if (type !== "renewed" && !plan) {
      throw new Error(JSON.stringify({ error: "Plan not found", status: 401 }));
    }

    return {
      webhookType: "subscription",
      email,
      type,
      productId,
      plan,
      subscriptionId,
    };
  },

  getSubscription: async (subscriptionId) => {
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
      {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        },
      }
    );

    const json = await res.json();

    return {
      id: json.data.id,
    };
  },

  getPaymentLink: async (productId) => {
    return { url: `https://beestack.lemonsqueezy.com/buy/${productId}` };
  },

  getCustomerPortalUrl: async (subscriptionId) => {
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
      {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        },
      }
    );

    const json = await res.json();

    return { url: json.data.attributes.urls.customer_portal };
  },
};
