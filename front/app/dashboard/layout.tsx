import type { Route } from "./+types/layout";
import { Outlet, useFetcher } from "react-router";
import { AppContext, useApp } from "./context";
import { getAuthUser } from "~/auth/middleware";
import { SideMenu } from "./side-menu";
import { useEffect } from "react";
import { PLAN_FREE } from "libs/user-plan";
import { planMap } from "libs/user-plan";
import { prisma } from "libs/prisma";
import { getSession } from "~/session";
import { vemetric } from "@vemetric/react";
import { fetchDataGaps } from "~/data-gaps/fetch";
import { Toaster } from "react-hot-toast";

export function meta() {
  return [
    {
      title: "CrawlChat",
    },
    {
      name: "description",
      content:
        "Make AI chatbot from your documentation that handles your support queries. Embed it in your website, Discord, or Slack.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request, { redirectTo: "/login" });

  const session = await getSession(request.headers.get("cookie"));
  const scrapeId = session.get("scrapeId");

  const scrapes = await prisma.scrapeUser
    .findMany({
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
    })
    .then((scrapeUsers) => scrapeUsers.map((su) => su.scrape));

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
    : PLAN_FREE;

  const dataGapMessages = scrapeId ? await fetchDataGaps(scrapeId) : [];

  return {
    user: user!,
    plan,
    scrapes,
    scrapeId,
    toBeFixedMessages,
    openTickets,
    scrape,
    dataGapMessages,
  };
}

const drawerWidth = 260;

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const app = useApp({ user, scrapeId: loaderData.scrapeId });
  const scrapeIdFetcher = useFetcher();

  useEffect(() => {
    (async () => {
      await vemetric.identify({
        identifier: user.id,
        displayName: user.name ?? "Unnamed",
      });
    })();
  }, []);

  return (
    <AppContext.Provider value={app}>
      <div
        data-theme="brand"
        className="min-h-screen drawer md:drawer-open bg-base-100"
      >
        <input
          type="checkbox"
          id="side-menu-drawer"
          className="drawer-toggle"
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
          <div className="min-h-full w-68 p-4 bg-base-100">
            <SideMenu
              loggedInUser={user}
              scrapeOwner={loaderData.scrape?.user!}
              plan={loaderData.plan}
              scrapes={loaderData.scrapes}
              scrapeId={loaderData.scrapeId}
              scrapeIdFetcher={scrapeIdFetcher}
              toBeFixedMessages={loaderData.toBeFixedMessages}
              openTickets={loaderData.openTickets}
              dataGapMessages={loaderData.dataGapMessages.length}
              scrape={loaderData.scrape}
            />
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </AppContext.Provider>
  );
}
