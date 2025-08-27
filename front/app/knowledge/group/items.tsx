import type { Route } from "./+types/items";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import { TbCheck, TbRefresh, TbX, TbStack } from "react-icons/tb";
import { Link, Outlet } from "react-router";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { EmptyState } from "~/components/empty-state";
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
    where: { id: params.groupId },
  });

  if (!knowledgeGroup) {
    throw new Response("Not found", { status: 404 });
  }

  const items = await prisma.scrapeItem.findMany({
    where: { scrapeId: scrape.id, knowledgeGroupId: params.groupId },
    select: {
      id: true,
      url: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      status: true,
    },
  });

  return { scrape, items, knowledgeGroup };
}

function getKey(item: { id: string; url?: string | null }) {
  if (!item.url) {
    return item.id;
  }

  try {
    return new URL(item.url).pathname;
  } catch (error) {}

  return item.url;
}

function truncateEnd(text: string, maxLength: number) {
  const prefix = text.length > maxLength ? "..." : "";
  const postfix = text.slice(Math.max(0, text.length - maxLength));

  return prefix + postfix;
}

function truncateStart(text: string, maxLength: number) {
  const prefix = text.slice(0, maxLength);
  const postfix = text.length > maxLength ? "..." : "";

  return prefix + postfix;
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
                  <th>Key</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th className="text-end">Updated</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.items.map((item) => (
                  <tr key={item.id}>
                    <td className="max-w-64">
                      <Link
                        className="link link-hover line-clamp-1"
                        to={`/knowledge/item/${item.id}`}
                      >
                        {getKey(item)}
                      </Link>
                    </td>

                    <td>
                      <div className="line-clamp-1">
                        {truncateStart(item.title?.trim() || "-", 50)}
                      </div>
                    </td>

                    <td className="w-24">
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
                    </td>
                    <td className="min-w-38 text-end">
                      {moment(item.updatedAt).fromNow()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Outlet />
        </div>
      )}
    </>
  );
}
