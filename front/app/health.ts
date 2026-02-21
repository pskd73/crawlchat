import { prisma } from "@packages/common/prisma";

export async function loader() {
  const mongoCheck = await Promise.allSettled([
    prisma.scrape.findFirst({
      select: { id: true },
    }),
  ]);

  return {
    mongo: mongoCheck ? "up" : "down",
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
