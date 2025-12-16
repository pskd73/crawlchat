import type { Route } from "./+types/items";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import { TbCheck, TbRefresh, TbX, TbStack, TbChevronLeft, TbChevronRight } from "react-icons/tb";
import { Link, Outlet, useLoaderData } from "react-router";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { EmptyState } from "~/components/empty-state";
import { makeMeta } from "~/meta";
import cn from "@meltdownjs/cn";
import moment from "moment";

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

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const pageSize = 100;

  const where = {
    scrapeId: scrape.id,
    knowledgeGroupId: params.groupId,
  };

  const totalItems = await prisma.scrapeItem.count({
    where,
  });

  const totalPages = Math.ceil(totalItems / pageSize);

  const items = await prisma.scrapeItem.findMany({
    where,
    select: {
      id: true,
      url: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      error: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    scrape,
    items,
    knowledgeGroup,
    page,
    totalPages,
    totalItems,
  };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: `${data.knowledgeGroup.title ?? "Untitled"} items - CrawlChat`,
  });
}

function getKey(item: { id: string; url?: string | null }) {
  if (!item.url) {
    return item.id;
  }

  return item.url;
}

function Pagination() {
  const { page, totalPages, knowledgeGroup } = useLoaderData<typeof loader>();

  return (
    <div className="flex gap-2 items-center justify-end">
      <Link
        className={cn("btn btn-square", page <= 1 && "btn-disabled")}
        to={
          page > 1
            ? `/knowledge/group/${knowledgeGroup.id}/items?page=${page - 1}`
            : "#"
        }
      >
        <TbChevronLeft />
      </Link>

      <div className="flex items-center justify-center gap-4 text-sm">
        {page} / {totalPages}
      </div>

      <Link
        className={cn("btn btn-square", page === totalPages && "btn-disabled")}
        to={
          page < totalPages
            ? `/knowledge/group/${knowledgeGroup.id}/items?page=${page + 1}`
            : "#"
        }
      >
        <TbChevronRight />
      </Link>
    </div>
  );
}

export default function ScrapeLinks({ loaderData }: Route.ComponentProps) {
  return (
    <>
      {loaderData.items.length === 0 && (
        <div className="flex justify-center items-center flex-1">
          <EmptyState
            title="No items"
            description="Scrape your documents to get started."
            icon={<TbStack />}
          />
        </div>
      )}
      {loaderData.items.length > 0 && (
        <div className="flex flex-col gap-2">
          <div
            className={cn(
              "overflow-x-auto border border-base-300",
              "rounded-box bg-base-200/50 shadow"
            )}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th className="text-end">Updated</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="flex flex-col">
                        <Link
                          className="link link-hover line-clamp-1"
                          to={`/knowledge/item/${item.id}`}
                        >
                          {item.title?.trim() || "Untitled"}
                        </Link>
                        <div className="text-sm text-base-content/50">
                          {getKey(item)}
                        </div>
                      </div>
                    </td>

                    <td className="w-24">
                      <div
                        className="tooltip"
                        data-tip={item.error ?? undefined}
                      >
                        <div
                          className={cn(
                            "badge badge-soft",
                            item.status === "completed"
                              ? "badge-primary"
                              : item.status === "failed"
                              ? "badge-error"
                              : undefined
                          )}
                        >
                          {item.status === "completed" ? (
                            <TbCheck />
                          ) : item.status === "failed" ? (
                            <TbX />
                          ) : (
                            <TbRefresh />
                          )}
                          {item.status === "completed" ? "Success" : "Failed"}
                        </div>
                      </div>
                    </td>
                    <td className="min-w-38 text-end">
                      {moment(item.updatedAt).fromNow()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loaderData.totalPages > 1 && (
            <div className="flex justify-end">
              <Pagination />
            </div>
          )}

          <Outlet />
        </div>
      )}
    </>
  );
}
