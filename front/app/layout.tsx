import cn from "@meltdownjs/cn";
import { createToken } from "@packages/common/jwt";
import { prisma } from "@packages/common/prisma";
import {
  allActivePlans,
  getPagesCount,
  PLAN_FREE,
  planMap,
} from "@packages/common/user-plan";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { Outlet, useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { getLatestChangelog } from "~/changelog/fetch";
import { AppContext, useApp } from "~/components/app-context";
import { showModal } from "~/components/daisy-utils";
import { SideMenu } from "~/components/side-menu";
import { UpgradeModal } from "~/components/upgrade-modal";
import { fetchDataGaps } from "~/data-gaps/fetch";
import { makeMeta } from "~/meta";
import { getSession } from "~/session";
import type { Route } from "./+types/layout";
import { planProductIdMap } from "./payment/gateway-dodo";
import { getUserMessageCredits } from "./user-message-credits";

export function meta() {
  return makeMeta({
    title: "CrawlChat",
    description:
      "Make AI chatbot from your documentation that handles your support queries. Embed it in your website, Discord, or Slack.",
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request, { redirectTo: "/login" });

  const session = await getSession(request.headers.get("cookie"));
  const scrapeId = session.get("scrapeId");

  const scrapeUsers = await prisma.scrapeUser.findMany({
    where: {
      userId: user!.id,
    },
    include: {
      scrape: {
        include: {
          user: true,
        },
      },
    },
  });
  const scrapes = scrapeUsers.map((su) => su.scrape);

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

  const toBeFixedMessages = await prisma.message.count({
    where: {
      scrapeId,
      createdAt: { gte: ONE_WEEK_AGO },
      rating: "down",
      OR: [{ correctionItemId: { isSet: false } }, { correctionItemId: null }],
    },
  });

  const openTickets = await prisma.thread.count({
    where: {
      scrapeId,
      ticketStatus: "open",
    },
  });

  const scrape = scrapes.find((s) => s.id === scrapeId);
  const plan = scrape?.user.plan?.planId
    ? planMap[scrape.user.plan.planId]
    : user!.plan?.planId
      ? planMap[user!.plan.planId]
      : PLAN_FREE;

  const dataGapMessages = scrapeId ? await fetchDataGaps(scrapeId) : [];

  const usedPages = await getPagesCount(scrape?.userId ?? user!.id);

  const token = createToken(user!.id, { expiresInSeconds: 60 * 60 });

  const url = new URL(request.url);
  const pathname = url.pathname;

  const latestChangelog = getLatestChangelog();

  const owner = scrape?.user ?? user!;
  const messageCredits = await getUserMessageCredits(owner.id);

  const plans = allActivePlans.map((plan) => ({
    ...plan,
    url: `/checkout/${planProductIdMap[plan.id]}`,
  }));

  return {
    user: user!,
    plan,
    scrapes,
    scrapeId,
    toBeFixedMessages,
    openTickets,
    scrape,
    dataGapMessages,
    plans,
    usedPages,
    scrapeUsers,
    token,
    pathname,
    latestChangelog,
    messageCredits,
  };
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const app = useApp({
    user,
    scrapeUsers: loaderData.scrapeUsers,
    scrapeId: loaderData.scrapeId,
    scrape: loaderData.scrape,
    latestChangelog: loaderData.latestChangelog,
  });
  const scrapeIdFetcher = useFetcher();

  useEffect(() => {
    (async () => {
      (window as any)?.vmtrc?.("identify", {
        identifier: user.id,
        displayName: user.name,
      });
    })();
  }, []);

  useEffect(() => {
    if (app.shouldUpgrade) {
      showModal("upgrade-modal");
    }
  }, [app.shouldUpgrade]);

  return (
    <AppContext.Provider value={app}>
      <div
        data-theme="brand"
        className={cn("min-h-screen drawer md:drawer-open bg-base-200")}
      >
        <input
          type="checkbox"
          id="side-menu-drawer"
          className="drawer-toggle"
          suppressHydrationWarning
        />
        <div className="drawer-content flex-1">
          <div className="flex flex-col gap-2 h-full self-stretch">
            <Outlet />
          </div>
        </div>

        <div className="drawer-side z-20">
          <label
            htmlFor="side-menu-drawer"
            aria-label="close sidebar"
            className="drawer-overlay"
          />
          <div
            className={cn(
              "h-full w-68 bg-base-100 overflow-auto",
              "md:border-r md:border-base-300"
            )}
          >
            <SideMenu
              loggedInUser={user}
              scrapeOwner={loaderData.scrape?.user}
              plan={loaderData.plan}
              scrapes={loaderData.scrapes}
              scrapeId={loaderData.scrapeId}
              scrapeIdFetcher={scrapeIdFetcher}
              toBeFixedMessages={loaderData.toBeFixedMessages}
              openTickets={loaderData.openTickets}
              dataGapMessages={loaderData.dataGapMessages.length}
              scrape={loaderData.scrape}
              usedPages={loaderData.usedPages}
              pathname={loaderData.pathname}
              messageBalance={loaderData.messageCredits.balance}
              messageTotal={loaderData.messageCredits.total}
            />
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
      <UpgradeModal plans={loaderData.plans} />
    </AppContext.Provider>
  );
}
