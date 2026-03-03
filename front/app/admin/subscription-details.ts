import { prisma } from "@packages/common/prisma";
import { redirect } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { getPaymentGateway } from "~/payment/factory";
import type { Route } from "./+types/subscription-details";
import { adminEmails } from "./emails";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  if (!adminEmails.includes(user!.email)) {
    throw redirect("/app");
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.toLowerCase();

  if (!email) {
    return new Response(
      JSON.stringify({ error: "email query parameter is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!targetUser) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const subscriptionId = targetUser.plan?.subscriptionId;
  if (!subscriptionId) {
    return new Response(
      JSON.stringify({ error: "User has no subscriptionId" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const gateway = getPaymentGateway(targetUser.plan!.provider);
  if (!gateway) {
    return new Response(
      JSON.stringify({ error: "Unsupported plan provider" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const subscription = await gateway.getSubscription(subscriptionId);

  return new Response(
    JSON.stringify({
      email,
      provider: targetUser.plan!.provider,
      subscriptionId,
      subscription,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
