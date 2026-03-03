import { prisma } from "@packages/common/prisma";
import { makeIndexer } from "@packages/indexer";
import { Job, QueueEvents, Worker } from "bullmq";
import { makeSource } from "./source/factory";
import {
  BULLMQ_PREFIX,
  GROUP_QUEUE_NAME,
  GroupData,
  groupQueue,
  ITEM_QUEUE_NAME,
  ItemData,
  itemQueue,
  redis,
} from "./source/queue";
import {
  decrementPendingUrls,
  getPendingUrls,
  scheduleGroup,
} from "./source/schedule";
import { upsertFailedItem, upsertItem } from "./source/upsert-item";

const itemEvents = new QueueEvents(ITEM_QUEUE_NAME, {
  connection: redis,
  prefix: BULLMQ_PREFIX,
});

const groupEvents = new QueueEvents(GROUP_QUEUE_NAME, {
  connection: redis,
  prefix: BULLMQ_PREFIX,
});

groupEvents.on("added", async ({ jobId }) => {
  console.log(`Group job added: ${jobId}`);
});

groupEvents.on("failed", async ({ jobId, failedReason }) => {
  console.log(`Group job failed: ${jobId}, failed reason: ${failedReason}`);
  const job = await groupQueue.getJob(jobId);
  if (job) {
    await checkGroupCompletion(job);
  }
});

groupEvents.on("completed", async ({ jobId }) => {
  const job = await groupQueue.getJob(jobId);
  if (job) {
    await checkGroupCompletion(job);
  }
});

async function deleteStaleItems(knowledgeGroupId: string, processId: string) {
  const knowledgeGroup = await prisma.knowledgeGroup.findUniqueOrThrow({
    where: { id: knowledgeGroupId },
    include: { scrape: true },
  });

  if (knowledgeGroup.removeStalePages !== true) {
    return;
  }

  const staleItems = await prisma.scrapeItem.findMany({
    where: {
      knowledgeGroupId,
      OR: [
        { lastProcessId: { not: processId } },
        { lastProcessId: null },
        { lastProcessId: { isSet: false } },
      ],
    },
    select: {
      id: true,
      embeddings: true,
    },
  });

  console.log(`Found ${staleItems.length} stale items`);

  if (staleItems.length === 0) {
    return;
  }

  console.log(
    `Deleting ${staleItems.length} stale items from knowledge group ${knowledgeGroupId}`
  );

  const embeddingIds = staleItems.flatMap((item) =>
    item.embeddings.map((e) => e.id)
  );

  if (embeddingIds.length > 0) {
    const indexer = makeIndexer({ key: knowledgeGroup.scrape.indexer });
    for (let i = 0; i < embeddingIds.length; i += 200) {
      await indexer.deleteByIds(embeddingIds.slice(i, i + 200));
    }
  }

  await prisma.scrapeItem.deleteMany({
    where: {
      knowledgeGroupId,
      id: { in: staleItems.map((item) => item.id) },
    },
  });
}

async function checkGroupCompletion(
  job: Job<{ processId: string; knowledgeGroupId: string }>
) {
  await decrementPendingUrls(job.data.processId);
  const pendingUrls = await getPendingUrls(job.data.processId);

  if (pendingUrls === 0) {
    await deleteStaleItems(job.data.knowledgeGroupId, job.data.processId);
    await prisma.knowledgeGroup.update({
      where: { id: job.data.knowledgeGroupId },
      data: { status: "done" },
    });
    console.log(`Knowledge group ${job.data.knowledgeGroupId} completed`);
  }
}

itemEvents.on("added", async ({ jobId }) => {
  console.log(`Item job added: ${jobId}`);
});

itemEvents.on("failed", async ({ jobId, failedReason }) => {
  const job = await itemQueue.getJob(jobId);
  if (job) {
    const isErrorFromApp = failedReason.startsWith("APP:");

    if (!isErrorFromApp) {
      console.error(failedReason);
    }

    const safeFailedReason = isErrorFromApp
      ? failedReason.replace("APP:", "")
      : "Unknown error. Contact support.";

    await upsertFailedItem(
      job.data.knowledgeGroupId,
      job.data.url,
      safeFailedReason,
      job.data.processId
    );
    await checkGroupCompletion(job);
  }
});

itemEvents.on("completed", async ({ jobId }) => {
  const job = await itemQueue.getJob(jobId);
  if (job) {
    await checkGroupCompletion(job);
  }
});

const groupWorker = new Worker<GroupData>(
  GROUP_QUEUE_NAME,
  async (job: Job<GroupData>) => {
    const data = job.data;

    const knowledgeGroup = await prisma.knowledgeGroup.findFirstOrThrow({
      where: { id: data.knowledgeGroupId },
      include: {
        scrape: {
          include: {
            user: true,
          },
        },
      },
    });

    if (knowledgeGroup.updateProcessId !== data.processId) {
      return;
    }

    const source = makeSource(knowledgeGroup.type);
    await source.updateGroup(data, knowledgeGroup);
  },
  {
    connection: redis,
    prefix: BULLMQ_PREFIX,
    concurrency: 1,
  }
);

const itemWorker = new Worker<ItemData>(
  ITEM_QUEUE_NAME,
  async (job: Job<ItemData>) => {
    const data = job.data;

    const knowledgeGroup = await prisma.knowledgeGroup.findFirstOrThrow({
      where: { id: data.knowledgeGroupId },
      include: {
        scrape: {
          include: {
            user: true,
          },
        },
      },
    });

    if (knowledgeGroup.updateProcessId !== data.processId) {
      return;
    }

    const source = makeSource(knowledgeGroup.type);
    const { page } = await source.updateItem(data, knowledgeGroup);

    if (job.data.cursor) {
      await scheduleGroup(knowledgeGroup, job.data.processId, {
        cursor: job.data.cursor,
      });
    }

    if (page) {
      await upsertItem(
        knowledgeGroup.scrape,
        knowledgeGroup,
        knowledgeGroup.scrape.user.plan,
        data.url,
        data.sourcePageId,
        page.title,
        page.text,
        data.processId
      );
    }
  },
  {
    connection: redis,
    prefix: BULLMQ_PREFIX,
    concurrency: 4,
  }
);

console.log("sync-worker started");

process.on("SIGTERM", async () => {
  console.log("sync-worker shutting down");
  await groupWorker.close();
  await itemWorker.close();
  await itemEvents.close();
  await redis.quit();
  process.exit(0);
});
