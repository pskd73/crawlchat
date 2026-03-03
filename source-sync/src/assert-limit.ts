import { prisma, UserPlan } from "@packages/common/prisma";
import { getPagesCount, PLAN_FREE } from "@packages/common/user-plan";

export const assertLimit = async (
  url: string,
  n: number,
  scrapeId: string,
  userId: string,
  userPlan: UserPlan | null
) => {
  const existingItem = await prisma.scrapeItem.findFirst({
    where: { scrapeId: scrapeId, url },
  });
  if (existingItem) {
    return;
  }

  const limit = userPlan?.limits?.pages ?? PLAN_FREE.limits.pages;
  const pagesCount = await getPagesCount(userId);
  if (pagesCount + n <= limit) {
    return;
  }
  throw new Error("Pages limit reached for the plan");
};
