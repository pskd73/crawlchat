import { Prisma, prisma } from "@packages/common/prisma";
import { PLAN_FREE, activatePlan, planMap } from "@packages/common/user-plan";
import { sendTeamJoinEmail, sendWelcomeEmail } from "~/email";
import { DodoPayments } from "dodopayments";
import { productIdPlanMap } from "~/payment/gateway-dodo";

export async function signUpNewUser(
  email: string,
  data?: { name?: string; photo?: string }
) {
  email = email.toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email,
        name: data?.name,
        photo: data?.photo,
        plan: {
          planId: PLAN_FREE.id,
          type: PLAN_FREE.type,
          provider: "CUSTOM",
          status: "ACTIVE",
          credits: PLAN_FREE.credits,
          limits: PLAN_FREE.limits,
          activatedAt: new Date(),
        },
        showOnboarding: true,
      },
    });

    const pendingScrapeUsers = await prisma.scrapeUser.findMany({
      where: {
        email: email,
        invited: true,
      },
      include: {
        scrape: true,
      },
    });

    for (const scrapeUser of pendingScrapeUsers) {
      await prisma.scrapeUser.update({
        where: {
          id: scrapeUser.id,
        },
        data: {
          invited: false,
          userId: user.id,
        },
      });

      await sendTeamJoinEmail(
        scrapeUser.email,
        user.email,
        scrapeUser.scrape.title ?? "CrawlChat"
      );
    }

    if (pendingScrapeUsers.length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          showOnboarding: false,
        },
      });
    }

    await sendWelcomeEmail(email);

    if (process.env.DEFAULT_SIGNUP_PLAN_ID) {
      await activatePlan(user.id, planMap[process.env.DEFAULT_SIGNUP_PLAN_ID], {
        provider: "CUSTOM",
        subscriptionId: "default",
      });
    }
  }

  const update: Prisma.UserUpdateInput = {};
  if (data?.photo) {
    update.photo = data.photo;
  }
  if (!user.name && data?.name) {
    update.name = data.name;
  }

  if (Object.keys(update).length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: update,
    });
  }

  try {
    const client = new DodoPayments({
      bearerToken: process.env.DODO_API_KEY!,
      environment: "live_mode",
    });

    const customerList = await client.customers.list({
      email: email,
    });
    const customer = customerList.items[0];

    if (customer) {
      const subscriptions = await client.subscriptions.list({
        customer_id: customer.customer_id,
      });

      const activeSubscription = subscriptions.items.find(
        (sub) => sub.status === "active"
      );

      if (activeSubscription && activeSubscription.product_id) {
        const plan = productIdPlanMap[activeSubscription.product_id];

        const existingUserWithSubscription = await prisma.user.findFirst({
          where: {
            plan: {
              is: {
                subscriptionId: activeSubscription.subscription_id,
              },
            },
          },
        });

        if (plan && !existingUserWithSubscription) {
          await activatePlan(user.id, plan, {
            provider: "DODO",
            subscriptionId: activeSubscription.subscription_id,
          });
        }
      }
    }
  } catch (e) {
    console.error("Error checking DodoPayments subscription", e);
  }

  return user;
}
