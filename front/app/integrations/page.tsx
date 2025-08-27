import type { Route } from "./+types/page";
import { Page } from "~/components/page";
import { getAuthUser } from "~/auth/middleware";
import {
  TbRobotFace,
  TbCode,
  TbBrandDiscord,
  TbPlug,
  TbBrandSlack,
  TbColorSwatch,
} from "react-icons/tb";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useMemo } from "react";
import cn from "@meltdownjs/cn";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  return { user };
}

const tabs = [
  {
    value: "/connect",
    icon: <TbColorSwatch />,
    label: "Customise",
  },
  {
    value: "/connect/embed",
    icon: <TbCode />,
    label: "Embed",
  },
  {
    value: "/connect/mcp",
    icon: <TbRobotFace />,
    label: "MCP",
  },
  {
    value: "/connect/discord",
    icon: <TbBrandDiscord />,
    label: "Discord",
  },
  {
    value: "/connect/slack",
    icon: <TbBrandSlack />,
    label: "Slack",
  },
];

export default function ScrapePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = useMemo(() => {
    return location.pathname;
  }, [location.pathname]);

  function handleTabChange(value: string) {
    navigate(value);
  }

  return (
    <Page title={"Connect"} icon={<TbPlug />}>
      <div className="flex flex-col gap-4">
        <div role="tablist" className="tabs tabs-lift p-0 w-full">
          {tabs.map((tab) => (
            <a
              role="tab"
              className={cn(
                "tab gap-2",
                tab.value === activeTab && "tab-active"
              )}
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
            >
              {tab.icon}
              {tab.label}
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Outlet />
        </div>
      </div>
    </Page>
  );
}
