import { prisma } from "libs/prisma";

export async function getTotalPageChunks(knowledgeGroupId: string) {
  const result = (await prisma.$runCommandRaw({
    aggregate: "ScrapeItem",
    pipeline: [
      {
        $match: {
          knowledgeGroupId: { $oid: knowledgeGroupId },
        },
      },
      {
        $project: {
          embeddingsCount: {
            $cond: {
              if: { $isArray: "$embeddings" },
              then: { $size: "$embeddings" },
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalEmbeddings: { $sum: "$embeddingsCount" },
        },
      },
    ],
    cursor: {},
  })) as any;

  return result.cursor?.firstBatch?.[0]?.totalEmbeddings || 0;
}
