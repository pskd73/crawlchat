import { Worker, Job, QueueEvents } from "bullmq";
import { prisma } from "@packages/common/prisma";
import { makeSource } from "./source/factory";
import {
  ITEM_QUEUE_NAME,
  GROUP_QUEUE_NAME,
  GroupData,
  itemQueue,
  ItemData,
  redis,
  groupQueue,
} from "./source/queue";
import { upsertFailedItem, upsertItem } from "./source/upsert-item";
import {
  decrementPendingUrls,
  getPendingUrls,
  incrementPendingUrls,
  scheduleGroup,
} from "./source/schedule";

const itemEvents = new QueueEvents(ITEM_QUEUE_NAME, {
  connection: redis,
});

const groupEvents = new QueueEvents(GROUP_QUEUE_NAME, {
  connection: redis,
});

groupEvents.on("added", async ({ jobId }) => {
  console.log(`Group job added: ${jobId}`);
  const job = await groupQueue.getJob(jobId);
  if (job) {
    await incrementPendingUrls(job.data.processId);
  }
});

groupEvents.on("failed", async ({ jobId, failedReason }) => {
  console.log(`Group job failed: ${jobId}, failed reason: ${failedReason}`);
});

groupEvents.on("completed", async ({ jobId }) => {
  const job = await groupQueue.getJob(jobId);
  if (job) {
    await decrementPendingUrls(job.data.processId);
  }
});

async function checkGroupCompletion(job: Job<ItemData>) {
  await decrementPendingUrls(job.data.processId);
  const pendingUrls = await getPendingUrls(job.data.processId);

  if (!job.data.standAlone && pendingUrls === 0) {
    await prisma.knowledgeGroup.update({
      where: { id: job.data.knowledgeGroupId },
      data: { status: "done" },
    });
    console.log(`Knowledge group ${job.data.knowledgeGroupId} completed`);
  }
}

itemEvents.on("added", async ({ jobId }) => {
  console.log(`Item job added: ${jobId}`);
  const job = await itemQueue.getJob(jobId);
  if (job) {
    await incrementPendingUrls(job.data.processId);
  }
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
      safeFailedReason
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

    if (
      !job.data.standAlone &&
      knowledgeGroup.updateProcessId !== data.processId
    ) {
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
        page.text
      );
    }
  },
  {
    connection: redis,
    concurrency: 1,
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
