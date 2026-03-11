import cn from "@meltdownjs/cn";
import type { KnowledgeGroupType } from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import {
  TbChartLine,
  TbClock,
  TbClockShield,
  TbConfetti,
  TbCrown,
  TbDatabase,
  TbMessage,
  TbMessage2Bolt,
  TbMessage2Heart,
  TbMessage2Up,
  TbMoodCry,
  TbMoodHappy,
  TbPlus,
  TbThumbDown,
  TbUser,
} from "react-icons/tb";
import { redirect, useSearchParams } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { showModal } from "~/components/daisy-utils";
import { EmptyState } from "~/components/empty-state";
import { Page } from "~/components/page";
import { getMessagesSummary } from "~/messages-summary";
import { makeMeta } from "~/meta";
import { commitSession, getSession } from "~/session";
import type { Route } from "./+types/page";
import { calcUniqueUsers } from "./calc-unique-users";
import CategoryCard from "./category-card";
import { DailyMessagesChart } from "./daily-messages-chart";
import LanguageDistribution from "./language-distribution";
import { NewCollectionModal } from "./new-collection-modal";
import StatCard from "./stat-card";
import Tags from "./tags";
import { TopCitedGroups } from "./top-cited-groups";
import { TopPages } from "./top-pages";
import { UniqueUsers } from "./unique-users";

function monoString(str: string) {
  return str.trim().toLowerCase().replace(/^\n+/, "").replace(/\n+$/, "");
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const session = await getSession(request.headers.get("cookie"));
  const scrapeId = session.get("scrapeId");

  // Check scrapeId in session
  const scrapes = await prisma.scrapeUser
    .findMany({
      where: {
        userId: user!.id,
      },
      include: {
        scrape: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    .then((scrapeUsers) => scrapeUsers.map((su) => su.scrape));

  if (scrapeId && !scrapes.find((s) => s.id === scrapeId)) {
    if (scrapes.length > 0) {
      session.set("scrapeId", scrapes[0].id);
    } else {
      session.unset("scrapeId");
    }
    throw redirect("/app", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
  if (!scrapeId && scrapes.length > 0) {
    session.set("scrapeId", scrapes[0].id);
    throw redirect("/app", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  const url = new URL(request.url);
  const VALID_DAYS = [7, 14, 30, 90, 180];
  const daysParam = parseInt(url.searchParams.get("days") ?? "14", 10);
  const days = VALID_DAYS.includes(daysParam) ? daysParam : 14;
  const DAY_MS = 1000 * 60 * 60 * 24;

  const messages = await prisma.message.findMany({
    where: {
      scrapeId,
      createdAt: {
        gte: new Date(Date.now() - days * DAY_MS),
      },
    },
    select: {
      createdAt: true,
      llmMessage: {
        select: {
          role: true,
        },
      },
      rating: true,
      analysis: true,
      links: true,
      fingerprint: true,
      channel: true,
      thread: {
        select: {
          location: true,
        },
      },
    },
  });

  const nScrapeItems = scrapeId
    ? await prisma.scrapeItem.count({
        where: {
          scrapeId,
        },
      })
    : 0;

  const scrape = scrapes.find((s) => s.id === scrapeId);
  const messagesSummary = getMessagesSummary(messages);
  const categoriesSummary = scrape?.messageCategories
    ?.map((category) => ({
      title: category.title,
      summary: getMessagesSummary(
        messages.filter(
          (m) =>
            m.analysis?.category &&
            monoString(m.analysis.category) === monoString(category.title)
        ),
        true
      ),
    }))
    .sort((a, b) => b.summary.messagesCount - a.summary.messagesCount);

  const topScrapeItems = await prisma.scrapeItem.findMany({
    where: {
      scrapeId,
      url: {
        in: messagesSummary.topItems.map((item) => item.url),
      },
    },
    select: {
      id: true,
      title: true,
      url: true,
      knowledgeGroup: true,
    },
  });

  const topItems = [];
  for (const item of messagesSummary.topItems) {
    const scrapeItem = topScrapeItems.find((i) => i.url === item.url);
    if (scrapeItem) {
      topItems.push({
        id: scrapeItem.id,
        title: scrapeItem.title,
        url: scrapeItem.url,
        knowledgeGroup: scrapeItem.knowledgeGroup,
        count: item.count,
      });
    }
  }

  const allUniqueUsers = calcUniqueUsers(messages);
  const uniqueUsers = allUniqueUsers.slice(0, 10);

  const groupCitations: Record<
    string,
    {
      id: string;
      name: string;
      type: KnowledgeGroupType;
      subType: string | null;
      count: number;
    }
  > = {};
  let totalGroupCitations = 0;

  for (const message of messages) {
    for (const link of message.links) {
      if (link.knowledgeGroupId) {
        const groupId = link.knowledgeGroupId;
        if (!groupCitations[groupId]) {
          const group = await prisma.knowledgeGroup.findUnique({
            where: { id: groupId },
            select: { id: true, title: true, type: true, subType: true },
          });
          if (group) {
            groupCitations[groupId] = {
              id: group.id,
              name: group.title ?? "Untitled",
              type: group.type,
              subType: group.subType,
              count: 0,
            };
          }
        }
        if (groupCitations[groupId]) {
          groupCitations[groupId].count++;
          totalGroupCitations++;
        }
      }
    }
  }

  const topGroupsCited = Object.values(groupCitations)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((group) => ({
      ...group,
      citedCount: group.count,
      totalCited: totalGroupCitations,
      percent:
        totalGroupCitations > 0 ? (group.count / totalGroupCitations) * 100 : 0,
    }));

  const avgUserLifetime =
    allUniqueUsers.length > 0
      ? allUniqueUsers.reduce(
          (acc, curr) =>
            acc +
            Math.max(
              curr.lastAsked.getTime() - curr.firstAsked.getTime(),
              1000 * 60 * 60 * 24
            ),
          0
        ) / allUniqueUsers.length
      : 0;

  const avgQuestionsPerUser =
    allUniqueUsers.length > 0
      ? allUniqueUsers.reduce((acc, curr) => acc + curr.questionsCount, 0) /
        allUniqueUsers.length
      : 0;

  const totalLinksReferred = messages
    .filter((m) => m.llmMessage?.role === "assistant")
    .filter((m) => m.links)
    .reduce((acc, curr) => acc + curr.links.length, 0);
  const timeSaved = totalLinksReferred * 2;

  return {
    user,
    scrapeId,
    scrape,
    noScrapes: scrapes.length === 0,
    nScrapeItems,
    messagesSummary,
    categoriesSummary,
    topItems,
    uniqueUsers,
    uniqueUsersCount: allUniqueUsers.length,
    days,
    topGroupsCited,
    avgUserLifetime,
    avgQuestionsPerUser,
    timeSaved,
  };
}

export function meta() {
  return makeMeta({
    title: "Home - CrawlChat",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request, { redirectTo: "/login" });

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "set-scrape-id") {
    const scrapeId = formData.get("scrapeId");
    const session = await getSession(request.headers.get("cookie"));
    session.set("scrapeId", scrapeId as string);

    throw redirect("/app", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  if (intent === "remove-tag") {
    const tagName = formData.get("tagName") as string;
    await prisma.$runCommandRaw({
      update: "Message",
      updates: [
        {
          q: {
            "analysis.categorySuggestions": {
              $elemMatch: { title: tagName },
            },
          },
          u: {
            $pull: {
              "analysis.categorySuggestions": { title: tagName },
            },
          },
          multi: true,
        },
      ],
    });
  }

  if (intent === "create-collection") {
    const limits = user!.plan.limits;
    const existingScrapes = await prisma.scrape.count({
      where: {
        userId: user!.id,
      },
    });

    if (existingScrapes >= limits.scrapes) {
      return Response.json(
        {
          error: "You have reached the maximum number of collections",
        },
        { status: 400 }
      );
    }

    const name = formData.get("name");
    const scrape = await prisma.scrape.create({
      data: {
        title: name as string,
        userId: user!.id,
        status: "done",
        indexer: process.env.DEFAULT_INDEXER ?? "mars",
        showSources: true,
        widgetConfig: {
          size: "large",
          currentPageContext: true,
        },
      },
    });

    await prisma.scrapeUser.create({
      data: {
        scrapeId: scrape.id,
        userId: user!.id,
        role: "owner",
        email: user!.email,
      },
    });

    const session = await getSession(request.headers.get("cookie"));
    session.set("scrapeId", scrape.id);

    const redirectUrl = formData.get("redirectUrl") as string;
    throw redirect(redirectUrl ?? "/app?created=true", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
}

export function Heading({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-base-content/50 mb-2", className)} {...props}>
      {children}
    </h2>
  );
}

const DATE_RANGE_OPTIONS = [
  { value: 7, label: "Last week" },
  { value: 14, label: "Last 2 weeks" },
  { value: 30, label: "Last 1 month" },
  { value: 90, label: "Last 3 months" },
  { value: 180, label: "Last 6 months" },
];

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setSearchParams] = useSearchParams();
  const canCreateCollection = useMemo(() => {
    if (loaderData.user?.plan?.subscriptionId) {
      return true;
    }
  }, [loaderData.user]);

  const [tagsOrder, setTagsOrder] = useState<"top" | "latest">("top");

  useEffect(() => {
    if (loaderData.noScrapes && canCreateCollection) {
      showModal("new-collection-dialog");
    }
  }, [loaderData.noScrapes, canCreateCollection]);

  return (
    <Page
      title="Summary"
      icon={<TbChartLine />}
      right={
        <div className="flex gap-2">
          <select
            className="select"
            value={loaderData.days}
            onChange={(e) => {
              setSearchParams({ days: e.target.value });
            }}
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {canCreateCollection && (
            <button
              className="btn btn-soft hidden md:flex"
              onClick={() => showModal("new-collection-dialog")}
            >
              <TbPlus />
              Collection
            </button>
          )}
          {canCreateCollection && (
            <button
              className="btn btn-soft btn-square md:hidden"
              onClick={() => showModal("new-collection-dialog")}
            >
              <TbPlus />
            </button>
          )}
          {loaderData.scrape && (
            <a
              className="btn btn-primary btn-soft hidden md:flex"
              href={`/w/${loaderData.scrape.slug ?? loaderData.scrapeId}`}
              target="_blank"
            >
              <TbMessage />
              Chat
            </a>
          )}
          {loaderData.scrape && (
            <a
              className="btn btn-primary btn-soft btn-square md:hidden"
              href={`/w/${loaderData.scrape.slug ?? loaderData.scrapeId}`}
              target="_blank"
            >
              <TbMessage />
            </a>
          )}
        </div>
      }
    >
      {loaderData.noScrapes && (
        <div className="flex justify-center items-center h-full">
          <EmptyState
            icon={<TbDatabase />}
            title="No collections"
            description="Create a new collection to get started"
          >
            {canCreateCollection && (
              <button
                className="btn btn-primary"
                onClick={() => showModal("new-collection-dialog")}
              >
                <TbPlus />
                New collection
              </button>
            )}
            {!canCreateCollection && (
              <button
                onClick={() => showModal("upgrade-modal")}
                className="btn btn-primary"
              >
                Start free trial
                <TbCrown />
              </button>
            )}
          </EmptyState>
        </div>
      )}

      {!loaderData.noScrapes && (
        <div className="h-full gap-4 flex flex-col" ref={containerRef}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Today"
              value={loaderData.messagesSummary.messagesToday}
              icon={<TbMessage2Bolt />}
              tooltip="Questions asked today"
            />
            <StatCard
              label="Total"
              value={loaderData.messagesSummary.messagesCount}
              icon={<TbMessage2Up />}
              tooltip="Total questions asked in the period"
            />
            <StatCard
              label="Not helpful"
              value={loaderData.messagesSummary.ratingDownCount}
              icon={<TbThumbDown />}
              tooltip="Answers with 👎"
            />
            <StatCard
              label="Users"
              value={loaderData.uniqueUsersCount}
              icon={<TbUser />}
              tooltip="Unique users in the period"
            />
            <StatCard
              label="Questions per user"
              value={loaderData.avgQuestionsPerUser}
              icon={<TbMessage2Heart />}
              tooltip="Averaged number"
              toFixed={1}
            />
            <StatCard
              label="Avg user lifetime"
              icon={<TbClock />}
              value={loaderData.avgUserLifetime / (1000 * 60 * 60 * 24)}
              suffix={"d"}
              tooltip="Days from first to last question"
              toFixed={1}
            />
            <StatCard
              label="Time saved"
              icon={<TbClockShield />}
              value={loaderData.timeSaved / 60}
              suffix={"h"}
              tooltip="Human hours saved based on the number of pages referred to answer the questions"
              toFixed={1}
            />
            <StatCard
              label="Happy"
              value={Math.round(loaderData.messagesSummary.happyPct * 100)}
              icon={<TbMoodHappy />}
              suffix="%"
              tooltip="Questions with happy sentiment"
            />
            <StatCard
              label="Sad"
              value={Math.round(loaderData.messagesSummary.sadPct * 100)}
              icon={<TbMoodCry />}
              suffix="%"
              tooltip="Questions with sad sentiment"
            />
            <StatCard
              label="Resolved"
              value={loaderData.messagesSummary.resolvedCount}
              icon={<TbConfetti />}
              tooltip="Questions resolved"
            />
          </div>

          <DailyMessagesChart containerRef={containerRef} />

          {loaderData.categoriesSummary &&
            loaderData.categoriesSummary.length > 0 && (
              <div>
                <Heading>Categories</Heading>
                <div className="flex flex-col gap-2">
                  {loaderData.categoriesSummary &&
                    loaderData.categoriesSummary.map((category, i) => (
                      <CategoryCard
                        key={i}
                        title={category.title}
                        summary={category.summary}
                      />
                    ))}
                </div>
              </div>
            )}

          {loaderData.topItems && loaderData.topItems.length > 0 ? (
            <div>
              <Heading>Top cited pages</Heading>
              <TopPages topItems={loaderData.topItems} />
            </div>
          ) : null}

          {loaderData.uniqueUsers.length > 0 ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Heading className="mb-0">Users</Heading>
                <a href="/app/users" className="btn btn-sm btn-soft">
                  Show all
                </a>
              </div>
              <UniqueUsers users={loaderData.uniqueUsers} />
            </div>
          ) : null}

          {Object.keys(loaderData.messagesSummary.tags).length > 0 ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Heading className="mb-0">Tags</Heading>
                <select
                  className="select w-fit select-sm"
                  value={tagsOrder}
                  onChange={(e) =>
                    setTagsOrder(e.target.value as "top" | "latest")
                  }
                >
                  <option value="top">Top</option>
                  <option value="latest">Latest</option>
                </select>
              </div>
              <Tags tagsOrder={tagsOrder} />
            </div>
          ) : null}

          <div className="flex flex-col md:flex-row gap-4">
            {Object.keys(loaderData.messagesSummary.languagesDistribution)
              .length > 0 && (
              <div>
                <Heading>Languages</Heading>
                <LanguageDistribution
                  languages={loaderData.messagesSummary.languagesDistribution}
                />
              </div>
            )}
            {loaderData.topGroupsCited &&
            loaderData.topGroupsCited.length > 0 ? (
              <div className="flex-1">
                <Heading>Top cited groups</Heading>
                <TopCitedGroups topGroupsCited={loaderData.topGroupsCited} />
              </div>
            ) : null}
          </div>
        </div>
      )}

      <NewCollectionModal />
    </Page>
  );
}
