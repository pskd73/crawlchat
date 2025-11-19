import type { Route } from "./+types/page";
import type { Message } from "libs/prisma";
import {
  TbChartBar,
  TbChartLine,
  TbCheck,
  TbCircleXFilled,
  TbConfetti,
  TbDatabase,
  TbFolder,
  TbFolderPlus,
  TbHome,
  TbMessage,
  TbMoodCry,
  TbMoodHappy,
  TbPlus,
  TbThumbDown,
  TbThumbUp,
} from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import { Page } from "~/components/page";
import {
  XAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
import { numberToKMB } from "~/number-util";
import { commitSession } from "~/session";
import { getSession } from "~/session";
import { Link, redirect, useFetcher } from "react-router";
import { getLimits } from "libs/user-plan";
import { hideModal, showModal } from "~/components/daisy-utils";
import { EmptyState } from "~/components/empty-state";
import { ChannelBadge } from "~/components/channel-badge";
import moment from "moment";
import cn from "@meltdownjs/cn";
import toast from "react-hot-toast";
import { makeMeta } from "~/meta";
import { getQueryString } from "libs/llm-message";
import { dodoGateway } from "~/payment/gateway-dodo";
import { track } from "~/track";
import { getMessagesSummary, type MessagesSummary } from "~/messages-summary";

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

  const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

  const messages = await prisma.message.findMany({
    where: {
      scrapeId,
      createdAt: {
        gte: new Date(Date.now() - ONE_WEEK),
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
        )
      ),
    }))
    .sort((a, b) => b.summary.messagesCount - a.summary.messagesCount);

  return {
    user,
    scrapeId,
    scrape,
    noScrapes: scrapes.length === 0,
    nScrapeItems,
    messagesSummary,
    categoriesSummary,
  };
}

export function meta() {
  return makeMeta({
    title: "Home - CrawlChat",
  });
}

function parseCookies(cookieHeader: string) {
  var cookies: Record<string, string> = {};
  cookieHeader
    .split(";")
    .map((str) => str.replace("=", "\u0000").split("\u0000"))
    .forEach((x) => (cookies[x[0].trim()] = x[1]));

  return cookies;
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

  if (intent === "payment-link") {
    const referralId = formData.get("referralId") as string;
    const planId = formData.get("planId") as string;

    const cookies = parseCookies(request.headers.get("cookie") ?? "");
    const datafastVisitorId = cookies["datafast_visitor_id"];

    const gateway = dodoGateway;

    return await gateway.getPaymentLink(planId, {
      referralId,
      email: user!.email,
      name: user!.name,
      meta: {
        datafastVisitorId,
      },
    });
  }
}

export function StatCard({
  label,
  value,
  icon,
  suffix,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div className="stats shadow flex-1 bg-base-200 w-full">
      <div className="stat">
        <div className="stat-figure text-4xl">{icon}</div>
        <div className="stat-title">{label}</div>
        <div className="stat-value">
          {numberToKMB(value)}
          {suffix}
        </div>
      </div>
    </div>
  );
}

function CategoryCardStat({
  label,
  value,
  error,
  tooltip,
}: {
  label: string;
  value: number | string;
  error?: boolean;
  tooltip?: string;
}) {
  return (
    <div className="flex flex-col items-end gap-1 tooltip" data-tip={tooltip}>
      <span className="text-base-content/50 text-xs text-right shrink-0">
        {label}
      </span>
      <span
        className={cn(
          "badge badge-sm badge-soft",
          error ? "badge-error" : "badge-primary"
        )}
      >
        {typeof value === "number" ? numberToKMB(value) : value}
      </span>
    </div>
  );
}

function CategoryCard({
  title,
  summary,
}: {
  title: string;
  summary: MessagesSummary;
}) {
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
        Messages: summary.dailyMessages[key] ?? 0,
      });
    }
    return data.reverse();
  }, [summary.dailyMessages]);
  const lowRatingQuery = useMemo(() => {
    const content =
      summary.lowRatingQueries[0]?.userMessage?.llmMessage?.content;
    if (typeof content === "string") {
      return {
        content,
        score: summary.lowRatingQueries[0]?.maxScore,
      };
    }
    return null;
  }, [summary.lowRatingQueries]);

  function renderTooltip(props: any) {
    return (
      <div className="bg-primary text-primary-content px-3 py-1 rounded-box">
        <div className="text-[8px] opacity-80">{props.label}</div>
        <div className="text-xs">{props.payload[0]?.value}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-base-200/50 rounded-box p-4 border border-base-300",
        "flex flex-col md:flex-row justify-between gap-2 md:items-center"
      )}
    >
      <div className="h-fit">
        <Link
          to={`/questions?category=${title}`}
          className="flex items-center gap-2 link link-primary link-hover"
        >
          <TbFolder />
          <span className="font-bold">{title}</span>
        </Link>
        {/* <div className="flex items-center gap-2">
          {lowRatingQuery && (
            <div
              className="tooltip tooltip-bottom"
              data-tip={"Latest low rating query"}
            >
              <div className="text-xs text-base-content/50 line-clamp-1 truncate flex-1">
                [{lowRatingQuery.score.toFixed(2)}] {lowRatingQuery.content}
              </div>
            </div>
          )}
        </div> */}
      </div>

      <div className="flex gap-4 flex-wrap">
        <LineChart width={160} height={40} data={chartData}>
          <XAxis dataKey="name" hide />
          <Tooltip content={renderTooltip} />
          <Line
            type="monotone"
            dataKey="Messages"
            stroke={"var(--color-primary)"}
            dot={false}
          />
        </LineChart>
        <CategoryCardStat label="This week" value={summary.messagesCount} />
        <CategoryCardStat label="Today" value={summary.messagesToday} />
        <CategoryCardStat
          label="Avg score"
          value={summary.avgScore?.toFixed(2) ?? "-"}
          error={summary.avgScore ? summary.avgScore < 0.3 : undefined}
          tooltip={"Avg of max scores for all queries"}
        />
        <CategoryCardStat label="Not helpful" value={summary.ratingDownCount} />
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
        Messages: loaderData.messagesSummary.dailyMessages[key] ?? 0,
      });
    }
    return data.reverse();
  }, [loaderData.messagesSummary.dailyMessages]);

  const scoreDistributionData = useMemo(() => {
    const data = [];
    const points = Object.keys(
      loaderData.messagesSummary.scoreDestribution
    ).length;
    for (let i = 0; i < points; i++) {
      data.push({
        name: i,
        Messages: loaderData.messagesSummary.scoreDestribution[i]?.count ?? 0,
        score: i / points,
      });
    }
    return data;
  }, [loaderData.messagesSummary.scoreDestribution]);

  useEffect(() => {
    track("dashboard", {});
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth - 10);
    }
  }, [containerRef, loaderData]);

  useEffect(() => {
    if (loaderData.noScrapes) {
      showModal("new-collection-dialog");
    }
  }, [loaderData.noScrapes, loaderData.user]);

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
      title="Summary"
      icon={<TbChartLine />}
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
              className="btn btn-primary btn-soft hidden md:flex"
              href={`/w/${loaderData.scrape.slug ?? loaderData.scrapeId}`}
              target="_blank"
            >
              <TbMessage />
              Chat
            </a>
          )}
          {loaderData.scrape && loaderData.nScrapeItems > 0 && (
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
              value={loaderData.messagesSummary.messagesToday}
              icon={<TbMessage />}
            />
            <StatCard
              label="This week"
              value={loaderData.messagesSummary.messagesCount}
              icon={<TbMessage />}
            />

            <StatCard
              label="Not helpful"
              value={loaderData.messagesSummary.ratingDownCount}
              icon={<TbThumbDown />}
            />
          </div>
          <div className="flex flex-col justify-stretch md:flex-row gap-4 items-center">
            <StatCard
              label="Resolved"
              value={loaderData.messagesSummary.resolvedCount}
              icon={
                <span className="text-primary">
                  <TbConfetti />
                </span>
              }
            />
            <StatCard
              label="Happy"
              value={Math.round(loaderData.messagesSummary.happyPct * 100)}
              icon={
                <span className="text-success">
                  <TbMoodHappy />
                </span>
              }
              suffix="%"
            />
            <StatCard
              label="Sad"
              value={Math.round(loaderData.messagesSummary.sadPct * 100)}
              icon={
                <span className="text-error">
                  <TbMoodCry />
                </span>
              }
              suffix="%"
            />
          </div>

          <div className="flex flex-col gap-2">
            {loaderData.categoriesSummary &&
              loaderData.categoriesSummary.map((category) => (
                <CategoryCard
                  title={category.title}
                  summary={category.summary}
                />
              ))}
            <div className="flex justify-between">
              <div>
                {loaderData.scrape &&
                  loaderData.scrape.messageCategories.length > 0 &&
                  !loaderData.scrape.analyseMessage && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 text-error"
                    >
                      <TbCircleXFilled size={22} />
                      <span>
                        Turn on{" "}
                        <Link
                          to="/settings#data-gap-analysis"
                          className="link link-error link-hover"
                        >
                          message analysis
                        </Link>{" "}
                        for categories to work!
                      </span>
                    </div>
                  )}
              </div>
              <div>
                <Link
                  to="/settings#categories"
                  className="btn btn-soft btn-primary"
                >
                  <TbFolderPlus />
                  Add category
                </Link>
              </div>
            </div>
          </div>

          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TbMessage />
                <span className="text-lg font-medium">Messages</span>
              </div>
              <div
                className={cn(
                  "rounded-box overflow-hidden border",
                  "border-base-300 p-1 bg-base-200/50 shadow"
                )}
              >
                <AreaChart
                  width={width < 500 ? width : width / 2 - 20}
                  height={200}
                  data={chartData}
                >
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
                  width={width < 500 ? width : width / 2 - 20}
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
                    <th className="min-w-34 text-right">Created at</th>
                  </tr>
                </thead>
                <tbody>
                  {loaderData.messagesSummary.latestQuestions.map(
                    (question) => (
                      <tr key={question.id}>
                        <td>
                          <span className="line-clamp-1">
                            {getQueryString(
                              (question.llmMessage as any).content
                            )}
                          </span>
                        </td>
                        <td>
                          <ChannelBadge channel={question.channel} />
                        </td>
                        <td className="text-right">
                          {moment(question.createdAt).fromNow()}
                        </td>
                      </tr>
                    )
                  )}
                  {loaderData.messagesSummary.latestQuestions.length === 0 && (
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
