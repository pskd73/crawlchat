import dotenv from "dotenv";
dotenv.config();

import { prisma } from "@packages/common/prisma";
import { exit } from "process";
import { cleanupMessages } from "./cleanup";
import { createToken } from "@packages/common/jwt";

async function weeklyUpdate() {
  const scrapes = await prisma.scrape.findMany({
    include: {
      user: true,
    },
  });

  for (const scrape of scrapes) {
    if (
      !scrape.user.plan ||
      !scrape.user.plan.subscriptionId ||
      scrape.user.plan.status !== "ACTIVE"
    ) {
      continue;
    }

    console.log(`Sending weekly update for scrape ${scrape.id}`);
    const response = await fetch(`${process.env.FRONT_URL}/email-alert`, {
      method: "POST",
      body: JSON.stringify({
        intent: "weekly-update",
        scrapeId: scrape.id,
      }),
      headers: {
        Authorization: `Bearer ${createToken(scrape.userId)}`,
      },
    });
    if (!response.ok) {
      console.error(`Error sending weekly update for scrape ${scrape.id}`);
      console.error(response.statusText);
    }
  }
}

function getCliArg(argName: string): string | null {
  const args = process.argv;
  const argIndex = args.indexOf(`--${argName}`);

  if (argIndex !== -1 && argIndex + 1 < args.length) {
    return args[argIndex + 1];
  }

  return null;
}

async function main() {
  const jobName = getCliArg("job-name");

  if (jobName === "cleanup-messages") {
    return await cleanupMessages();
  }
  if (jobName === "weekly-update") {
    return await weeklyUpdate();
  }

  console.error("Invalid job name", jobName);
  exit(1);
}

main();
