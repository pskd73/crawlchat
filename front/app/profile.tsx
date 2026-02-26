import type { Route } from "./+types/profile";
import type { Prisma } from "@packages/common/prisma";
import { Page } from "~/components/page";
import { TbArrowRight, TbCrown, TbSettings } from "react-icons/tb";
import { redirect, useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "@packages/common/prisma";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/components/settings-section";
import { getPagesCount, planMap } from "@packages/common/user-plan";
import { makeMeta } from "~/meta";
import { getPaymentGateway } from "~/payment/factory";
import { showModal } from "~/components/daisy-utils";
import { useDirtyForm } from "./components/use-dirty-form";

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

  const usedPages = await getPagesCount(user!.id);

  return {
    user: user!,
    subscription,
    plan,
    scrapes: scrapes.length,
    teamMembers,
    usedPages,
  };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: "Profile - CrawlChat",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);

  const formData = await request.formData();

  const intent = formData.get("intent") as string;

  if (intent === "customer-portal") {
    const gateway = getPaymentGateway(user!.plan!.provider);
    if (gateway && user?.plan?.subscriptionId) {
      const portal = await gateway.getCustomerPortalUrl(
        user.plan.subscriptionId
      );
      return redirect(portal.url);
    } else {
      return Response.json(
        { error: "Failed to get customer portal url" },
        { status: 400 }
      );
    }
  }

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
  if (formData.has("from-data-gap-updates")) {
    update.settings!.dataGapEmailUpdates =
      formData.get("dataGapUpdates") === "on";
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
  const dataGapUpdatesFetcher = useFetcher();
  const nameFetcher = useFetcher();
  const customerPortalFetcher = useFetcher();

  const dirtyForm = useDirtyForm({
    name: loaderData.user.name,
    weeklyUpdates: loaderData.user.settings?.weeklyUpdates,
    ticketUpdates: loaderData.user.settings?.ticketEmailUpdates,
    dataGapUpdates: loaderData.user.settings?.dataGapEmailUpdates,
  });

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
              dirty={dirtyForm.isDirty("name")}
            >
              <input
                className="input max-w-lg"
                name="name"
                defaultValue={loaderData.user.name ?? ""}
                placeholder="Your name"
                onChange={dirtyForm.handleChange("name")}
              />
            </SettingsSection>

            <SettingsSection
              id="weekly-updates"
              fetcher={weeklyUpdatesFetcher}
              title="Weekly Updates"
              description="Enable weekly updates to be sent to your email."
              dirty={dirtyForm.isDirty("weeklyUpdates")}
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
                  onChange={dirtyForm.handleChange("weeklyUpdates")}
                />
                Receive weekly email summary
              </label>
            </SettingsSection>

            <SettingsSection
              id="ticket-updates"
              fetcher={ticketUpdatesFetcher}
              title="Ticket Updates"
              description="Enable ticket updates to be sent to your email."
              dirty={dirtyForm.isDirty("ticketUpdates")}
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
                  onChange={dirtyForm.handleChange("ticketUpdates")}
                />
                Receive ticket updates
              </label>
            </SettingsSection>

            <SettingsSection
              id="data-gap-updates"
              fetcher={dataGapUpdatesFetcher}
              title="Data Gap Alerts"
              description="Enable data gap alerts to be sent to your email."
              dirty={dirtyForm.isDirty("dataGapUpdates")}
            >
              <input type="hidden" name="from-data-gap-updates" value="true" />
              <label className="label">
                <input
                  type="checkbox"
                  className="toggle"
                  name="dataGapUpdates"
                  defaultChecked={
                    loaderData.user.settings?.dataGapEmailUpdates ?? true
                  }
                  onChange={dirtyForm.handleChange("dataGapUpdates")}
                />
                Receive data gap alerts
              </label>
            </SettingsSection>

            <SettingsSection
              id="billing"
              title="Billing"
              description="Manage your plan and billing"
              actionRight={
                <>
                  {loaderData.subscription && (
                    <customerPortalFetcher.Form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="customer-portal"
                      />
                      <button className="btn btn-neutral" type="submit">
                        <TbSettings />
                        Subscription
                        <TbArrowRight />
                      </button>
                    </customerPortalFetcher.Form>
                  )}
                  {!loaderData.subscription && (
                    <button
                      className="btn btn-primary"
                      onClick={() => showModal("upgrade-modal")}
                    >
                      Upgrade
                      <TbCrown />
                    </button>
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
                    <td className="text-right">{limits!.pages}</td>
                    <td className="text-right">
                      {limits!.pages - loaderData.usedPages}
                    </td>
                  </tr>
                  <tr>
                    <td>Message credits</td>
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
