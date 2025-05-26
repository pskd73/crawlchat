import { Group, Stack } from "@chakra-ui/react";
import { Outlet, useFetcher } from "react-router";
import type { Route } from "./+types/layout";
import { AppContext, useApp } from "./context";
import { getAuthUser } from "~/auth/middleware";
import { Toaster } from "~/components/ui/toaster";
import { SideMenu } from "./side-menu";
import {
  DrawerBackdrop,
  DrawerContent,
  DrawerRoot,
} from "~/components/ui/drawer";
import { useRef } from "react";
import { PLAN_FREE } from "libs/user-plan";
import { planMap } from "libs/user-plan";
import { prisma } from "libs/prisma";
import { commitSession, getSession } from "~/session";

export function meta() {
  return [
    {
      title: "CrawlChat",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request, { redirectTo: "/login" });

  const session = await getSession(request.headers.get("cookie"));
  const scrapeId = session.get("scrapeId");

  const plan = user!.plan?.planId ? planMap[user!.plan.planId] : PLAN_FREE;

  const scrapes = await prisma.scrape.findMany({
    where: {
      userId: user!.id,
    },
  });

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

  const toBeFixedMessages = await prisma.message.count({
    where: {
      ownerUserId: user!.id,
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

  return {
    user: user!,
    plan,
    scrapes,
    scrapeId,
    toBeFixedMessages,
    openTickets,
  };
}

const drawerWidth = 260;

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const app = useApp({ user, scrapeId: loaderData.scrapeId });
  const contentRef = useRef<HTMLDivElement>(null);
  const scrapeIdFetcher = useFetcher();

  return (
    <AppContext.Provider value={app}>
      <Group align="start" gap={0} w="full" minH="100dvh">
        <SideMenu
          width={drawerWidth}
          user={user}
          fixed={true}
          plan={loaderData.plan}
          scrapes={loaderData.scrapes}
          scrapeId={loaderData.scrapeId}
          scrapeIdFetcher={scrapeIdFetcher}
          toBeFixedMessages={loaderData.toBeFixedMessages}
          openTickets={loaderData.openTickets}
        />

        <DrawerRoot
          open={app.menuOpen}
          size={"xs"}
          placement={"start"}
          onOpenChange={(e) => !e.open && app.setMenuOpen(false)}
        >
          <DrawerBackdrop />
          <DrawerContent ref={contentRef}>
            <SideMenu
              width={drawerWidth}
              user={user}
              fixed={false}
              contentRef={contentRef}
              plan={loaderData.plan}
              scrapes={loaderData.scrapes}
              scrapeId={loaderData.scrapeId}
              scrapeIdFetcher={scrapeIdFetcher}
              toBeFixedMessages={loaderData.toBeFixedMessages}
              openTickets={loaderData.openTickets}
            />
          </DrawerContent>
        </DrawerRoot>

        <Stack flex={1} alignSelf={"stretch"} ml={[0, 0, drawerWidth]}>
          <Outlet />
        </Stack>
      </Group>
      <Toaster />
    </AppContext.Provider>
  );
}
