import type { Route } from "./+types/discord";
import type { Prisma } from "libs/prisma";
import { useFetcher } from "react-router";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/settings-section";
import { prisma } from "~/prisma";
import { getAuthUser } from "~/auth/middleware";
import { TbArrowRight, TbBrandSlack } from "react-icons/tb";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { useFetcherToast } from "~/dashboard/use-fetcher-toast";

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

  useFetcherToast(broadcastFetcher);

  return (
    <SettingsSectionProvider>
      <SettingsContainer>
        <div className="text-base-content/50">
          You can install CrawlChat bot on your Slack workspace. You need to
          first set the team id below to make it work!
        </div>

        <div className="flex items-center gap-2">
          <a
            className="btn btn-outline"
            href="https://guides.crawlchat.app/guide/get-the-team-id-for-slack-app-integration-28"
            target="_blank"
          >
            How to find team id?
          </a>

          <a
            className="btn btn-neutral"
            href="https://slack.crawlchat.app/install"
            target="_blank"
          >
            <TbBrandSlack />
            Install @CrawlChat
            <TbArrowRight />
          </a>
        </div>

        <SettingsSection
          id="slack-team-id"
          title={"Slack Team Id"}
          description="Slack team id is unique to your workspace. You can find it in the URL of your workspace."
          fetcher={teamIdFetcher}
        >
          <input
            className="input w-full"
            name="slackTeamId"
            placeholder="Ex: T060PNXZXXX"
            defaultValue={loaderData.scrape.slackTeamId ?? ""}
          />
        </SettingsSection>

        {loaderData.scrape.slackConfig?.installation && (
          <SettingsSection
            id="broadcast"
            title={"Broadcast the reply"}
            description="Enable this if you want to broadcast the reply to the channel along with the reply as thread."
            fetcher={broadcastFetcher}
          >
            <input type="hidden" name="from-broadcast" value="true" />
            <label className="label">
              <input
                type="checkbox"
                className="toggle"
                name="replyBroadcast"
                defaultChecked={
                  loaderData.scrape.slackConfig?.replyBroadcast ?? false
                }
              />
              Broadcast the reply
            </label>
          </SettingsSection>
        )}
      </SettingsContainer>
    </SettingsSectionProvider>
  );
}
