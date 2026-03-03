import type { Prisma, Scrape, User } from "@packages/common/prisma";
import { createContext, useEffect, useMemo, useState } from "react";
import type { BlogPost } from "~/blog/posts";
import type { SetupProgressAction } from "../setup-progress/config";

export const useApp = ({
  user,
  scrapeUsers,
  scrapeId,
  scrape,
  latestChangelog,
}: {
  user: User;
  scrapeUsers: Prisma.ScrapeUserGetPayload<{
    include: {
      scrape: {
        include: {
          user: true;
        };
      };
    };
  }>[];
  scrapeId?: string;
  scrape?: Scrape;
  latestChangelog?: BlogPost;
}) => {
  const [containerWidth, setContainerWidth] = useState<number>();
  const [progressActions, setProgressActions] = useState<SetupProgressAction[]>(
    []
  );
  const [closedReleaseKey, setClosedReleaseKey] = useState<string | null>();
  const shouldUpgrade = useMemo(() => {
    if (user.plan?.subscriptionId) {
      return false;
    }
    return !scrapeUsers.find((su) => su.scrape.user.plan?.subscriptionId);
  }, [scrapeUsers]);

  useEffect(() => {
    const key = localStorage.getItem("closedReleaseKey");
    setClosedReleaseKey(key ?? null);
  }, []);

  useEffect(() => {
    if (closedReleaseKey) {
      localStorage.setItem("closedReleaseKey", closedReleaseKey);
    }
  }, [closedReleaseKey]);

  return {
    user,
    containerWidth,
    setContainerWidth,
    scrapeId,
    progressActions,
    setProgressActions,
    scrape,
    closedReleaseKey,
    setClosedReleaseKey,
    shouldUpgrade,
    latestChangelog,
  };
};

export const AppContext = createContext({} as ReturnType<typeof useApp>);
