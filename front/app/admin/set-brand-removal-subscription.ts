import { prisma } from "@packages/common/prisma";
import { redirect } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import type { Route } from "./+types/set-brand-removal-subscription";
import { adminEmails } from "./emails";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  if (!adminEmails.includes(user!.email)) {
    throw redirect("/app");
  }

  const url = new URL(request.url);
  const subscriptionId = url.searchParams.get("subscriptionId");
  const email = url.searchParams.get("email");

  if (!subscriptionId || !email) {
    return new Response(
      JSON.stringify({
        error: "subscriptionId and email query parameters are required",
      }),
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

  const currentPlan = targetUser.plan;

  if (!currentPlan) {
    return new Response(
      JSON.stringify({ error: "User does not have a plan set" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  await prisma.user.update({
    where: { email },
    data: {
      plan: {
        ...currentPlan,
        brandRemoval: {
          subscriptionId,
        },
      },
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: "Brand removal subscription updated",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
