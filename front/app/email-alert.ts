import { prisma } from "@packages/common/prisma";
import type { Route } from "./+types/email-alert";
import { getJwtAuthUser } from "./jwt";
import { authoriseScrapeUser } from "./auth/scrape-session";
import {
  sendDataGapAlertEmail,
  sendLowCreditsEmail,
  sendNewTicketAdminEmail,
  sendNewTicketUserEmail,
  sendReactEmail,
  sendWeeklyUpdateEmail,
} from "./email";
import { getMessagesSummary, type MessagesSummary } from "./messages-summary";
import moment from "moment";

export async function action({ request }: Route.LoaderArgs) {
  const user = await getJwtAuthUser(request);

  const body = await request.json();
  const intent = body.intent;

  if (intent === "low-credits") {
    const scrape = await prisma.scrape.findFirstOrThrow({
      where: { id: body.scrapeId },
      include: {
        user: true,
        scrapeUsers: {
          include: {
            user: true,
          },
        },
      },
    });
    authoriseScrapeUser(user!.scrapeUsers, scrape.id);

    if (!scrape.user.plan?.credits) return;
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
    const twoDaysAgo = new Date(Date.now() - TWO_DAYS);
    if (
      scrape.lowCreditsMailSentAt &&
      scrape.lowCreditsMailSentAt > twoDaysAgo
    ) {
      return;
    }

    const credits =
      scrape.user.plan?.credits[
        body.creditType as keyof typeof scrape.user.plan.credits
      ] ?? 0;
    for (const scrapeUser of scrape.scrapeUsers) {
      if (scrapeUser.user) {
        await sendLowCreditsEmail(
          scrapeUser.user.email!,
          scrape.title ?? "",
          scrapeUser.user.name ?? "",
          body.creditType,
          credits
        );
      }
    }
    await prisma.scrape.update({
      where: { id: scrape.id },
      data: { lowCreditsMailSentAt: new Date() },
    });
  }

  if (intent === "data-gap-alert") {
    const message = await prisma.message.findFirstOrThrow({
      where: { id: body.messageId },
      include: {
        scrape: {
          include: {
            scrapeUsers: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    for (const scrapeUser of message.scrape.scrapeUsers) {
      if (
        scrapeUser.user &&
        (scrapeUser.user.settings?.dataGapEmailUpdates ?? true) &&
        message.dataGap?.title
      ) {
        await sendDataGapAlertEmail(
          scrapeUser.user.email!,
          message.scrape.title ?? "",
          message.dataGap.title
        );
      }
    }
  }

  if (intent === "new-ticket") {
    const threadId = body.threadId;
    const message = body.message;

    const thread = await prisma.thread.findFirstOrThrow({
      where: { id: threadId },
      include: {
        scrape: {
          include: {
            scrapeUsers: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (
      !thread.ticketUserEmail ||
      !thread.ticketNumber ||
      !thread.ticketKey ||
      !thread.title
    )
      return { error: "Thread is not valid" };

    await sendNewTicketUserEmail(
      thread.ticketUserEmail,
      thread.scrape.title ?? "CrawlChat",
      thread.ticketNumber,
      thread.ticketKey,
      thread.title
    );

    for (const scrapeUser of thread.scrape.scrapeUsers) {
      if (
        scrapeUser.user &&
        (scrapeUser.user.settings?.ticketEmailUpdates ?? true)
      ) {
        await sendNewTicketAdminEmail(
          scrapeUser.user.email,
          thread.scrape.title ?? "CrawlChat",
          thread.ticketNumber,
          thread.title,
          message,
          thread.ticketUserEmail,
          thread.customTags as Record<string, string | boolean | number> | null
        );
      }
    }
  }

  if (intent === "weekly-update") {
    const scrape = await prisma.scrape.findFirstOrThrow({
      where: { id: body.scrapeId },
      include: {
        scrapeUsers: {
          include: {
            user: true,
          },
        },
      },
    });

    authoriseScrapeUser(user!.scrapeUsers, scrape.id);

    const onWeekAgo = moment().subtract(1, "week");
    const startDate = onWeekAgo.clone().startOf("day");
    const endDate = moment().endOf("day");
    const messages = await prisma.message.findMany({
      where: {
        scrapeId: scrape.id,
        createdAt: { gte: startDate.toDate() },
      },
    });
    const summary = getMessagesSummary(messages, true);
    const categoriesSummary: { name: string; summary: MessagesSummary }[] = [];
    for (const category of scrape.messageCategories) {
      categoriesSummary.push({
        name: category.title,
        summary: getMessagesSummary(
          messages.filter((m) => m.analysis?.category === category.title),
          true
        ),
      });
    }

    for (const scrapeUser of scrape.scrapeUsers) {
      if (
        scrapeUser.user &&
        (scrapeUser.user.settings?.weeklyUpdates ?? true)
      ) {
        await sendWeeklyUpdateEmail(
          scrapeUser.user.email,
          scrape.title,
          summary,
          categoriesSummary,
          startDate.toDate(),
          endDate.toDate()
        );
      }
    }
  }

  return Response.json({ success: true });
}
