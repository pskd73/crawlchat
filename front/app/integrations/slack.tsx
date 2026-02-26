import type { Route } from "./+types/discord";
import type { Prisma } from "@packages/common/prisma";
import { useFetcher } from "react-router";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/components/settings-section";
import { useDirtyForm } from "~/components/use-dirty-form";
import { prisma } from "@packages/common/prisma";
import { getAuthUser } from "~/auth/middleware";
import { TbArrowRight, TbBrandSlack } from "react-icons/tb";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { useFetcherToast } from "~/components/use-fetcher-toast";
import { makeMeta } from "~/meta";
import { Page } from "~/components/page";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: { id: scrapeId },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  return { scrape };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: "Slack app - CrawlChat",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: { id: scrapeId },
  });

  const formData = await request.formData();

  const update: Prisma.ScrapeUpdateInput = {};
  if (formData.has("slackTeamId")) {
    update.slackTeamId = formData.get("slackTeamId") as string;
  }

  if (formData.has("from-broadcast")) {
    update.slackConfig = {
      ...(scrape!.slackConfig! as any),
      replyBroadcast: formData.get("replyBroadcast") === "on",
    };
  }

  const updated = await prisma.scrape.update({
    where: { id: scrapeId },
    data: update,
  });

  return { scrape: updated };
}

export default function SlackIntegrations({
  loaderData,
}: Route.ComponentProps) {
  const teamIdFetcher = useFetcher();
  const broadcastFetcher = useFetcher();
  const form = useDirtyForm({
    slackTeamId: loaderData.scrape.slackTeamId ?? "",
    replyBroadcast: loaderData.scrape.slackConfig?.replyBroadcast ?? false,
  });

  useFetcherToast(broadcastFetcher);

  return (
    <Page title={"Slack app"} icon={<TbBrandSlack />}>
      <SettingsSectionProvider>
        <SettingsContainer>
          <div className="text-base-content/50">
            You can install the CrawlChat bot on your Slack workspace. You need
            to first set the team id below to make it work!
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <a
              className="btn btn-neutral"
              href="https://slack.crawlchat.app/install"
              target="_blank"
            >
              <TbBrandSlack />
              Install @CrawlChat
              <TbArrowRight />
            </a>
            <a
              className="btn btn-outline"
              href="https://docs.crawlchat.app/connect/slack-app#how-to-get-the-team-id"
              target="_blank"
            >
              How to find team id?
            </a>
          </div>

          <SettingsSection
            id="slack-team-id"
            title={"Slack Team Id"}
            description="Slack team ID is unique to your workspace. You can find it in the URL of your workspace."
            fetcher={teamIdFetcher}
            dirty={form.isDirty("slackTeamId")}
          >
            <input
              className="input w-full"
              name="slackTeamId"
              placeholder="Ex: T060PNXZXXX"
              value={(form.getValue("slackTeamId") as string) ?? ""}
              onChange={form.handleChange("slackTeamId")}
            />
          </SettingsSection>

          {loaderData.scrape.slackConfig?.installation && (
            <SettingsSection
              id="broadcast"
              title={"Broadcast the reply"}
              description="Enable this if you want to broadcast the reply to the channel along with the reply as thread."
              fetcher={broadcastFetcher}
              dirty={form.isDirty("replyBroadcast")}
            >
              <input type="hidden" name="from-broadcast" value="true" />
              <label className="label">
                <input
                  type="checkbox"
                  className="toggle"
                  name="replyBroadcast"
                  checked={
                    (form.getValue("replyBroadcast") as boolean) ?? false
                  }
                  onChange={form.handleChange("replyBroadcast")}
                />
                Broadcast the reply
              </label>
            </SettingsSection>
          )}
        </SettingsContainer>
      </SettingsSectionProvider>
    </Page>
  );
}
