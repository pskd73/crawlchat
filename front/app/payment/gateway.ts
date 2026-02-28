import type { UserPlanProvider } from "@packages/common/prisma";
import type { Plan } from "@packages/common/user-plan";

export type PaymentGatewaySubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "on-trial";

export type PaymentGatewayWebhookType =
  | "created"
  | "cancelled"
  | "expired"
  | "renewed"
  | "payment_success";

export type PaymentGatewaySubscriptionWebhook = {
  webhookType: "subscription";
  email: string;
  type: PaymentGatewayWebhookType;
  subscriptionStatus?: PaymentGatewaySubscriptionStatus;
  productId?: string;
  plan?: Plan;
  subscriptionId: string;
  metadata?: Record<string, string> | null;
  paymentId?: string | null;
  paymentAmount?: number | null;
  paymentCurrency?: string | null;
};

export type PaymentGatewayTopupWebhook = {
  webhookType: "topup";
  email: string;
  productId: string;
  credits: number;
};

export type PaymentGatewayWebhook =
  | PaymentGatewaySubscriptionWebhook
  | PaymentGatewayTopupWebhook;

export type PaymentGatewaySubscription = {
  id: string;
};

export interface PaymentGateway {
  provider: UserPlanProvider;
  validateWebhookRequest: (
    body: string,
    headers: Headers
  ) => Promise<PaymentGatewayWebhook>;
  getSubscription: (
    subscriptionId: string
  ) => Promise<PaymentGatewaySubscription>;
  getPaymentLink: (
    planId: string,
    options?: {
      name?: string | null;
      email?: string | null;
      referralId?: string | null;
      meta?: Record<string, string> | null;
    }
  ) => Promise<{ url: string }>;
  getCustomerPortalUrl: (subscriptionId: string) => Promise<{ url: string }>;
}
