import { getAuthUser } from "~/auth/middleware";
import type { Route } from "./+types/weekly";
import { redirect } from "react-router";
import WeeklyEmail from "../../emails/weekly";
import { analysePairMessages, makeMessagePairs } from "~/message/analyse";
import { sendReactEmail } from "~/email";
import { prisma } from "~/prisma";

async function sendWeeklyForUser(userId: string, email: string) {
  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const messages = await prisma.message.findMany({
    where: {
      ownerUserId: userId,
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
    email,
    "Weekly Report",
    <WeeklyEmail
      messages={pairs.length}
      MCPHits={defaultPairs.length}
      performance={performance}
    />
  );
}

async function sendWeeklyForAllUsers() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const scrapes = await prisma.scrape.count({
      where: {
        userId: user.id,
      },
    });
    if (scrapes === 0) {
      console.log(`Skipping ${user.email} because they have no scrapes`);
      continue;
    }
    if (user.settings?.weeklyUpdates === false) {
      console.log(
        `Skipping ${user.email} because they have weekly updates disabled`
      );
      continue;
    }
    console.log(`Sending weekly report to ${user.email}`);
    await sendWeeklyForUser(user.id, user.email);
  }
}

let startedAt: Date | null = null;

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  if (user?.email !== "pramodkumar.damam73@gmail.com") {
    return redirect("/");
  }
  if (startedAt) {
    return { status: "already-running", startedAt };
  }
  startedAt = new Date();
  sendWeeklyForAllUsers().then(() => {
    startedAt = null;
  });
  return { status: "started", startedAt };
}

export default function Weekly({ loaderData }: Route.ComponentProps) {
  return <div>{JSON.stringify(loaderData)}</div>;
}
