import { prisma } from "libs/prisma";

function chunk<T>(array: T[], size: number): T[][] {
  return array.reduce((acc, _, i) => {
    const index = Math.floor(i / size);
    acc[index] = [...(acc[index] || []), array[i]];
    return acc;
  }, [] as T[][]);
}

export async function cleanupThreads() {
  const oneWeekAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  let threads = await prisma.thread.findMany({
    where: {
      createdAt: {
        lt: oneWeekAgo,
      },
    },
  });

  threads = threads.filter((thread) => thread.messages.length === 0);
  console.log("Found", threads.length, "threads");

  const chunks = chunk(threads, 100);
  for (const chunk of chunks) {
    console.log("Deleting chunk", chunk.length, "threads");
    await prisma.thread.deleteMany({
      where: {
        id: { in: chunk.map((thread) => thread.id) },
      },
    });
  }
}
