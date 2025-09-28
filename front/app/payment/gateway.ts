import type { UserPlanProvider } from "libs/prisma";
import type { Plan } from "libs/user-plan";

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

export type PaymentGatewayWebhook = {
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

export type PaymentGatewaySubscription = {
  id: string;
  customerPortalUrl: string;
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
}
