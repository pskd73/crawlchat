import type { Route } from "./+types/conversations";
import type { Message, Prisma, Thread } from "@packages/common/prisma";
import { Page } from "~/components/page";
import {
  TbChevronLeft,
  TbChevronRight,
  TbConfetti,
  TbFolder,
  TbMessage,
  TbMessages,
  TbTicket,
  TbUsersGroup,
} from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { prisma } from "@packages/common/prisma";
import { getMessagesScore } from "~/score";
import { Link, redirect, useLoaderData } from "react-router";
import { ViewSwitch } from "./view-switch";
import { CountryFlag } from "./country-flag";
import { EmptyState } from "~/components/empty-state";
import cn from "@meltdownjs/cn";
import { Timestamp } from "~/components/timestamp";
import { makeMeta } from "~/meta";
import { ScoreBadge } from "~/components/score-badge";
import { ChannelBadge } from "~/components/channel-badge";
import { getMessageContent } from "./messages";
import Avatar from "boring-avatars";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: {
      id: scrapeId,
    },
  });

  if (!scrape) {
    throw redirect("/app");
  }

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 10;
  const id = searchParams.get("id");

  const where: Prisma.ThreadWhereInput = {
    scrapeId,
    lastMessageAt: {
      gte: ONE_WEEK_AGO,
    },
    OR: [
      {
        isDefault: false,
      },
      {
        isDefault: {
          isSet: false,
        },
      },
    ],
  };

  if (id) {
    where.id = id;
  }

  const totalThreads = await prisma.thread.count({
    where,
  });

  const totalPages = Math.ceil(totalThreads / pageSize);

  const threads = await prisma.thread.findMany({
    where,
    include: {
      messages: true,
    },
    orderBy: {
      lastMessageAt: "desc",
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    threads,
    scrape,
    totalThreads,
    totalPages,
    page,
    from: (page - 1) * pageSize + 1,
    to: (page - 1) * pageSize + pageSize,
  };
}

export function meta() {
  return makeMeta({
    title: "Conversations - CrawlChat",
  });
}

function Pagination() {
  const { from, to, page, totalPages } = useLoaderData<typeof loader>();

  return (
    <div className="flex gap-2 items-center justify-end">
      <Link
        className={cn("btn btn-square", page <= 1 && "btn-disabled")}
        to={page > 1 ? `/questions/conversations?page=${page - 1}` : "#"}
      >
        <TbChevronLeft />
      </Link>

      <div className="flex items-center justify-center gap-4 text-sm">
        {page} / {totalPages}
      </div>

      <Link
        className={cn("btn btn-square", page === totalPages && "btn-disabled")}
        to={
          page < totalPages ? `/questions/conversations?page=${page + 1}` : "#"
        }
      >
        <TbChevronRight />
      </Link>
    </div>
  );
}

function CategoriesBadge({
  categories,
}: {
  categories: Record<string, number>;
}) {
  if (Object.keys(categories).length === 0) {
    return null;
  }

  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

  return (
    <div
      className="tooltip"
      data-tip={
        Object.keys(categories).length > 1
          ? Object.keys(categories).join(", ")
          : undefined
      }
    >
      <div className="badge badge-accent badge-soft whitespace-nowrap">
        <TbFolder />
        {topCategory[0]}

        {Object.keys(categories).length > 1 && (
          <span className="opacity-40">
            + {Object.keys(categories).length - 1}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Conversations({ loaderData }: Route.ComponentProps) {
  const getThreadCategories = (messages: Message[]) => {
    const categories: Record<string, number> = {};
    for (const message of messages) {
      if (message.analysis?.category) {
        categories[message.analysis.category] =
          (categories[message.analysis.category] || 0) + 1;
      }
    }
    return categories;
  };

  const isResolved = (messages: Message[]) => {
    return messages.some((message) => message.analysis?.resolved);
  };

  return (
    <Page
      title="Conversations"
      description="Showing for the last 7 days"
      icon={<TbMessages />}
      right={
        <div className="flex gap-2 items-center">
          <div className="hidden md:block">
            <Pagination />
          </div>
          <ViewSwitch />
        </div>
      }
    >
      {loaderData.threads.length === 0 && (
        <div className="flex h-full w-full items-center justify-center">
          <EmptyState
            icon={<TbMessages />}
            title="No conversations found"
            description="Integrate the collection on your website to start making conversations"
          />
        </div>
      )}

      {loaderData.threads.length > 0 && (
        <div className="flex flex-col gap-2">
          <div
            className={cn(
              "bg-base-100 rounded-box border border-base-300",
              "shadow"
            )}
          >
            {loaderData.threads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  "flex flex-col px-4 py-2",
                  "border-b border-base-300",
                  "last:border-0 gap-1"
                )}
              >
                <div
                  className={cn(
                    "flex flex-col md:flex-row gap-2 md:items-center justify-between"
                  )}
                >
                  <div className="flex min-w-0 flex-1 gap-2 items-center">
                    {thread.fingerprint && (
                      <Avatar
                        name={thread.fingerprint}
                        size={24}
                        variant="beam"
                        className="shrink-0"
                      />
                    )}
                    {thread.location?.country && (
                      <CountryFlag location={thread.location} />
                    )}
                    <Link
                      to={`/questions/conversations/${thread.id}`}
                      className="link link-primary link-hover block min-w-0 truncate"
                    >
                      {thread.messages[0]?.llmMessage
                        ? getMessageContent(thread.messages[0])
                        : thread.id.substring(thread.id.length - 4)}
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {thread.grouping && (
                      <div
                        className="tooltip tooltip-left"
                        data-tip="Grouped conversation"
                      >
                        <span className="badge badge-secondary badge-soft px-1">
                          <TbUsersGroup />
                        </span>
                      </div>
                    )}
                    {thread.ticketStatus && (
                      <div
                        className="tooltip tooltip-left"
                        data-tip="Ticket created"
                      >
                        <span className="badge badge-primary badge-soft px-1">
                          <TbTicket />
                        </span>
                      </div>
                    )}
                    <ChannelBadge channel={thread.messages[0]?.channel} />
                    {isResolved(thread.messages) && (
                      <div className="tooltip tooltip-left" data-tip="Resolved">
                        <span className="badge badge-primary badge-soft">
                          <TbConfetti />
                        </span>
                      </div>
                    )}
                    <CategoriesBadge
                      categories={getThreadCategories(thread.messages)}
                    />
                    <div className="tooltip tooltip-left" data-tip="Avg score">
                      <ScoreBadge score={getMessagesScore(thread.messages)} />
                    </div>
                    <div
                      className="tooltip tooltip-left"
                      data-tip="Number of messages"
                    >
                      <span className="badge badge-primary badge-soft">
                        <TbMessage />
                        {thread.messages.length}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-base-content/50 text-sm">
                  <Timestamp date={thread.createdAt} />
                </span>
                <div className="flex flex-wrap gap-1">
                  {thread.customTags &&
                    Object.keys(thread.customTags).map((key) => (
                      <div key={key} className="tooltip" data-tip={key}>
                        <span className="badge badge-soft">
                          {(thread.customTags as Record<string, any>)[key]}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="block md:hidden">
            <Pagination />
          </div>
        </div>
      )}
    </Page>
  );
}
