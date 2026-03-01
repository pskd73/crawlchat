import { prisma } from "./prisma";
import type {
  CreditTransactionType,
  CreditTransactionPurpose,
  CreditTransaction,
} from "@prisma/client";

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
