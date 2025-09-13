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
  | "renewed";

export type PaymentGatewayWebhook = {
  email: string;
  type: PaymentGatewayWebhookType;
  subscriptionStatus?: PaymentGatewaySubscriptionStatus;
  productId: string;
  plan: Plan;
  subscriptionId: string;
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
    }
  ) => Promise<{ url: string }>;
}
