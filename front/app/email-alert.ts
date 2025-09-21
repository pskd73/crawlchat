import { prisma } from "libs/prisma";
import type { Route } from "./+types/email-alert";
import { getJwtAuthUser } from "./jwt";
import { authoriseScrapeUser } from "./scrapes/util";
import { sendDataGapAlertEmail, sendLowCreditsEmail } from "./email";

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
        message.analysis?.dataGapTitle &&
        message.analysis?.dataGapDescription
      ) {
        await sendDataGapAlertEmail(
          scrapeUser.user.email!,
          message.scrape.title ?? "",
          message.analysis.dataGapTitle,
          message.analysis.dataGapDescription
        );
      }
    }
  }

  return Response.json({ success: true });
}
