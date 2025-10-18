import type { Scrape, ScrapeUser, Thread, UserRole } from "libs/prisma";
import { redirect } from "react-router";
import { getSession } from "~/session";

export function getScrapeTitle(scrape: Scrape) {
  return scrape.title ?? scrape.url ?? "Untitled";
}

export async function getSessionScrapeId(request: Request) {
  const session = await getSession(request.headers.get("cookie"));
  const scrapeId = session.get("scrapeId");

  if (!scrapeId) {
    throw redirect("/app");
  }

  return scrapeId;
}

export function authoriseScrapeUser(
  scrapeUsers: ScrapeUser[],
  scrapeId: string,
  roles?: UserRole[]
) {
  const scrapeUser = scrapeUsers.find(
    (scrapeUser) =>
      scrapeUser.scrapeId === scrapeId &&
      (!roles || roles.includes(scrapeUser.role))
  );

  if (!scrapeUser) {
    throw redirect("/app");
  }

  return scrapeUser;
}

export function sanitizeScrape(scrape: Scrape) {
  scrape.slackConfig = null;
  scrape.slackTeamId = null;
  scrape.discordDraftConfig = null;
  scrape.discordServerId = null;
  scrape.chatPrompt = null;
}

export function sanitizeThread(thread?: Thread | null) {
  if (thread?.emailOtp) {
    thread.emailOtp = "xxxxxx";
  }
}
