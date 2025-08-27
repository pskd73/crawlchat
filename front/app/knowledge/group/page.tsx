import type { Route } from "./+types/page";
import { prisma } from "libs/prisma";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { Page } from "~/components/page";
import {
  TbBook2,
  TbBrandDiscord,
  TbBrandGithub,
  TbSettings,
  TbWorld,
} from "react-icons/tb";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useMemo } from "react";
import { createToken } from "libs/jwt";
import { ActionButton } from "./action-button";
import cn from "@meltdownjs/cn";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: { id: scrapeId },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  const knowledgeGroup = await prisma.knowledgeGroup.findUnique({
    where: { id: params.groupId },
  });

  if (!knowledgeGroup) {
    throw new Response("Not found", { status: 404 });
  }

  const items = await prisma.scrapeItem.count({
    where: {
      knowledgeGroupId: knowledgeGroup.id,
    },
  });

  return { scrape, knowledgeGroup, items };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "refresh") {
    const knowledgeGroupId = params.groupId;

    if (!knowledgeGroupId) {
      return { error: "Knowledge group ID is required" };
    }

    await prisma.knowledgeGroup.update({
      where: { id: knowledgeGroupId },
      data: { status: "processing" },
    });

    const token = createToken(user!.id);
    await fetch(`${process.env.VITE_SERVER_URL}/scrape`, {
      method: "POST",
      body: JSON.stringify({
        scrapeId,
        knowledgeGroupId,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    await prisma.knowledgeGroup.update({
      where: { id: knowledgeGroupId },
      data: { status: "processing" },
    });

    return { success: true };
  }

  if (intent === "stop") {
    const knowledgeGroupId = params.groupId;

    if (!knowledgeGroupId) {
      return { error: "Knowledge group ID is required" };
    }

    await prisma.knowledgeGroup.update({
      where: { id: knowledgeGroupId },
      data: { status: "done" },
    });

    return { success: true };
  }
}

export default function KnowledgeGroupPage({
  loaderData,
}: Route.ComponentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = useMemo(() => {
    return location.pathname;
  }, [location.pathname]);

  const tabs = useMemo(() => {
    return [
      {
        value: `/knowledge/group/${loaderData.knowledgeGroup.id}`,
        label: "Settings",
        icon: <TbSettings />,
      },
      {
        value: `/knowledge/group/${loaderData.knowledgeGroup.id}/items`,
        label: `Knowledge items (${loaderData.items})`,
        icon: <TbBook2 />,
      },
    ];
  }, [loaderData.knowledgeGroup.id, loaderData.items]);

  function handleTabChange(value: string) {
    navigate(value);
  }

  function getIcon() {
    if (loaderData.knowledgeGroup.type === "scrape_github") {
      return <TbBrandGithub />;
    }

    if (loaderData.knowledgeGroup.type === "scrape_web") {
      return <TbWorld />;
    }

    if (loaderData.knowledgeGroup.type === "learn_discord") {
      return <TbBrandDiscord />;
    }

    return <TbBook2 />;
  }

  return (
    <Page
      title={loaderData.knowledgeGroup.title ?? "Untitled"}
      icon={getIcon()}
      right={<ActionButton group={loaderData.knowledgeGroup} />}
    >
      <div className="flex flex-col gap-6 flex-1">
        <div role="tablist" className="tabs tabs-lift w-fit shadow-none p-0">
          {tabs.map((tab) => (
            <Link
              to={tab.value}
              role="tab"
              className={cn(
                "tab gap-2",
                tab.value === activeTab && "tab-active"
              )}
              key={tab.value}
            >
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </div>

        <Outlet />
      </div>
    </Page>
  );
}
