import type { Route } from "./+types/github-bot";
import type { Prisma } from "libs/prisma";
import { useFetcher } from "react-router";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/components/settings-section";
import { prisma } from "libs/prisma";
import { getAuthUser } from "~/auth/middleware";
import { TbArrowRight, TbBrandGithub } from "react-icons/tb";
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

  return { scrape, installUrl: process.env.VITE_GITHUB_APP_INSTALL_URL };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: "GitHub Bot - CrawlChat",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();

  const update = {} as Prisma.ScrapeUpdateInput & {
    githubRepoName?: string;
    githubAutoReply?: boolean;
  };
  if (formData.has("githubRepoName")) {
    update.githubRepoName = formData.get("githubRepoName") as string;
  }
  if (formData.has("from-github-auto-reply")) {
    update.githubAutoReply = formData.get("githubAutoReply") === "on";
  }

  const updated = await prisma.scrape.update({
    where: { id: scrapeId },
    data: update,
  });

  return { scrape: updated };
}

export default function GitHubIntegrations({
  loaderData,
}: Route.ComponentProps) {
  const fetcher = useFetcher();

  useFetcherToast(fetcher);

  return (
    <Page title={"GitHub bot"} icon={<TbBrandGithub />}>
      <SettingsSectionProvider>
        <SettingsContainer>
          <div className="text-base-content/50">
            You can install the CrawlChat bot on your GitHub repositories. The
            bot will respond to mentions and answer questions in discussions and
            issues.
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <a
              className="btn btn-neutral"
              href={loaderData.installUrl}
              target="_blank"
            >
              <TbBrandGithub />
              Install CrawlChat
              <TbArrowRight />
            </a>
          </div>

          <SettingsSection
            id="github-repo-name"
            title={"Repository"}
            description="Enter your GitHub repository in the format 'owner/repo' (e.g., 'crawlchat/crawlchat')."
            fetcher={fetcher}
          >
            <input
              className="input w-full"
              name="githubRepoName"
              placeholder="Ex: crawlchat/crawlchat"
              defaultValue={loaderData.scrape.githubRepoName ?? ""}
            />
          </SettingsSection>

          <SettingsSection
            id="github-auto-reply"
            title={"Auto-reply"}
            description="Automatically reply to new GitHub issues and discussions when they are created. The bot will only reply if it has relevant knowledge about the topic."
            fetcher={fetcher}
          >
            <input type="hidden" name="from-github-auto-reply" value="on" />
            <label className="label">
              <input
                type="checkbox"
                className="toggle"
                name="githubAutoReply"
                defaultChecked={loaderData.scrape.githubAutoReply ?? true}
              />
              Active
            </label>
          </SettingsSection>
        </SettingsContainer>
      </SettingsSectionProvider>
    </Page>
  );
}
