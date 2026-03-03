import cn from "@meltdownjs/cn";
import type { Prisma, Thread, TicketStatus } from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { TbChevronLeft, TbChevronRight, TbTicket } from "react-icons/tb";
import { redirect, Link as RouterLink } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { EmptyState } from "~/components/empty-state";
import { Page } from "~/components/page";
import { Timestamp } from "~/components/timestamp";
import { makeMeta } from "~/meta";
import type { Route } from "./+types/list";

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

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const status = url.searchParams.get("status") ?? "open";
  const limit = 10;

  const where: Prisma.ThreadWhereInput = {
    scrapeId,
    ticketKey: {
      isSet: true,
    },
  };

  if (status !== "all") {
    where.ticketStatus = status as TicketStatus;
  }

  const threads = await prisma.thread.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      lastMessageAt: "desc",
    },
  });

  const closed = await prisma.thread.count({
    where: {
      ...where,
      ticketStatus: "closed",
    },
  });

  const open = await prisma.thread.count({
    where: {
      ...where,
      ticketStatus: "open",
    },
  });

  const total = open + closed;
  const currentTotal = status ? (status === "open" ? open : closed) : total;

  const hasNext = page * limit < currentTotal;
  const hasPrevious = page > 1;

  return { threads, total, closed, open, hasNext, hasPrevious, status, page };
}

export function meta() {
  return makeMeta({
    title: "Tickets - CrawlChat",
  });
}

function Ticket({ thread }: { thread: Thread }) {
  const customTags = useMemo(() => {
    if (!thread.customTags) {
      return [];
    }
    const tags = thread.customTags as Record<string, any>;
    return Object.keys(tags).map((key) => {
      let link = undefined;
      if (key === "store") {
        link = `https://${tags[key]}`;
      } else if (key === "email") {
        link = `mailto:${tags[key]}`;
      } else if (key === "phone") {
        link = `tel:${tags[key]}`;
      }
      return {
        key,
        value: tags[key],
        link,
      };
    });
  }, [thread.customTags]);

  function copyToClipboard(value: string) {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="flex flex-col gap-1 p-4 border-b border-base-300 last:border-b-0">
      <RouterLink
        target="_blank"
        to={`/ticket/${thread.ticketNumber}`}
        className="font-medium link link-hover"
      >
        {thread.title}
      </RouterLink>

      <div className="text-sm text-base-content/50">
        {thread.ticketUserEmail}
      </div>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "badge badge-soft",
            thread.ticketStatus === "open" && "badge-success"
          )}
        >
          {thread.ticketStatus?.toUpperCase()}
        </div>
        <div className="text-sm text-base-content/50">
          #{thread.ticketNumber}
        </div>
        <div className="text-sm text-base-content/50">
          {thread.lastMessageAt && <Timestamp date={thread.lastMessageAt} />}
        </div>
      </div>
      <div className="flex gap-2">
        {thread.customTags &&
          customTags.map((tag) => (
            <div key={tag.key} className="tooltip" data-tip={tag.key}>
              <div className="badge badge-soft">{tag.value}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

function StatusButton({
  status,
  count,
  active,
  label,
}: {
  status: TicketStatus | "all";
  count: number;
  active: boolean;
  label: string;
}) {
  return (
    <RouterLink
      className={cn("btn join-item", active && "btn-neutral")}
      to={`/tickets?status=${status}`}
    >
      {label}
      <div className="badge rounded-full px-2">{count}</div>
    </RouterLink>
  );
}

function NoTickets() {
  return (
    <div className="flex justify-center items-center h-full">
      <EmptyState
        icon={<TbTicket />}
        title="No tickets found"
        description="Hope your customers are enjoying without any need for support."
      />
    </div>
  );
}

export default function Tickets({ loaderData }: Route.ComponentProps) {
  function getUrl(next: { status?: string; page?: number }) {
    const status = next.status ?? loaderData.status;
    const page = next.page ?? loaderData.page;
    return `/tickets?status=${status}&page=${page}`;
  }

  return (
    <Page title="Tickets" icon={<TbTicket />}>
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center gap-2 justify-between">
          <div />
          <div className="join">
            <StatusButton
              status="all"
              count={loaderData.total}
              active={loaderData.status === "all"}
              label="All"
            />
            <StatusButton
              status="closed"
              count={loaderData.closed}
              active={loaderData.status === "closed"}
              label="Closed"
            />
            <StatusButton
              status="open"
              count={loaderData.open}
              active={loaderData.status === "open"}
              label="Open"
            />
          </div>
        </div>

        {loaderData.threads.length === 0 ? (
          <NoTickets />
        ) : (
          <div
            className={cn(
              "flex flex-col border border-base-300 w-full",
              "rounded-box bg-base-100 shadow"
            )}
          >
            {loaderData.threads.map((thread) => (
              <Ticket key={thread.id} thread={thread} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div />
          <div className="join">
            {loaderData.hasPrevious && (
              <RouterLink
                className="btn join-item"
                to={getUrl({ page: loaderData.page - 1 })}
              >
                <TbChevronLeft />
                Older
              </RouterLink>
            )}
            {loaderData.hasNext && (
              <RouterLink
                className="btn join-item"
                to={getUrl({ page: loaderData.page + 1 })}
              >
                Newer
                <TbChevronRight />
              </RouterLink>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
