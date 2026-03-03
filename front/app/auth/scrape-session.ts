import type { ScrapeUser, UserRole } from "@packages/common/prisma";
import { redirect } from "react-router";
import { getSession } from "~/session";

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
