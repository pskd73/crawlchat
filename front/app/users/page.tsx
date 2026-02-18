import type { Route } from "./+types/page";
import { TbUsers } from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "@packages/common/prisma";
import { Page } from "~/components/page";
import { makeMeta } from "~/meta";
import { UniqueUsers, FIELD_LABELS } from "~/summary/unique-users";
import { calcUniqueUsers } from "~/summary/calc-unique-users";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { useSearchParams } from "react-router";
import { useMemo } from "react";

const DATE_RANGE_OPTIONS = [
  { value: 7, label: "Last week" },
  { value: 14, label: "Last 2 weeks" },
  { value: 30, label: "Last 1 month" },
  { value: 90, label: "Last 3 months" },
  { value: 180, label: "Last 6 months" },
];

const VALID_DAYS = DATE_RANGE_OPTIONS.map((o) => o.value);

function sortUsers(
  users: typeof loaderData extends { uniqueUsers: infer T } ? T : never,
  sortBy: string,
  sortOrder: string
) {
  const validFields = Object.keys(FIELD_LABELS);
  const sortField = validFields.includes(sortBy) ? sortBy : "lastAsked";
  const sortDir = sortOrder === "asc" ? 1 : -1;

  return [...users].sort((a, b) => {
    let aVal: any, bVal: any;
    switch (sortField) {
      case "questionsCount":
        aVal = a.questionsCount;
        bVal = b.questionsCount;
        break;
      case "ageDays":
        aVal = a.ageDays;
        bVal = b.ageDays;
        break;
      case "firstAsked":
        aVal = a.firstAsked.getTime();
        bVal = b.firstAsked.getTime();
        break;
      case "lastAsked":
        aVal = a.lastAsked.getTime();
        bVal = b.lastAsked.getTime();
        break;
      case "channel":
        aVal = a.channel ?? "";
        bVal = b.channel ?? "";
        break;
      default:
        aVal = a.lastAsked.getTime();
        bVal = b.lastAsked.getTime();
    }
    if (aVal < bVal) return -1 * sortDir;
    if (aVal > bVal) return 1 * sortDir;
    return 0;
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const url = new URL(request.url);
  const daysParam = parseInt(url.searchParams.get("days") ?? "30", 10);
  const days = VALID_DAYS.includes(daysParam) ? daysParam : 30;
  const sortBy = url.searchParams.get("sortBy") ?? "lastAsked";
  const sortOrder = url.searchParams.get("sortOrder") ?? "desc";
  const DAY_MS = 1000 * 60 * 60 * 24;

  const messages = await prisma.message.findMany({
    where: {
      scrapeId,
      createdAt: {
        gte: new Date(Date.now() - days * DAY_MS),
      },
      llmMessage: {
        is: {
          role: "user",
        },
      },
    },
    select: {
      createdAt: true,
      llmMessage: {
        select: {
          role: true,
        },
      },
      fingerprint: true,
      channel: true,
      thread: {
        select: {
          location: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const uniqueUsers = calcUniqueUsers(messages);

  return { uniqueUsers, days, sortBy, sortOrder };
}

export function meta() {
  return makeMeta({
    title: "Users - CrawlChat",
  });
}

export default function UsersPage({ loaderData }: Route.ComponentProps) {
  const [, setSearchParams] = useSearchParams();

  const sortedUsers = useMemo(
    () =>
      sortUsers(
        loaderData.uniqueUsers,
        loaderData.sortBy,
        loaderData.sortOrder
      ),
    [loaderData.uniqueUsers, loaderData.sortBy, loaderData.sortOrder]
  );

  const handleSort = (field: string) => {
    const currentSortBy = loaderData.sortBy;
    const currentSortOrder = loaderData.sortOrder;
    let newSortOrder = "desc";
    if (currentSortBy === field && currentSortOrder === "desc") {
      newSortOrder = "asc";
    }
    setSearchParams((prev) => {
      prev.set("sortBy", field);
      prev.set("sortOrder", newSortOrder);
      return prev;
    });
  };

  return (
    <Page
      title="Users"
      icon={<TbUsers />}
      right={
        <div className="flex items-center gap-2">
          <select
            className="select select-sm"
            value={loaderData.days}
            onChange={(e) => {
              setSearchParams((prev) => {
                prev.set("days", e.target.value);
                return prev;
              });
            }}
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <UniqueUsers
        users={sortedUsers}
        sortBy={loaderData.sortBy}
        sortOrder={loaderData.sortOrder}
        onSort={handleSort}
      />
    </Page>
  );
}
