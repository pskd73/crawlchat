import { prisma } from "./prisma";

export async function getNextNumber(id: string) {
  const counter = await prisma.counter.upsert({
    where: {
      id,
    },
    create: {
      id,
      count: 0,
    },
    update: {
      count: {
        increment: 1,
      },
    },
  });

  return counter.count;
}