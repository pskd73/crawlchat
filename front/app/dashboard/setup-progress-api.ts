import { getAuthUser } from "~/auth/middleware";
import type { Route } from "./+types/setup-progress-api";
import { getSession } from "~/session";
import type { SetupProgressInput } from "./setup-progress";
import { prisma } from "libs/prisma";

export async function getSetupProgressInput(
  userId: string,
  scrapeId: string
): Promise<SetupProgressInput> {
  return {
    nScrapes: await prisma.scrape.count({
      where: {
        userId,
      },
    }),
    nMessages: await prisma.message.count({
      where: {
        ownerUserId: userId,
        scrapeId,
      },
    }),
    nTickets: await prisma.thread.count({
      where: {
        scrapeId,
        ticketStatus: "open",
      },
    }),
    nKnowledgeGroups: await prisma.knowledgeGroup.count({
      where: {
        userId,
        scrapeId,
      },
    }),
    nChatbotMessages: await prisma.message.count({
      where: {
        ownerUserId: userId,
        scrapeId,
        channel: { isSet: false },
      },
    }),
    nDiscordMessages: await prisma.message.count({
      where: {
        ownerUserId: userId,
        scrapeId,
        channel: "discord",
      },
    }),
    nMCPMessages: await prisma.message.count({
      where: {
        ownerUserId: userId,
        scrapeId,
        channel: "mcp",
      },
    }),
    scrape: await prisma.scrape.findFirstOrThrow({
      where: {
        id: scrapeId,
      },
    }),
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request, { redirectTo: "/login" });

  const session = await getSession(request.headers.get("cookie"));
  const scrapeId = session.get("scrapeId");

  return {
    input: await getSetupProgressInput(user!.id, scrapeId!)
  };
}
