import type { Route } from "./+types/weekly";
import { prisma } from "libs/prisma";
import { getSetupProgressInput } from "~/dashboard/setup-progress-api";
import {
  allSetupProgressActions,
  type SetupProgressInput,
} from "~/dashboard/setup-progress";
import { sendReactEmail } from "~/email";
import SetupProgressEmail from "emails/setup-progress";

let startedAt: Date | null = null;
const keyStr = "1qTeTl2qlP9e0zgFP0Ur0MWlBno0OGrdbSl5tmxsWXHbJ81qQh";

async function process(day: number) {
  const now = new Date();
  const dayStart = new Date(now.getTime() - 1000 * 60 * 60 * 24 * day);
  const dayEnd = new Date(dayStart.getTime() + 1000 * 60 * 60 * 24);
  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    include: {
      scrapes: true,
    },
  });

  console.log("Total users", users.length);

  const emptyProgressInput: SetupProgressInput = {
    nScrapes: 0,
    nMessages: 0,
    nTickets: 0,
    nKnowledgeGroups: 0,
    nChatbotMessages: 0,
    nDiscordMessages: 0,
    nMCPMessages: 0,
  };

  for (const user of users) {
    const inputProgress =
      user.scrapes.length > 0
        ? await getSetupProgressInput(user.id, user.scrapes[0].id)
        : emptyProgressInput;

    const hasPending = allSetupProgressActions.some((action) =>
      action.checker(inputProgress)
    );

    if (hasPending && (user.settings?.weeklyUpdates ?? true)) {
      console.log("Sending email to", user.email);
      await sendReactEmail(
        user.email,
        "Complete chatbot setup",
        <SetupProgressEmail
          actions={allSetupProgressActions.map((action) => ({
            text: action.title,
            url: action.url ?? "",
            done: !action.checker(inputProgress),
          }))}
        />
      );
    }
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (key !== keyStr) {
    throw new Error("Invalid key");
  }

  if (startedAt) {
    return { status: "already-running", startedAt };
  }

  const day = parseInt(url.searchParams.get("day") ?? "3");
  startedAt = new Date();
  process(day).then(() => {
    startedAt = null;
  });
  return { status: "started", startedAt };
}

export default function Weekly({ loaderData }: Route.ComponentProps) {
  return <div>{JSON.stringify(loaderData)}</div>;
}
