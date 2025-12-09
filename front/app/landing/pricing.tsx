import {
  PLAN_FREE,
  PLAN_HOBBY,
  PLAN_HOBBY_YEARLY,
  PLAN_PRO,
  PLAN_PRO_YEARLY,
  PLAN_STARTER,
  PLAN_STARTER_YEARLY,
} from "libs/user-plan";
import {
  Container,
  CustomTestimonials,
  FAQ,
  Pricing,
  PricingFeatures,
} from "./page";
import { makeMeta } from "~/meta";

export function meta() {
  return makeMeta({
    title: "Pricing - CrawlChat",
    description:
      "Make AI chatbot from your documentation that handles your support queries. Embed it in your website, Discord, or Slack.",
  });
}

export async function loader() {
  return {
    freePlan: PLAN_FREE,
    starterPlan: PLAN_STARTER,
    proPlan: PLAN_PRO,
    hobbyPlan: PLAN_HOBBY,
    starterYearlyPlan: PLAN_STARTER_YEARLY,
    proYearlyPlan: PLAN_PRO_YEARLY,
    hobbyYearlyPlan: PLAN_HOBBY_YEARLY,
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

      <CustomTestimonials />

      <Container>
        <FAQ />
      </Container>
    </>
  );
}
