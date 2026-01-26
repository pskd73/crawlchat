import { prisma } from "@packages/common/prisma";
import { GroupForSource } from "./interface";
import { GroupData, groupQueue, ItemData, itemQueue, redis } from "./queue";

function cleanUrl(url: string) {
  return url.replace(/https?:\/\//, "").replace(/\/$/, "");
}

function makeScheduledKey(url: string, processId: string) {
  return `scheduled:${processId}:${url}`;
}

function makePendingUrlsKey(processId: string) {
  return `pending-urls:${processId}`;
}

async function markScheduledIfNotExists(
  url: string,
  processId: string
): Promise<boolean> {
  const result = await redis.set(
    makeScheduledKey(cleanUrl(url), processId),
    "1",
    "EX",
    60 * 60 * 24,
    "NX"
  );
  return result === "OK";
}

export async function incrementPendingUrls(processId: string) {
  await redis.incr(makePendingUrlsKey(processId));
}

export async function decrementPendingUrls(processId: string) {
  await redis.decr(makePendingUrlsKey(processId));
}

export async function getPendingUrls(processId: string) {
  const count = await redis.get(makePendingUrlsKey(processId));
  return count ? parseInt(count) : 0;
}

export async function scheduleUrl(
  group: GroupForSource,
  processId: string,
  url: string,
  sourcePageId: string,
  jobData?: Partial<ItemData>
) {
  const knowledgeGroup = await prisma.knowledgeGroup.findFirst({
    where: { id: group.id },
  });

  if (!knowledgeGroup) {
    throw new Error("Knowledge group not found");
  }

  if (!jobData?.standAlone && knowledgeGroup.status !== "processing") {
    return null;
  }

  if (!(await markScheduledIfNotExists(url, processId))) {
    return null;
  }

  await itemQueue.add(
    "item",
    {
      ...jobData,
      processId: processId,
      knowledgeGroupId: group.id,
      url,
      sourcePageId,
    },
    { delay: 0 }
  );
}

export async function scheduleGroup(
  group: GroupForSource,
  processId: string,
  jobData?: Partial<GroupData>
) {
  await groupQueue.add("group", {
    ...jobData,
    scrapeId: group.scrapeId,
    knowledgeGroupId: group.id,
    userId: group.userId,
    processId,
  });
}

export async function scheduleUrls(
  group: GroupForSource,
  processId: string,
  urls: Array<{
    url: string;
    sourcePageId: string;
    jobData?: Partial<ItemData>;
  }>,
  cursor?: string
) {
  for (let i = 0; i < urls.length; i++) {
    const { url, sourcePageId, jobData } = urls[i];
    await scheduleUrl(group, processId, url, sourcePageId, {
      ...jobData,
      cursor: i === urls.length - 1 ? cursor : undefined,
    });
  }
}
