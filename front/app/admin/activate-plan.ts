import { prisma, UserPlanProvider } from "@packages/common/prisma";
import { activatePlan, planMap } from "@packages/common/user-plan";
import { redirect } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import type { Route } from "./+types/update-customer";
import { adminEmails } from "./emails";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  if (!adminEmails.includes(user!.email)) {
    throw redirect("/app");
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const planId = url.searchParams.get("planId");
  const provider = url.searchParams.get("provider");
  const subscriptionId = url.searchParams.get("subscriptionId");

  if (!email || !planId || !provider || !subscriptionId) {
    return new Response(
      JSON.stringify({
        error: "email and planId query parameters are required",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const plan = planMap[planId];

  const emailUser = await prisma.user.findFirstOrThrow({ where: { email } });

  await activatePlan(emailUser.id, plan, {
    provider: provider as UserPlanProvider,
    subscriptionId,
  });

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
