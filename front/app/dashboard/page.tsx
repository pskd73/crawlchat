import type { Route } from "./+types/page";
import type { Message } from "libs/prisma";
import {
  TbChartBar,
  TbCheck,
  TbDatabase,
  TbHome,
  TbMessage,
  TbPlus,
  TbThumbDown,
  TbThumbUp,
} from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import { Page } from "~/components/page";
import { XAxis, CartesianGrid, Tooltip, AreaChart, Area } from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
import { numberToKMB } from "~/number-util";
import { commitSession } from "~/session";
import { getSession } from "~/session";
import { redirect, useFetcher } from "react-router";
import { getLimits } from "libs/user-plan";
import { fetchDataGaps } from "~/data-gaps/fetch";
import { hideModal, showModal } from "~/components/daisy-utils";
import { EmptyState } from "~/components/empty-state";
import { ChannelBadge } from "~/components/channel-badge";
import moment from "moment";
import cn from "@meltdownjs/cn";
import toast from "react-hot-toast";

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

  const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

  const messages = await prisma.message.findMany({
    where: {
      scrapeId,
      createdAt: {
        gte: new Date(Date.now() - ONE_WEEK),
      },
    },
  });

  const dailyMessages: Record<string, number> = {};

  for (const message of messages) {
    if (!message.createdAt) continue;
    const date = new Date(message.createdAt);
    const key = date.toISOString().split("T")[0];
    dailyMessages[key] = (dailyMessages[key] ?? 0) + 1;
  }

  const today = new Date();
  const todayKey = today.toISOString().split("T")[0];
  const messagesToday = dailyMessages[todayKey] ?? 0;

  const scoreDestribution: Record<number, { count: number }> = {};
  const points = 10;
  for (let i = 0; i < points; i++) {
    scoreDestribution[i] = { count: 0 };
  }

  for (const message of messages) {
    if (!message.links || message.links.length === 0) continue;

    const max = Math.max(...message.links.map((l) => l.score ?? 0));
    const index = Math.floor(max * points);
    scoreDestribution[index] = {
      count: (scoreDestribution[index]?.count ?? 0) + 1,
    };
  }

  const ratingUpCount = messages.filter((m) => m.rating === "up").length;
  const ratingDownCount = messages.filter((m) => m.rating === "down").length;

  const itemCounts: Record<string, number> = {};
  for (const message of messages) {
    if (!message.links || message.links.length === 0) continue;
    for (const link of message.links) {
      if (!link.url) continue;
      itemCounts[link.url] = (itemCounts[link.url] ?? 0) + 1;
    }
  }

  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const latestQuestions = messages
    .filter((m) => (m.llmMessage as any)?.role === "user")
    .sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    )
    .slice(0, 5);

  let lowRatingQueries = [];
  let lastUserMessage: Message | null = null;
  for (const message of messages) {
    const role = (message.llmMessage as any)?.role;
    if (role === "user") {
      lastUserMessage = message;
    }
    if (role !== "assistant") continue;

    const links = message.links ?? [];
    const maxScore = Math.max(...links.map((l) => l.score ?? 0));
    if (links.length > 0 && maxScore < 0.3 && maxScore > 0) {
      const queries = links.map((l) => l.searchQuery);
      const uniqueQueries = [...new Set(queries)];
      lowRatingQueries.push({
        message,
        maxScore,
        queries: uniqueQueries,
        userMessage: lastUserMessage,
      });
    }
  }

  lowRatingQueries = lowRatingQueries.sort((a, b) => a.maxScore - b.maxScore);

  const dataGapMessages = scrapeId ? await fetchDataGaps(scrapeId) : [];
  const nScrapeItems = scrapeId
    ? await prisma.scrapeItem.count({
        where: {
          scrapeId,
        },
      })
    : 0;

  return {
    user,
    dailyMessages,
    messagesToday,
    scrapeId,
    scoreDestribution,
    scrape: scrapes.find((s) => s.id === scrapeId),
    ratingUpCount,
    ratingDownCount,
    noScrapes: scrapes.length === 0,
    topItems,
    latestQuestions,
    lowRatingQueries,
    dataGapMessages,
    nScrapeItems,
  };
}

export function meta() {
  return [
    {
      title: "CrawlChat",
      description: "Chat with any website!",
    },
  ];
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

  if (intent === "create-collection") {
    const limits = await getLimits(user!);
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
        indexer: "mars",
        analyseMessage: true,
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

    throw redirect("/app?created=true", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
}

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="stats shadow flex-1 bg-base-200 w-full">
      <div className="stat">
        <div className="stat-figure text-4xl">{icon}</div>
        <div className="stat-title">{label}</div>
        <div className="stat-value">{numberToKMB(value)}</div>
      </div>
    </div>
  );
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const newCollectionFetcher = useFetcher();

  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    const DAY_MS = 1000 * 60 * 60 * 24;

    for (let i = 0; i < 7; i++) {
      const date = new Date(today.getTime() - i * DAY_MS);
      const key = date.toISOString().split("T")[0];
      const name = moment(date).format("MMM D");
      data.push({
        name,
        Messages: loaderData.dailyMessages[key] ?? 0,
      });
    }
    return data.reverse();
  }, [loaderData.dailyMessages]);

  const scoreDistributionData = useMemo(() => {
    const data = [];
    const points = Object.keys(loaderData.scoreDestribution).length;
    for (let i = 0; i < points; i++) {
      data.push({
        name: i,
        Messages: loaderData.scoreDestribution[i]?.count ?? 0,
        score: i / points,
      });
    }
    return data;
  }, [loaderData.scoreDestribution]);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth - 10);
    }
  }, [containerRef, loaderData]);

  useEffect(() => {
    if (loaderData.noScrapes) {
      showModal("new-collection-dialog");
    }
  }, [loaderData.noScrapes]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("created")) {
      hideModal("new-collection-dialog");
    }
  }, [newCollectionFetcher.state]);

  useEffect(() => {
    if (newCollectionFetcher.data?.error) {
      toast.error(newCollectionFetcher.data.error);
    }
  }, [newCollectionFetcher.data]);

  return (
    <Page
      title="Home"
      icon={<TbHome />}
      right={
        <div className="flex gap-2">
          <button
            className="btn btn-soft"
            onClick={() => showModal("new-collection-dialog")}
          >
            <TbPlus />
            Collection
          </button>
          {loaderData.scrape && loaderData.nScrapeItems > 0 && (
            <a
              className="btn btn-primary btn-soft"
              href={`/w/${loaderData.scrape.slug ?? loaderData.scrapeId}`}
              target="_blank"
            >
              <TbMessage />
              Chat
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
            <button
              className="btn btn-primary"
              onClick={() => showModal("new-collection-dialog")}
            >
              <TbPlus />
              New collection
            </button>
          </EmptyState>
        </div>
      )}

      {!loaderData.noScrapes && (
        <div className="h-full gap-4 flex flex-col" ref={containerRef}>
          <div className="flex flex-col justify-stretch md:flex-row gap-4 items-center">
            <StatCard
              label="Today"
              value={loaderData.messagesToday}
              icon={<TbMessage />}
            />
            <StatCard
              label="This week"
              value={Object.values(loaderData.dailyMessages).reduce(
                (acc, curr) => acc + curr,
                0
              )}
              icon={<TbMessage />}
            />
            <StatCard
              label="Helpful"
              value={loaderData.ratingUpCount}
              icon={<TbThumbUp />}
            />
            <StatCard
              label="Not helpful"
              value={loaderData.ratingDownCount}
              icon={<TbThumbDown />}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <TbMessage />
                <span className="text-lg font-medium">Messages</span>
              </div>
              <div
                className={cn(
                  "rounded-box overflow-hidden border",
                  "border-base-300 p-1 bg-base-200/50 shadow"
                )}
              >
                <AreaChart width={width / 2 - 20} height={200} data={chartData}>
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "var(--radius-box)",
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-primary-content)",
                      gap: "0",
                    }}
                    itemStyle={{
                      color: "var(--color-primary-content)",
                    }}
                  />
                  <CartesianGrid strokeDasharray="6 6" vertical={false} />
                  <Area
                    type="monotone"
                    dataKey="Messages"
                    stroke={"var(--color-primary)"}
                    fill={"var(--color-primary-content)"}
                  />
                </AreaChart>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TbChartBar />
                <span className="text-lg font-medium">Score distribution</span>
              </div>
              <div
                className={cn(
                  "rounded-box overflow-hidden border",
                  "border-base-300 p-1 bg-base-200/50 shadow"
                )}
              >
                <AreaChart
                  width={width / 2 - 20}
                  height={200}
                  data={scoreDistributionData}
                >
                  <XAxis dataKey="score" hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "var(--radius-box)",
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-primary-content)",
                      gap: "0",
                    }}
                    itemStyle={{
                      color: "var(--color-primary-content)",
                    }}
                  />
                  <CartesianGrid strokeDasharray="6 6" vertical={false} />
                  <Area
                    type="monotone"
                    dataKey="Messages"
                    fill={"var(--color-primary-content)"}
                    stroke={"var(--color-primary)"}
                  />
                </AreaChart>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <TbMessage />
              <span className="text-lg font-medium">Latest questions</span>
            </div>
            <div
              className={cn(
                "overflow-x-auto border border-base-300",
                "rounded-box bg-base-200/50 shadow",
                "shadow"
              )}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th className="w-10">Channel</th>
                    <th className="w-42 text-right">Created at</th>
                  </tr>
                </thead>
                <tbody>
                  {loaderData.latestQuestions.map((question) => (
                    <tr key={question.id}>
                      <td>
                        <span className="line-clamp-1">
                          {(question.llmMessage as any).content}
                        </span>
                      </td>
                      <td>
                        <ChannelBadge channel={question.channel} />
                      </td>
                      <td className="text-right">
                        {moment(question.createdAt).fromNow()}
                      </td>
                    </tr>
                  ))}
                  {loaderData.latestQuestions.length === 0 && (
                    <tr>
                      <td colSpan={999} className="text-center">
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <dialog id="new-collection-dialog" className="modal">
        <div className="modal-box">
          <newCollectionFetcher.Form method="post">
            <input type="hidden" name="intent" value="create-collection" />
            <h3 className="font-bold text-lg flex gap-2 items-center">
              <TbPlus />
              New collection
            </h3>
            <p className="py-4">
              <div className="text-base-content/50">
                A collection lets you setup your knowledge base and lets you
                connect bot on multiple channels.
              </div>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Give it a name</legend>
                <input
                  type="text"
                  name="name"
                  className="input w-full"
                  placeholder="Ex: MyBot"
                  required
                />
              </fieldset>
            </p>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn">Close</button>
              </form>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={newCollectionFetcher.state !== "idle"}
              >
                {newCollectionFetcher.state !== "idle" && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                Create
                <TbCheck />
              </button>
            </div>
          </newCollectionFetcher.Form>
        </div>
      </dialog>
    </Page>
  );
}
