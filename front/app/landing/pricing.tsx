import { allActivePlans, topupPlans } from "@packages/common/user-plan";
import { makeMeta } from "~/meta";
import { planProductIdMap, productIdTopupMap } from "~/payment/gateway-dodo";
import { Container, Pricing, PricingFeatures } from "./page";

export function meta() {
  return makeMeta({
    title: "Pricing - CrawlChat",
    description:
      "Make AI chatbot from your documentation that handles your support queries. Embed it in your website, Discord, or Slack.",
  });
}

export async function loader() {
  const plans = allActivePlans.map((plan) => ({
    ...plan,
    url: `/checkout/${planProductIdMap[plan.id]}`,
  }));

  return {
    plans,
    topupPlans: topupPlans.map((plan) => ({
      ...plan,
      purchaseUrl: `/checkout/${productIdTopupMap[Number(plan.id)]}`,
    })),
  };
}

export default function Landing() {
  return (
    <>
      <Container>
        <Pricing noMarginTop />
      </Container>

      <Container>
        <PricingFeatures />
      </Container>
    </>
  );
}
