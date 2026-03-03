import type {
  CreditTransaction,
  CreditTransactionPurpose,
  CreditTransactionType,
} from "@prisma/client";
import { prisma } from "./prisma";

export async function getBalance(
  userId: string,
  purpose: CreditTransactionPurpose
): Promise<number> {
  const snapshot = await prisma.creditSnapshot.findUnique({
    where: {
      userId_purpose: {
        userId,
        purpose,
      },
    },
  });

  const snapshotBalance = snapshot?.balance ?? 0;
  const snapshotUpdatedAt = snapshot?.updatedAt;

  const matchStage: any = {
    userId: { $oid: userId },
    purpose: purpose,
  };

  if (snapshotUpdatedAt) {
    matchStage.createdAt = { $gt: snapshotUpdatedAt };
  }

  const result = (await prisma.$runCommandRaw({
    aggregate: "CreditTransaction",
    pipeline: [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: "$credits" },
        },
      },
    ],
    cursor: {},
  })) as any;

  const recentTransactionsSum = result.cursor?.firstBatch?.[0]?.total ?? 0;

  return snapshotBalance + recentTransactionsSum;
}

export async function addCreditTransaction(
  userId: string,
  type: CreditTransactionType,
  purpose: CreditTransactionPurpose,
  description: string,
  credits: number,
  amount?: number,
  messageId?: string,
  scrapeId?: string
): Promise<CreditTransaction> {
  return prisma.creditTransaction.create({
    data: {
      userId,
      credits,
      amount,
      type,
      purpose,
      description,
      messageId,
      scrapeId,
    },
  });
}

export async function getTotal(
  userId: string,
  purpose: CreditTransactionPurpose,
  type: 1 | -1,
  fromDate: Date
): Promise<number> {
  const result = (await prisma.$runCommandRaw({
    aggregate: "CreditTransaction",
    pipeline: [
      {
        $match: {
          userId: { $oid: userId },
          purpose,
          credits: type === 1 ? { $gte: 0 } : { $lt: 0 },
          $expr: {
            $gte: [
              "$createdAt",
              { $dateFromString: { dateString: fromDate.toISOString() } },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$credits" },
        },
      },
    ],
    cursor: {},
  })) as any;

  return result.cursor?.firstBatch?.[0]?.total ?? 0;
}

export async function updateCreditSnapshot(
  userId: string,
  purpose: CreditTransactionPurpose
): Promise<void> {
  const balance = await getBalance(userId, purpose);

  await prisma.creditSnapshot.upsert({
    where: {
      userId_purpose: {
        userId,
        purpose,
      },
    },
    update: {
      balance,
      updatedAt: new Date(),
    },
    create: {
      userId,
      purpose,
      balance,
      updatedAt: new Date(),
    },
  });
}

export async function updateAllCreditSnapshots(
  purpose: CreditTransactionPurpose
): Promise<void> {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  for (const user of users) {
    await updateCreditSnapshot(user.id, purpose);
  }
}

export async function getCreditTransactions(
  userId?: string,
  scrapeId?: string,
  page: number = 1,
  limit: number = 50
): Promise<{ transactions: CreditTransaction[]; total: number }> {
  if (!userId && !scrapeId) {
    throw new Error("Either userId or scrapeId must be provided");
  }

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: { userId, scrapeId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.creditTransaction.count({
      where: { userId, scrapeId },
    }),
  ]);

  return { transactions, total };
}
