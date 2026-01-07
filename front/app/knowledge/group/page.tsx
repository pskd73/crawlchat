import type { Route } from "./+types/page";
import { prisma } from "libs/prisma";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { Page } from "~/components/page";
import {
  TbBook2,
  TbBrandDiscord,
  TbBrandGithub,
  TbBrandNotion,
  TbBrandSlack,
  TbCircleX,
  TbFile,
  TbSettings,
  TbVideo,
  TbWorld,
} from "react-icons/tb";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useMemo } from "react";
import { createToken } from "libs/jwt";
import { ActionButton } from "./action-button";
import cn from "@meltdownjs/cn";
import { makeMeta } from "~/meta";
import { FaConfluence } from "react-icons/fa";
import { SiLinear } from "react-icons/si";

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
    where: { id: params.groupId, scrapeId },
  });

  if (!knowledgeGroup) {
    throw new Response("Not found", { status: 404 });
  }

  const items = await prisma.scrapeItem.count({
    where: {
      knowledgeGroupId: knowledgeGroup.id,
    },
  });

  const token = createToken(user!.id, {
    expiresInSeconds: 60 * 60,
  });

  return { scrape, knowledgeGroup, items, token };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: `${data.knowledgeGroup.title ?? "Untitled"} - CrawlChat`,
  });
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

    const group = await prisma.knowledgeGroup.update({
      where: { id: knowledgeGroupId, scrapeId },
      data: { status: "processing", fetchError: null },
    });

    const token = createToken(user!.id);
    const shouldUseSourceSync = [
      "scrape_web",
      "upload",
      "github_discussions",
      "linear_projects",
    ].includes(group.type);
    const host = shouldUseSourceSync
      ? process.env.VITE_SOURCE_SYNC_URL
      : process.env.VITE_SERVER_URL;
    const endpoint = shouldUseSourceSync ? "/update-group" : "/scrape";

    await fetch(`${host}${endpoint}`, {
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

    return { success: true };
  }

  if (intent === "stop") {
    const knowledgeGroupId = params.groupId;

    if (!knowledgeGroupId) {
      return { error: "Knowledge group ID is required" };
    }

    await prisma.knowledgeGroup.update({
      where: { id: knowledgeGroupId, scrapeId },
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
    if (loaderData.knowledgeGroup.type === "confluence") {
      return <FaConfluence />;
    }
    if (loaderData.knowledgeGroup.type === "learn_slack") {
      return <TbBrandSlack />;
    }
    if (loaderData.knowledgeGroup.type === "upload") {
      return <TbFile />;
    }
    if (loaderData.knowledgeGroup.type === "notion") {
      return <TbBrandNotion />;
    }
    if (loaderData.knowledgeGroup.type === "github_issues") {
      return <TbBrandGithub />;
    }
    if (loaderData.knowledgeGroup.type === "github_discussions") {
      return <TbBrandGithub />;
    }
    if (
      loaderData.knowledgeGroup.type === "linear" ||
      loaderData.knowledgeGroup.type === "linear_projects"
    ) {
      return <SiLinear />;
    }
    if (loaderData.knowledgeGroup.type === "youtube") {
      return <TbVideo />;
    }
    if (loaderData.knowledgeGroup.type === "youtube_channel") {
      return <TbVideo />;
    }

    return <TbBook2 />;
  }

  return (
    <Page
      title={loaderData.knowledgeGroup.title ?? "Untitled"}
      icon={getIcon()}
      right={
        <ActionButton
          group={loaderData.knowledgeGroup}
          token={loaderData.token}
        />
      }
    >
      <div className="flex flex-col gap-6 flex-1">
        {loaderData.knowledgeGroup.fetchError && (
          <div role="alert" className="alert alert-error">
            <TbCircleX size={20} />
            <span>
              Last update failed: {loaderData.knowledgeGroup.fetchError}
            </span>
          </div>
        )}

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
