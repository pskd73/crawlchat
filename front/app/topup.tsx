import { planMap } from "@packages/common/user-plan";
import type { Route } from "./+types/topup";
import { getAuthUser } from "./auth/middleware";
import { getPaymentGateway } from "./payment/factory";
import { makeMeta } from "./meta";
import { Page } from "./components/page";
import { TbMessagePlus } from "react-icons/tb";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "./components/settings-section";
import { useEffect, useRef, useState } from "react";
import cn from "@meltdownjs/cn";

const topupPlans = [
  {
    id: "1000",
    credits: 1000,
    price: 18,
    purchaseUrl:
      "https://checkout.dodopayments.com/buy/pdt_Bd3tewxGoSpthFEmhNq64?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing",
  },
  {
    id: "3000",
    credits: 3000,
    price: 52,
    purchaseUrl:
      "https://checkout.dodopayments.com/buy/pdt_0NZB5fBcjnMwFyjqWxLXG?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing",
  },
  {
    id: "5000",
    credits: 5000,
    price: 84,
    purchaseUrl:
      "https://checkout.dodopayments.com/buy/pdt_0NWpIy5atI7vpkeWe1AVP?quantity=1&redirect_url=https://crawlchat.app%2Fprofile%23billing",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  let subscription = null;
  if (user!.plan?.subscriptionId) {
    const gateway = getPaymentGateway(user!.plan.provider);
    if (gateway) {
      subscription = await gateway.getSubscription(user!.plan.subscriptionId);
    }
  }

  const plan = planMap[user!.plan!.planId];

  return {
    user: user!,
    subscription,
    plan,
  };
}

export function meta() {
  return makeMeta({
    title: "Topup Credits - CrawlChat",
  });
}

export default function TopupPage() {
  const [confirm, setConfirm] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (confirm) {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }

      timeout.current = setTimeout(() => {
        setConfirm(false);
      }, 3000);
    }
  }, [confirm]);

  return (
    <Page title="Topup Credits" icon={<TbMessagePlus />}>
      <SettingsSectionProvider>
        <SettingsContainer>
          <SettingsSection
            id="topup"
            title="Topup Credits"
            description="Topup your message credits to continue using CrawlChat."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topupPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    "flex flex-col gap-4",
                    "border border-base-300 rounded-box p-4"
                  )}
                >
                  {plan.credits} Credits
                  <div>
                    <a
                      href={plan.purchaseUrl}
                      className="btn btn-primary btn-soft"
                    >
                      Topup for ${plan.price}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </SettingsSection>
        </SettingsContainer>
      </SettingsSectionProvider>
    </Page>
  );
}
