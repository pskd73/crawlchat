import { allActivePlans } from "@packages/common/user-plan";
import { makeMeta } from "~/meta";
import { topupPlans } from "~/topup";
import { Container, Pricing, PricingFeatures } from "./page";

export function meta() {
  return makeMeta({
    title: "Pricing - CrawlChat",
    description:
      "Make AI chatbot from your documentation that handles your support queries. Embed it in your website, Discord, or Slack.",
  });
}

export async function loader() {
  return {
    plans: allActivePlans,
    topupPlans,
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
