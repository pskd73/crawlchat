import dotenv from "dotenv";
dotenv.config();

import { prisma } from "libs/prisma";
import { consumeCredits } from "libs/user-plan";
import { cleanupThreads } from "./scripts/thread-cleanup";

async function main() {
  const user = await prisma.user.findFirstOrThrow({
    where: { email: "pramodkumar.damam73@gmail.com" },
  });
  await consumeCredits(user.id, "messages", 1);
}

console.log("Starting...");
// main();
cleanupThreads();
