import { Page } from "~/components/page";
import { TbArrowRight, TbCrown, TbSettings } from "react-icons/tb";
import { DataList, Input, Stack } from "@chakra-ui/react";
import { useFetcher } from "react-router";
import type { Route } from "./+types/profile";
import { getAuthUser } from "~/auth/middleware";
import type { Prisma } from "libs/prisma";
import { prisma } from "~/prisma";
import { Switch } from "~/components/ui/switch";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/settings-section";
import { Button } from "~/components/ui/button";
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
      <Stack w="full">
        <SettingsSectionProvider>
          <SettingsContainer>
            <SettingsSection
              id="name"
              fetcher={nameFetcher}
              title="Name"
              description="Set your name to be displayed in the dashboard"
            >
              <Stack>
                <Input
                  name="name"
                  defaultValue={loaderData.user.name ?? ""}
                  placeholder="Your name"
                  maxW={400}
                />
              </Stack>
            </SettingsSection>

            <SettingsSection
              id="weekly-updates"
              fetcher={weeklyUpdatesFetcher}
              title="Weekly Updates"
              description="Enable weekly updates to be sent to your email."
            >
              <Stack>
                <input type="hidden" name="from-weekly-updates" value="true" />
                <Switch
                  name="weeklyUpdates"
                  defaultChecked={
                    loaderData.user.settings?.weeklyUpdates ?? true
                  }
                >
                  Receive weekly email summary
                </Switch>
              </Stack>
            </SettingsSection>

            <SettingsSection
              id="ticket-updates"
              fetcher={ticketUpdatesFetcher}
              title="Ticket Updates"
              description="Enable ticket updates to be sent to your email."
            >
              <Stack>
                <input type="hidden" name="from-ticket-updates" value="true" />
                <Switch
                  name="ticketUpdates"
                  defaultChecked={
                    loaderData.user.settings?.ticketEmailUpdates ?? true
                  }
                >
                  Receive ticket updates
                </Switch>
              </Stack>
            </SettingsSection>

            <SettingsSection
              id="billing"
              title="Billing"
              description="Manage your plan and billing"
              actionRight={
                <>
                  {loaderData.subscription && (
                    <Button size={"sm"} asChild>
                      <a
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
                    </Button>
                  )}
                  {!loaderData.subscription && (
                    <>
                      <Button
                        size={"sm"}
                        colorPalette={"brand"}
                        variant={"subtle"}
                        asChild
                      >
                        <a
                          href={
                            "https://beestack.lemonsqueezy.com/buy/a13beb2a-f886-4a9a-a337-bd82e745396a"
                          }
                          target="_blank"
                        >
                          <TbCrown />
                          Upgrade to Starter
                        </a>
                      </Button>
                      <Button size={"sm"} colorPalette={"brand"} asChild>
                        <a
                          href={
                            "https://beestack.lemonsqueezy.com/buy/3a487266-72de-492d-8884-335c576f89c0"
                          }
                          target="_blank"
                        >
                          <TbCrown />
                          Upgrade to Pro
                        </a>
                      </Button>
                    </>
                  )}
                </>
              }
            >
              <DataList.Root orientation="horizontal">
                <DataList.Item>
                  <DataList.ItemLabel>Pages</DataList.ItemLabel>
                  <DataList.ItemValue>
                    Available {credits.scrapes} / {plan.credits.scrapes}
                  </DataList.ItemValue>
                </DataList.Item>

                <DataList.Item>
                  <DataList.ItemLabel>Messages</DataList.ItemLabel>
                  <DataList.ItemValue>
                    Available {credits.messages} / {plan.credits.messages}
                  </DataList.ItemValue>
                </DataList.Item>

                {limits && (
                  <DataList.Item>
                    <DataList.ItemLabel>Collections</DataList.ItemLabel>
                    <DataList.ItemValue>
                      Available {limits.scrapes - loaderData.scrapes} /{" "}
                      {limits.scrapes}
                    </DataList.ItemValue>
                  </DataList.Item>
                )}

                {limits && (
                  <DataList.Item>
                    <DataList.ItemLabel>Team members</DataList.ItemLabel>
                    <DataList.ItemValue>
                      Available {limits.teamMembers - loaderData.teamMembers} /{" "}
                      {limits.teamMembers}
                    </DataList.ItemValue>
                  </DataList.Item>
                )}
              </DataList.Root>
            </SettingsSection>
          </SettingsContainer>
        </SettingsSectionProvider>
      </Stack>
    </Page>
  );
}
