import { TbChevronLeft, TbChevronRight, TbTicket } from "react-icons/tb";
import { Page } from "./components/page";
import { getAuthUser } from "./auth/middleware";
import type { Route } from "./+types/tickets";
import { prisma } from "libs/prisma";
import type { Thread, Prisma, TicketStatus } from "libs/prisma";
import { getSessionScrapeId } from "./scrapes/util";
import { Badge, Group, Link, Stack, Text } from "@chakra-ui/react";
import moment from "moment";
import { Button } from "~/components/ui/button";
import { redirect } from "react-router";
import { Link as RouterLink } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);

  const scrape = await prisma.scrape.findUnique({
    where: {
      id: scrapeId,
      userId: user!.id,
    },
  });

  if (!scrape) {
    throw redirect("/scrapes");
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

function Ticket({ thread }: { thread: Thread }) {
  return (
    <Stack
      borderBottom={"1px solid"}
      borderColor={"brand.outline"}
      p={4}
      gap={1}
      _last={{
        borderBottom: "none",
      }}
    >
      <Text fontWeight={"medium"}>
        <Link
          target="_blank"
          href={`/ticket/${thread.ticketNumber}`}
          outline={"none"}
        >
          {thread.title}
        </Link>
      </Text>
      <Group>
        <Badge
          colorPalette={thread.ticketStatus === "open" ? "green" : "red"}
          variant={"surface"}
        >
          {thread.ticketStatus?.toUpperCase()}
        </Badge>
        <Text fontSize={"sm"} opacity={0.5}>
          #{thread.ticketNumber}
        </Text>
        <Text fontSize={"sm"} opacity={0.5}>
          {moment(thread.lastMessageAt).format("MMM D, YYYY h:mm A")}
        </Text>
      </Group>
    </Stack>
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
    <Button variant={active ? "subtle" : "ghost"} asChild>
      <RouterLink to={`/tickets?status=${status}`}>
        {label}
        <Badge variant={"surface"}>{count}</Badge>
      </RouterLink>
    </Button>
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
      <Stack>
        <Group justifyContent={"space-between"}>
          <Group />
          <Group>
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
          </Group>
        </Group>
        <Stack
          gap={0}
          border={"1px solid"}
          borderColor={"brand.outline"}
          rounded={"md"}
          w={"full"}
        >
          {loaderData.threads.map((thread) => (
            <Ticket key={thread.id} thread={thread} />
          ))}
        </Stack>

        <Group justifyContent={"space-between"}>
          <Group />
          <Group>
            {loaderData.hasPrevious && (
              <Button variant={"subtle"} asChild>
                <RouterLink to={getUrl({ page: loaderData.page - 1 })}>
                  <TbChevronLeft />
                  Older
                </RouterLink>
              </Button>
            )}
            {loaderData.hasNext && (
              <Button variant={"subtle"} asChild>
                <RouterLink to={getUrl({ page: loaderData.page + 1 })}>
                  Newer
                  <TbChevronRight />
                </RouterLink>
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Page>
  );
}
