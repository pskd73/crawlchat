import { Group, Stack } from "@chakra-ui/react";
import { Outlet } from "react-router";
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

export function meta() {
  return [
    {
      title: "CrawlChat",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request, { redirectTo: "/login" });

  const plan = user!.plan?.planId ? planMap[user!.plan.planId] : PLAN_FREE;

  return { user: user!, plan };
}

const drawerWidth = 260;

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const app = useApp(user);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <AppContext.Provider value={app}>
      <Group align="start" gap={0} w="full" minH="100dvh">
        <SideMenu
          width={drawerWidth}
          user={user}
          fixed={true}
          plan={loaderData.plan}
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
