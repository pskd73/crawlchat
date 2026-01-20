import type { Route } from "./+types/groups";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "libs/prisma";
import moment from "moment";
import {
  TbAutomation,
  TbBook,
  TbBrandDiscord,
  TbBrandGithub,
  TbBrandNotion,
  TbBrandSlack,
  TbFile,
  TbPlus,
  TbVideo,
  TbWorld,
} from "react-icons/tb";
import { Link } from "react-router";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { Page } from "~/components/page";
import { useMemo } from "react";
import { GroupStatus } from "./group/status";
import { ActionButton } from "./group/action-button";
import { SiDocusaurus, SiLinear } from "react-icons/si";
import { EmptyState } from "~/components/empty-state";
import cn from "@meltdownjs/cn";
import { makeMeta } from "~/meta";
import { FaConfluence } from "react-icons/fa";
import { Timestamp } from "~/components/timestamp";
import { createToken } from "libs/jwt";
import KnowledgeSearch, { type ItemSearchResult } from "./search";
import { getTotalPageChunks } from "./group/page-chunks";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: { id: scrapeId },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  const knowledgeGroups = await prisma.knowledgeGroup.findMany({
    where: { scrapeId: scrape.id },
    orderBy: { createdAt: "desc" },
  });

  const counts: Record<string, number> = {};
  for (const group of knowledgeGroups) {
    counts[group.id] = await prisma.scrapeItem.count({
      where: { knowledgeGroupId: group.id },
    });
  }

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const citationCounts: Record<string, number> = {};
  for (const group of knowledgeGroups) {
    const messages = await prisma.message.findMany({
      where: {
        scrapeId,
        links: { some: { knowledgeGroupId: group.id } },
        createdAt: { gte: ONE_WEEK_AGO },
      },
      select: {
        links: {
          select: {
            knowledgeGroupId: true,
          },
        },
      },
    });
    const links = messages
      .flatMap((m) => m.links)
      .filter((l) => l.knowledgeGroupId === group.id);
    citationCounts[group.id] = links.length;
  }

  const token = createToken(user!.id);

  const url = new URL(request.url);
  const query = url.searchParams.get("query");

  const pageChunks: Record<string, number> = {};
  for (const group of knowledgeGroups) {
    pageChunks[group.id] = await getTotalPageChunks(group.id);
  }

  return {
    scrape,
    knowledgeGroups,
    counts,
    citationCounts,
    token,
    query,
    pageChunks,
  };
}

export function meta() {
  return makeMeta({
    title: "Knowledge - CrawlChat",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "search") {
    const search = formData.get("search") as string;

    const isUrl = search.startsWith("http");
    const results: ItemSearchResult[] = [];

    if (isUrl) {
      const items = await prisma.scrapeItem.findMany({
        where: {
          scrapeId,
          url: search,
        },
        include: {
          knowledgeGroup: true,
        },
      });

      for (const item of items) {
        results.push({
          item,
          knowledgeGroup: item.knowledgeGroup!,
          score: 1,
        });
      }
    } else {
      const token = createToken(user!.id);
      const searchResponse = await fetch(
        `${process.env.VITE_SERVER_URL}/search-items/${scrapeId}?query=${search}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await searchResponse.json();
      for (const result of data.results) {
        const url = result.url;
        const item = await prisma.scrapeItem.findFirst({
          where: {
            scrapeId,
            url,
          },
          include: {
            knowledgeGroup: true,
          },
        });
        if (item) {
          results.push({
            item,
            knowledgeGroup: item.knowledgeGroup!,
            score: result.score,
          });
        }
      }
    }

    return { results: results.sort((a, b) => b.score - a.score) };
  }
}

export default function KnowledgeGroups({ loaderData }: Route.ComponentProps) {
  const groups = useMemo(() => {
    return loaderData.knowledgeGroups.map((group) => {
      let icon = <TbBook />;
      let typeText = "Unknown";

      if (group.type === "scrape_web") {
        icon = <TbWorld />;
        typeText = "Web";

        if (group.subType === "docusaurus") {
          typeText = "Docusaurus";
          icon = <SiDocusaurus />;
        }
      } else if (group.type === "scrape_github") {
        icon = <TbBrandGithub />;
        typeText = "GitHub";
      } else if (group.type === "learn_discord") {
        icon = <TbBrandDiscord />;
        typeText = "Discord";
      } else if (group.type === "learn_slack") {
        icon = <TbBrandSlack />;
        typeText = "Slack";
      } else if (group.type === "github_issues") {
        icon = <TbBrandGithub />;
        typeText = "GH Issues";
      } else if (group.type === "github_discussions") {
        icon = <TbBrandGithub />;
        typeText = "GH Discussions";
      } else if (group.type === "upload") {
        icon = <TbFile />;
        typeText = "File";
      } else if (group.type === "notion") {
        icon = <TbBrandNotion />;
        typeText = "Notion";
      } else if (group.type === "confluence") {
        icon = <FaConfluence />;
        typeText = "Confluence";
      } else if (group.type === "linear") {
        icon = <SiLinear />;
        typeText = "Linear Issues";
      } else if (group.type === "linear_projects") {
        icon = <SiLinear />;
        typeText = "Linear Projects";
      } else if (group.type === "youtube") {
        icon = <TbVideo />;
        typeText = "YouTube";
      } else if (group.type === "youtube_channel") {
        icon = <TbVideo />;
        typeText = "YouTube Channel";
      } else if (group.type === "custom") {
        icon = <TbBook />;
        typeText = "Custom";
      }

      const totalCited = Object.values(loaderData.citationCounts).reduce(
        (acc, count) => acc + count,
        0
      );

      return {
        icon,
        typeText,
        group,
        citationPct:
          totalCited > 0
            ? (loaderData.citationCounts[group.id] / totalCited) * 100
            : 0,
        totalCited,
        citedNum: loaderData.citationCounts[group.id],
      };
    });
  }, [loaderData.knowledgeGroups]);

  return (
    <Page
      title="Knowledge"
      icon={<TbBook />}
      right={
        <Link className="btn btn-soft btn-primary" to="/knowledge/group">
          <TbPlus />
          Add group
        </Link>
      }
    >
      {groups.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1">
          <EmptyState
            title="No knowledge groups"
            description="Create a new knowledge group to get started."
            icon={<TbBook />}
          >
            <Link className="btn btn-primary" to="/knowledge/group">
              <TbPlus />
              Create a group
            </Link>
          </EmptyState>
        </div>
      )}
      {groups.length > 0 && (
        <div className="flex flex-col gap-4">
          <KnowledgeSearch query={loaderData.query} />
          <div
            className={cn(
              "overflow-x-auto border border-base-300",
              "rounded-box bg-base-200/50 shadow"
            )}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Citation</th>
                  <th>Page chunks</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((item) => (
                  <tr key={item.group.id}>
                    <td>
                      <div className="badge badge-soft badge-primary">
                        {item.icon}
                        {item.typeText}
                      </div>
                    </td>
                    <td>
                      <Link
                        className="link link-hover line-clamp-1 max-w-40"
                        to={`/knowledge/group/${item.group.id}`}
                      >
                        {item.group.title ?? "Untitled"}
                      </Link>
                    </td>
                    <td className="min-w-20">
                      <div
                        className="tooltip"
                        data-tip={`${item.citedNum} / ${item.totalCited}`}
                      >
                        <progress
                          className="progress w-14"
                          value={item.citationPct}
                          max="100"
                        />
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-soft badge-primary">
                        {loaderData.pageChunks[item.group.id] ?? 0}
                      </span>
                    </td>
                    <td className="min-w-38">
                      <GroupStatus status={item.group.status} />
                    </td>
                    <td className="min-w-56">
                      <div className="flex items-center gap-2">
                        <Timestamp date={item.group.updatedAt} />
                        {item.group.nextUpdateAt && (
                          <div
                            className="tooltip"
                            data-tip={`Next update at ${moment(
                              item.group.nextUpdateAt
                            ).format("DD/MM/YYYY HH:mm A")}`}
                          >
                            <span className="badge badge-soft badge-primary ml-1">
                              <TbAutomation />
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {[
                          "scrape_web",
                          "scrape_github",
                          "github_issues",
                          "github_discussions",
                          "notion",
                          "confluence",
                          "linear",
                          "youtube",
                          "youtube_channel",
                        ].includes(item.group.type) && (
                          <ActionButton
                            group={item.group}
                            token={loaderData.token}
                            small
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Page>
  );
}
