import cn from "@meltdownjs/cn";
import { planMap, topupPlans } from "@packages/common/user-plan";
import { useEffect, useRef, useState } from "react";
import { TbMessagePlus } from "react-icons/tb";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/topup";
import { getAuthUser } from "./auth/middleware";
import { Page } from "./components/page";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "./components/settings-section";
import { makeMeta } from "./meta";
import { getPaymentGateway } from "./payment/factory";
import { productIdTopupMap } from "./payment/gateway-dodo";

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
    topupPlans: topupPlans.map((plan) => ({
      ...plan,
      purchaseUrl: `/checkout/${productIdTopupMap[Number(plan.id)]}`,
    })),
  };
}

export function meta() {
  return makeMeta({
    title: "Topup Credits - CrawlChat",
  });
}

export default function TopupPage() {
  const { topupPlans } = useLoaderData<typeof loader>();
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
