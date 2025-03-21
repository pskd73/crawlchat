import type { User } from "@prisma/client";
import WeeklyEmail from "../../emails/weekly";
import { analysePairMessages, makeMessagePairs } from "~/analyse/analyse";
import { sendReactEmail } from "~/email";
import { prisma } from "~/prisma";

export async function sendWeeklyForUser(user: User) {
  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const messages = await prisma.message.findMany({
    where: {
      ownerUserId: user.id,
      createdAt: {
        gte: ONE_WEEK_AGO,
      },
    },
    include: {
      thread: true,
    },
  });

  const pairs = makeMessagePairs(messages);
  const { performance, defaultPairs } = analysePairMessages(pairs);

  await sendReactEmail(
    user.email,
    "Weekly Report",
    <WeeklyEmail
      messages={pairs.length}
      MCPHits={defaultPairs.length}
      performance={performance}
    />
  );
}

export async function sendWeeklyForAllUsers() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    await sendWeeklyForUser(user);
  }
}