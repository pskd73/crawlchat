import type { Route } from "./+types/summary";
import {
  TbChartLine,
  TbCheck,
  TbConfetti,
  TbCrown,
  TbDatabase,
  TbFolder,
  TbMessage,
  TbMoodCry,
  TbMoodHappy,
  TbPlus,
  TbThumbDown,
} from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "@packages/common/prisma";
import { Page } from "~/components/page";
import {
  XAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ComposedChart,
  Bar,
} from "recharts";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import { commitSession } from "~/session";
import { getSession } from "~/session";
import { redirect, useFetcher } from "react-router";
import { getLimits } from "@packages/common/user-plan";
import { hideModal, showModal } from "~/components/daisy-utils";
import { EmptyState } from "~/components/empty-state";
import moment from "moment";
import cn from "@meltdownjs/cn";
import toast from "react-hot-toast";
import { makeMeta } from "~/meta";
import { dodoGateway } from "~/payment/gateway-dodo";
import { track } from "~/components/track";
import { getMessagesSummary } from "~/messages-summary";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import LanguageDistribution from "./summary/language-distribution";
import { TopPages } from "./summary/top-pages";
import { BRIGHT_COLORS } from "./summary/bright-colors";
import CategoryCard from "./summary/category-card";
import StatCard from "./summary/stat-card";
import Tags from "./summary/tags";

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
        gte: new Date(Date.now() - ONE_WEEK * 2),
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

  return {
    user,
    scrapeId,
    scrape,
    noScrapes: scrapes.length === 0,
    nScrapeItems,
    messagesSummary,
    categoriesSummary,
    topItems,
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
        indexer: process.env.DEFAULT_INDEXER ?? "mars",
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

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const newCollectionFetcher = useFetcher();
  const canCreateCollection = useMemo(() => {
    if (loaderData.user?.plan?.subscriptionId) {
      return true;
    }
  }, [loaderData.user]);
  const [chartData, categories] = useMemo(() => {
    const data = [];
    const today = new Date();
    const DAY_MS = 1000 * 60 * 60 * 24;

    for (let i = 0; i < 14; i++) {
      const date = new Date(today.getTime() - i * DAY_MS);
      const key = date.toISOString().split("T")[0];
      const name = moment(date).format("MMM D");

      const item = loaderData.messagesSummary.dailyMessages[key];

      const record: Record<string, number | string> = {
        name,
        Questions: item?.count ?? 0,
        Unhappy: item?.unhappy ?? 0,
        Other: item?.categories["Other"] ?? 0,
      };

      for (const category of loaderData.scrape?.messageCategories ?? []) {
        record[category.title] = item?.categories[category.title] ?? 0;
      }

      data.push(record);
    }

    const categories = new Set<string>(["Other"]);
    for (const category of loaderData.scrape?.messageCategories ?? []) {
      categories.add(category.title);
    }

    return [data.reverse(), categories];
  }, [loaderData.messagesSummary.dailyMessages]);

  const [tagsOrder, setTagsOrder] = useState<"top" | "latest">("top");
  const tags = useMemo(() => {
    const sortedTags = Object.entries(loaderData.messagesSummary.tags).sort(
      (a, b) => {
        return b[1].count - a[1].count;
      }
    );

    if (tagsOrder === "latest") {
      sortedTags.sort((a, b) => {
        return b[1].latestDate.getTime() - a[1].latestDate.getTime();
      });
    }

    return sortedTags
      .slice(0, 20)
      .map(([title, d]) => ({ title, count: d.count }));
  }, [loaderData.messagesSummary.tags, tagsOrder]);

  useEffect(() => {
    track("dashboard", {});
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth - 10);
    }
  }, [containerRef, loaderData]);

  useEffect(() => {
    if (loaderData.noScrapes && canCreateCollection) {
      showModal("new-collection-dialog");
    }
  }, [loaderData.noScrapes, canCreateCollection]);

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

  function renderTick(props: {
    x: number;
    y: number;
    payload: { value: string };
  }) {
    return (
      <text
        x={props.x}
        y={props.y + 4}
        dy={16}
        textAnchor="middle"
        fill="var(--color-primary)"
        fontSize={12}
      >
        {props.payload.value}
      </text>
    );
  }

  function renderTooltip(props: {
    label?: string;
    payload?: Payload<number, string>[] | undefined;
  }) {
    return (
      <div className="bg-base-200 border border-base-300 rounded-box">
        <div className="p-2 px-3 border-b border-base-300 text-xs font-medium opacity-80">
          {props.label}
        </div>
        <ul className="flex flex-col gap-1 p-2">
          {props.payload?.map((item) => {
            if (item.value === 0) {
              return null;
            }

            const index = Array.from(categories).indexOf(item.name ?? "");
            const color = BRIGHT_COLORS[index % BRIGHT_COLORS.length];
            return (
              <li
                key={item.name}
                className="flex items-center gap-6 justify-between"
              >
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{
                      backgroundColor: color ?? "red",
                    }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span
                  className={cn(
                    "min-w-5 h-5 px-1 text-sm flex items-center justify-center rounded-full",
                    item.name === "Unhappy"
                      ? "bg-error text-error-content"
                      : "bg-primary text-primary-content"
                  )}
                >
                  {item.value}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <Page
      title="Summary"
      icon={<TbChartLine />}
      description="For last 14 days"
      right={
        <div className="flex gap-2">
          {canCreateCollection && (
            <button
              className="btn btn-soft"
              onClick={() => showModal("new-collection-dialog")}
            >
              <TbPlus />
              Collection
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
          <div className="flex flex-col justify-stretch md:flex-row gap-4 items-center">
            <StatCard
              label="Today"
              value={loaderData.messagesSummary.messagesToday}
              icon={<TbMessage />}
            />
            <StatCard
              label="Total"
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

          <div
            className={cn(
              "rounded-box overflow-hidden",
              "p-4 bg-base-100 border border-base-300"
            )}
          >
            <ComposedChart width={width - 24} height={260} data={chartData}>
              <XAxis
                dataKey="name"
                interval={"preserveStartEnd"}
                tick={renderTick}
              />
              <Tooltip content={renderTooltip} />
              <CartesianGrid strokeDasharray="6 6" vertical={false} />
              {Array.from(categories).map((category, i) => (
                <Bar
                  key={category}
                  type="monotone"
                  dataKey={category}
                  fill={BRIGHT_COLORS[i % BRIGHT_COLORS.length]}
                  barSize={30}
                  stackId="a"
                />
              ))}
              <Line
                type="monotone"
                dataKey="Unhappy"
                stroke={"var(--color-error)"}
                dot={false}
              />
            </ComposedChart>
          </div>

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

          {loaderData.topItems && loaderData.topItems.length > 0 && (
            <div>
              <Heading>Top cited pages</Heading>
              <TopPages topItems={loaderData.topItems} />
            </div>
          )}

          {tags.length > 0 && (
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
              <Tags tags={tags} />
            </div>
          )}

          {Object.keys(loaderData.messagesSummary.languagesDistribution)
            .length > 0 && (
            <div>
              <Heading>Languages</Heading>
              <LanguageDistribution
                languages={loaderData.messagesSummary.languagesDistribution}
              />
            </div>
          )}
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
            <div className="py-4">
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
            </div>
            <div className="modal-action">
              <button
                className="btn"
                type="button"
                onClick={() => hideModal("new-collection-dialog")}
              >
                Close
              </button>

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
