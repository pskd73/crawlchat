import type { Route } from "./+types/list";
import { TbPlus, TbPointer } from "react-icons/tb";
import { Link } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { Page } from "~/components/page";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { prisma } from "libs/prisma";
import { EmptyState } from "~/components/empty-state";
import moment from "moment";
import cn from "@meltdownjs/cn";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const actions = await prisma.apiAction.findMany({
    where: {
      scrapeId,
    },
  });

  const counts: Record<string, number> = {};
  for (const action of actions) {
    const count = await prisma.message.count({
      where: {
        scrapeId,
        apiActionCalls: {
          some: {
            actionId: action.id,
          },
        },
      },
    });
    counts[action.id] = count;
  }

  return { actions, counts };
}

function NoActions() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState
        title="No actions yet"
        description="Actions let you connect to external systems with HTTP APIs. These actions will get called by AI and chatbot whenever required. These APIs are called from backend in a secured way."
        icon={<TbPointer />}
        children={
          <Link className={"btn btn-primary"} to="/actions/new">
            <TbPlus />
            New
          </Link>
        }
      />
    </div>
  );
}

export default function Actions({ loaderData }: Route.ComponentProps) {
  return (
    <Page
      title="Actions"
      icon={<TbPointer />}
      right={
        <Link className={"btn btn-primary btn-soft"} to="/actions/new">
          <TbPlus />
          New
        </Link>
      }
    >
      {loaderData.actions.length === 0 && <NoActions />}
      {loaderData.actions.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="text-base-content/50">
            Actions let you connect to external systems with HTTP APIs. These
            actions will get called by AI and chatbot whenever required. These
            APIs are called from backend in a secured way.
          </div>

          <div
            className={cn(
              "overflow-x-auto border border-base-300",
              "rounded-box bg-base-200/50 shadow"
            )}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>URL</th>
                  <th>Method</th>
                  <th>Calls</th>
                  <th className="text-end">Created</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.actions.map((item) => (
                  <tr key={item.id}>
                    <td className="max-w-44 truncate">
                      <Link
                        className="link link-hover"
                        to={`/actions/${item.id}`}
                        prefetch="intent"
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td>
                      <div className="truncate">{item.url}</div>
                    </td>
                    <td className="min-w-22">{item.method.toUpperCase()}</td>
                    <td className="min-w-16">
                      <div className="badge badge-soft badge-primary gap-2">
                        <TbPointer />
                        {loaderData.counts[item.id]}
                      </div>
                    </td>
                    <td className="text-end min-w-32">
                      {moment(item.createdAt).fromNow()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Page>
  );
}
