import type { Route } from "./+types/profile";
import type { Prisma } from "libs/prisma";
import { Page } from "~/components/page";
import { TbArrowRight, TbCrown, TbSettings } from "react-icons/tb";
import { useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/settings-section";
import { getSubscription } from "~/lemonsqueezy";
import { planMap } from "libs/user-plan";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  let subscription = null;
  if (user!.plan?.subscriptionId) {
    subscription = await getSubscription(user!.plan.subscriptionId);
  }

  const plan = planMap[user!.plan!.planId];

  const scrapes = await prisma.scrape.findMany({
    where: {
      userId: user!.id,
    },
  });
  let teamMembers = 0;
  for (const scrape of scrapes) {
    teamMembers += await prisma.scrapeUser.count({
      where: {
        scrapeId: scrape.id,
        role: {
          not: "owner",
        },
      },
    });
  }

  return {
    user: user!,
    subscription,
    plan,
    scrapes: scrapes.length,
    teamMembers,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);

  const formData = await request.formData();

  const update: Prisma.UserUpdateInput = {
    settings: user?.settings ?? {
      weeklyUpdates: true,
      ticketEmailUpdates: true,
    },
  };

  if (formData.has("from-weekly-updates")) {
    update.settings!.weeklyUpdates = formData.get("weeklyUpdates") === "on";
  }
  if (formData.has("from-ticket-updates")) {
    update.settings!.ticketEmailUpdates =
      formData.get("ticketUpdates") === "on";
  }
  if (formData.has("name")) {
    update.name = formData.get("name") as string;
  }

  await prisma.user.update({
    where: { id: user!.id },
    data: update,
  });

  return Response.json({ success: true });
}

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
  const weeklyUpdatesFetcher = useFetcher();
  const ticketUpdatesFetcher = useFetcher();
  const nameFetcher = useFetcher();

  const credits = loaderData.user.plan!.credits!;
  const limits = loaderData.user.plan!.limits;
  const plan = loaderData.plan!;

  return (
    <Page title="Profile" icon={<TbSettings />}>
      <div className="flex flex-col gap-2 w-full">
        <SettingsSectionProvider>
          <SettingsContainer>
            <SettingsSection
              id="name"
              fetcher={nameFetcher}
              title="Name"
              description="Set your name to be displayed in the dashboard"
            >
              <input
                className="input max-w-lg"
                name="name"
                defaultValue={loaderData.user.name ?? ""}
                placeholder="Your name"
              />
            </SettingsSection>

            <SettingsSection
              id="weekly-updates"
              fetcher={weeklyUpdatesFetcher}
              title="Weekly Updates"
              description="Enable weekly updates to be sent to your email."
            >
              <input type="hidden" name="from-weekly-updates" value="true" />
              <label className="label">
                <input
                  type="checkbox"
                  name="weeklyUpdates"
                  defaultChecked={
                    loaderData.user.settings?.weeklyUpdates ?? true
                  }
                  className="toggle"
                />
                Receive weekly email summary
              </label>
            </SettingsSection>

            <SettingsSection
              id="ticket-updates"
              fetcher={ticketUpdatesFetcher}
              title="Ticket Updates"
              description="Enable ticket updates to be sent to your email."
            >
              <input type="hidden" name="from-ticket-updates" value="true" />
              <label className="label">
                <input
                  type="checkbox"
                  className="toggle"
                  name="ticketUpdates"
                  defaultChecked={
                    loaderData.user.settings?.ticketEmailUpdates ?? true
                  }
                />
                Receive ticket updates
              </label>
            </SettingsSection>

            <SettingsSection
              id="billing"
              title="Billing"
              description="Manage your plan and billing"
              actionRight={
                <>
                  {loaderData.subscription && (
                    <a
                      className="btn btn-neutral"
                      href={
                        loaderData.subscription.data.attributes.urls
                          .customer_portal
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <TbSettings />
                      Subscription
                      <TbArrowRight />
                    </a>
                  )}
                  {!loaderData.subscription && (
                    <>
                      <a
                        className="btn btn-primary btn-soft"
                        href={
                          "https://beestack.lemonsqueezy.com/buy/a13beb2a-f886-4a9a-a337-bd82e745396a"
                        }
                        target="_blank"
                      >
                        <TbCrown />
                        Upgrade to Starter
                      </a>

                      <a
                        className="btn btn-primary"
                        href={
                          "https://beestack.lemonsqueezy.com/buy/3a487266-72de-492d-8884-335c576f89c0"
                        }
                        target="_blank"
                      >
                        <TbCrown />
                        Upgrade to Pro
                      </a>
                    </>
                  )}
                </>
              }
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Available</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Pages</td>
                    <td className="text-right">{plan.credits.scrapes}</td>
                    <td className="text-right">{credits.scrapes}</td>
                  </tr>
                  <tr>
                    <td>Messages</td>
                    <td className="text-right">{plan.credits.messages}</td>
                    <td className="text-right">{credits.messages}</td>
                  </tr>
                  {limits && (
                    <tr>
                      <td>Collections</td>
                      <td className="text-right">{limits.scrapes}</td>
                      <td className="text-right">
                        {limits.scrapes - loaderData.scrapes}
                      </td>
                    </tr>
                  )}
                  {limits && (
                    <tr>
                      <td>Team Members</td>
                      <td className="text-right">{limits.teamMembers}</td>
                      <td className="text-right">
                        {limits.teamMembers - loaderData.teamMembers}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </SettingsSection>
          </SettingsContainer>
        </SettingsSectionProvider>
      </div>
    </Page>
  );
}
