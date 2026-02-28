import {
  PLAN_ACCELERATE,
  PLAN_ACCELERATE_YEARLY,
  PLAN_GROW,
  PLAN_GROW_YEARLY,
  PLAN_HOBBY,
  PLAN_HOBBY_YEARLY,
  PLAN_LAUNCH,
  PLAN_LAUNCH_YEARLY,
  PLAN_PRO,
  PLAN_PRO_YEARLY,
  PLAN_STARTER,
  PLAN_STARTER_YEARLY,
  type Plan,
} from "@packages/common/user-plan";
import type { PaymentGateway, PaymentGatewayWebhookType } from "./gateway";
import { Webhook } from "standardwebhooks";
import { DodoPayments } from "dodopayments";

async function validateRequest(headers: Headers, body: string) {
  const webhook = new Webhook(process.env.DODO_WEBHOOK_SECRET!);

  const webhookHeaders = {
    "webhook-id": headers.get("webhook-id") as string,
    "webhook-signature": headers.get("webhook-signature") as string,
    "webhook-timestamp": headers.get("webhook-timestamp") as string,
  };

  await webhook.verify(body, webhookHeaders);

  return true;
}

export const productIdPlanMap: Record<string, Plan> = {
  pdt_IcrpqSx48qoCenz4lnLi1: PLAN_HOBBY,
  pdt_vgCVfRAaCT99LM1Dfk5qF: PLAN_STARTER,
  pdt_P68hLo9a0At8cgn4WbzBe: PLAN_PRO,
  pdt_uAHyWAsgys9afUnn9NjAM: PLAN_STARTER_YEARLY,
  pdt_5dCrGhvBslGdT2fIxQjuy: PLAN_PRO_YEARLY,
  pdt_boJZHUL9XLprkefonKtuT: PLAN_HOBBY_YEARLY,

  pdt_0NVYGTDXnMxIdEJ8TCPQR: PLAN_LAUNCH,
  pdt_0NVYGgRC1GaW0ogaIngH7: PLAN_LAUNCH_YEARLY,
  pdt_0NVYGpvQOVQSs6XD7nWFg: PLAN_GROW,
  pdt_0NVYGypdaV3R7ZKvSkJvd: PLAN_GROW_YEARLY,
  pdt_0NVYHBbhSr7JUmQtMcTiV: PLAN_ACCELERATE,
  pdt_0NVYHOktAtrFNDT4qYVhb: PLAN_ACCELERATE_YEARLY,

  // dev
  pdt_CDgenxMUiAKjzBDVROTDr: PLAN_STARTER,
  pdt_7tO1wC3NRoQsCXh8oIFEi: PLAN_PRO,
  pdt_lpFZp5sBEu5bzKwCbE5Y8: PLAN_HOBBY,
};

export const topupProductIdMap: Record<string, number> = {
  pdt_Bd3tewxGoSpthFEmhNq64: 1000,
  pdt_0NZB5fBcjnMwFyjqWxLXG: 3000,
  pdt_0NWpIy5atI7vpkeWe1AVP: 8000,

  // dev
  pdt_0NZUPFnIVqj3VLPvp5NNW: 1000,
};

export const planProductIdMap: Record<string, string> = {
  [PLAN_HOBBY.id]: "pdt_IcrpqSx48qoCenz4lnLi1",
  [PLAN_STARTER.id]: "pdt_vgCVfRAaCT99LM1Dfk5qF",
  [PLAN_PRO.id]: "pdt_P68hLo9a0At8cgn4WbzBe",
  [PLAN_STARTER_YEARLY.id]: "pdt_uAHyWAsgys9afUnn9NjAM",
  [PLAN_PRO_YEARLY.id]: "pdt_5dCrGhvBslGdT2fIxQjuy",
  [PLAN_HOBBY_YEARLY.id]: "pdt_boJZHUL9XLprkefonKtuT",

  [PLAN_LAUNCH.id]: "pdt_0NVYGTDXnMxIdEJ8TCPQR",
  [PLAN_LAUNCH_YEARLY.id]: "pdt_0NVYGgRC1GaW0ogaIngH7",
  [PLAN_GROW.id]: "pdt_0NVYGpvQOVQSs6XD7nWFg",
  [PLAN_GROW_YEARLY.id]: "pdt_0NVYGypdaV3R7ZKvSkJvd",
  [PLAN_ACCELERATE.id]: "pdt_0NVYHBbhSr7JUmQtMcTiV",
  [PLAN_ACCELERATE_YEARLY.id]: "pdt_0NVYHOktAtrFNDT4qYVhb",

  // [PLAN_HOBBY.id]: "pdt_lpFZp5sBEu5bzKwCbE5Y8",
  // [PLAN_STARTER.id]: "pdt_CDgenxMUiAKjzBDVROTDr",
  // [PLAN_PRO.id]: "pdt_7tO1wC3NRoQsCXh8oIFEi",
};

const typeMap: Record<string, PaymentGatewayWebhookType> = {
  "subscription.active": "created",
  "subscription.cancelled": "cancelled",
  "subscription.expired": "expired",
  "subscription.renewed": "renewed",
  "payment.succeeded": "payment_success",
};

export function getDodoClient() {
  return new DodoPayments({
    bearerToken: process.env.DODO_API_KEY!,
    environment:
      (process.env.DODO_ENVIRONMENT as "live_mode" | "test_mode" | undefined) ??
      "live_mode",
  });
}

async function getCustomer(email: string) {
  const list = await getDodoClient().customers.list({
    email,
  });
  return list.items[0];
}

export const dodoGateway: PaymentGateway = {
  provider: "DODO",
  validateWebhookRequest: async (body, headers) => {
    if (!validateRequest(headers, body)) {
      throw new Error(
        JSON.stringify({ error: "Invalid request", status: 400 })
      );
    }

    const payload = JSON.parse(body);
    console.log("Dodo webhook", headers.get("webhook-id"));

    if (payload.data.product_cart && payload.data.product_cart.length > 0) {
      const productId = payload.data.product_cart[0].product_id;
      return {
        webhookType: "topup",
        email: payload.data.customer.email,
        type: "payment_success",
        productId,
        credits: topupProductIdMap[productId],
      };
    }

    const productId = payload.data.product_id;
    const email = payload.data.customer.email;
    const eventName = typeMap[payload.type];
    const plan = productIdPlanMap[productId];
    const subscriptionId = payload.data.subscription_id;
    const metadata = payload.data.metadata;
    const paymentId = payload.data.payment_id;
    const paymentAmount = payload.data.total_amount;
    const paymentCurrency = payload.data.currency;

    return {
      webhookType: "subscription",
      email,
      type: eventName,
      productId,
      plan,
      subscriptionId,
      metadata,
      paymentId,
      paymentAmount,
      paymentCurrency,
    };
  },

  getSubscription: async (subscriptionId) => {
    return {
      id: subscriptionId,
    };
  },

  async getPaymentLink(planId, options) {
    const body: DodoPayments.CheckoutSessions.CheckoutSessionCreateParams = {
      product_cart: [
        {
          product_id: planProductIdMap[planId],
          quantity: 1,
        },
      ],
    };
    if (options?.referralId) {
      body.metadata = {
        affonso_referral: options.referralId,
      };
    }
    if (options?.meta) {
      body.metadata = {
        ...body.metadata,
        ...options.meta,
      };
    }
    if (options?.email) {
      const customer = await getCustomer(options.email);
      if (customer) {
        body.customer = {
          customer_id: customer.customer_id,
        };
      } else {
        body.customer = {
          name: options.name ?? "",
          email: options.email ?? "",
        };
      }
    }

    const checkoutSession = await getDodoClient().checkoutSessions.create(body);

    return { url: checkoutSession.checkout_url as string };
  },

  getCustomerPortalUrl: async (subscriptionId) => {
    const client = getDodoClient();
    const subscription = await client.subscriptions.retrieve(subscriptionId);
    const session = await client.customers.customerPortal.create(
      subscription.customer.customer_id
    );
    return { url: session.link };
  },
};
