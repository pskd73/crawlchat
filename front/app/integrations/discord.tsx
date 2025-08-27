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
import { TbArrowRight, TbBrandDiscord, TbInfoCircle } from "react-icons/tb";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";

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

  const formData = await request.formData();

  const update: Prisma.ScrapeUpdateInput = {};

  if (formData.has("discordServerId")) {
    update.discordServerId = formData.get("discordServerId") as string;
  }

  if (formData.has("fromDiscordDraft")) {
    const enabled = formData.get("discordDraftEnabled") === "on";
    if (enabled) {
      const sourceChannelId = formData.get(
        "discordDraftSourceChannelId"
      ) as string;
      const emoji = formData.get("discordDraftEmoji") as string;
      const destinationChannelId = formData.get(
        "discordDraftDestinationChannelId"
      ) as string;

      if (!sourceChannelId || !destinationChannelId || !emoji) {
        return { error: "All fields are required" };
      }

      update.discordDraftConfig = {
        sourceChannelIds: [sourceChannelId],
        destinationChannelId: destinationChannelId,
        emoji,
      };
    } else {
      update.discordDraftConfig = null;
    }
  }

  const scrape = await prisma.scrape.update({
    where: { id: scrapeId },
    data: update,
  });

  return { scrape };
}

export default function DiscordIntegrations({
  loaderData,
}: Route.ComponentProps) {
  const discordServerIdFetcher = useFetcher();

  return (
    <SettingsSectionProvider>
      <SettingsContainer>
        <div className="text-base-content/50">
          You have two Discord bots that you can install on your server with
          different bot names. Pick your favorite one from the following options
          and install. You need to enter the server id below to make it work!
        </div>
        <div className="flex items-center gap-2">
          <a
            className="btn btn-neutral"
            href="https://discord.com/oauth2/authorize?client_id=1346845279692918804"
            target="_blank"
          >
            <TbBrandDiscord />
            @CrawlChat
            <TbArrowRight />
          </a>

          <a
            className="btn btn-neutral"
            href="https://discord.com/oauth2/authorize?client_id=1353765834321039502"
            target="_blank"
          >
            <TbBrandDiscord />
            @AiBot-CrawlChat
            <TbArrowRight />
          </a>
        </div>

        <SettingsSection
          id="discord-server-id"
          title={
            <div className="flex items-center gap-2">
              <span>Discord Server Id</span>
              <div className="dropdown">
                <div tabIndex={0} role="button" className="btn btn-xs mb-1">
                  <TbInfoCircle />
                </div>
                <div
                  tabIndex={0}
                  className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-4 shadow-sm"
                >
                  <ol className="list-decimal list-inside">
                    <li>Go to "Server Settings"</li>
                    <li>Click on "Widget"</li>
                    <li>Copy the server ID</li>
                  </ol>
                </div>
              </div>
            </div>
          }
          description="Integrate CrawlChat with your Discord server to bother answer the queries and also to learn from the conversations."
          fetcher={discordServerIdFetcher}
        >
          <input
            className="input w-full"
            name="discordServerId"
            placeholder="Enter your Discord server ID"
            defaultValue={loaderData.scrape.discordServerId ?? ""}
          />
        </SettingsSection>
      </SettingsContainer>
    </SettingsSectionProvider>
  );
}
