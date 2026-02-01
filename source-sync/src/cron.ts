import dotenv from "dotenv";
dotenv.config();

import { prisma } from "@packages/common/prisma";
import { exit } from "process";
import { getNextUpdateTime } from "@packages/common/knowledge-group";
import { scheduleGroup } from "./source/schedule";
import { v4 as uuidv4 } from "uuid";

async function updateKnowledgeGroup(groupId: string) {
  console.log(`Updating knowledge group ${groupId}`);

  const knowledgeGroup = await prisma.knowledgeGroup.findUnique({
    where: {
      id: groupId,
    },
    include: {
      scrape: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!knowledgeGroup) {
    throw new Error(`Knowledge group ${groupId} not found`);
  }

  const processId = uuidv4();

  await prisma.knowledgeGroup.update({
    where: { id: knowledgeGroup.id },
    data: {
      status: "processing",
      updateProcessId: processId,
    },
  });

  await scheduleGroup(knowledgeGroup, processId);

  await prisma.knowledgeGroup.update({
    where: { id: knowledgeGroup.id },
    data: {
      nextUpdateAt: getNextUpdateTime(
        knowledgeGroup.updateFrequency,
        new Date()
      ),
    },
  });
}

async function updateKnowledgeBases() {
  const knowledgeGroups = await prisma.knowledgeGroup.findMany({
    where: {
      nextUpdateAt: {
        lte: new Date(),
        not: null,
      },
    },
  });

  console.log(`Found ${knowledgeGroups.length} knowledge groups to update`);

  for (const knowledgeGroup of knowledgeGroups) {
    if (["processing"].includes(knowledgeGroup.status)) {
      continue;
    }

    try {
      await updateKnowledgeGroup(knowledgeGroup.id);
    } catch (error) {
      console.log(`Error updating knowledge group ${knowledgeGroup.id}`);
      console.error(error);
    }
  }

  exit(0);
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

  if (jobName === "update-knowledge-base") {
    return await updateKnowledgeBases();
  }

  console.error("Invalid job name", jobName);
  exit(1);
}

main();
