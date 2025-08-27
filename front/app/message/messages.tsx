import type { Message } from "libs/prisma";
import type { Route } from "./+types/messages";
import { TbMessage, TbMessages, TbPointer } from "react-icons/tb";
import { Page } from "~/components/page";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import { makeMessagePairs } from "./analyse";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { Outlet, Link as RouterLink } from "react-router";
import { ViewSwitch } from "./view-switch";
import { CountryFlag } from "./country-flag";
import { Rating } from "./rating-badge";
import { EmptyState } from "~/components/empty-state";
import { ScoreBadge } from "~/components/score-badge";
import { ChannelBadge } from "~/components/channel-badge";
import moment from "moment";
import cn from "@meltdownjs/cn";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

  const messages = await prisma.message.findMany({
    where: {
      scrapeId,
      createdAt: {
        gte: ONE_WEEK_AGO,
      },
    },
    include: {
      thread: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return { messagePairs: makeMessagePairs(messages) };
}

function getMessageContent(message?: Message) {
  return (message?.llmMessage as any)?.content ?? "-";
}

export default function MessagesLayout({ loaderData }: Route.ComponentProps) {
  return (
    <Page title="Messages" icon={<TbMessage />} right={<ViewSwitch />}>
      <div className="flex flex-col gap-2 flex-1">
        {loaderData.messagePairs.length === 0 && (
          <div className="flex flex-1 justify-center items-center">
            <EmptyState
              title="No messages yet!"
              description="Embed the chatbot, use MCP server or the Discord Bot to let your customers talk with your documentation."
              icon={<TbMessage />}
            />
          </div>
        )}
        {loaderData.messagePairs.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="text-base-content/50">
              Showing messages in last 7 days
            </div>

            {loaderData.messagePairs.length > 0 && (
              <div
                className={cn(
                  "overflow-x-auto border border-base-300",
                  "rounded-box bg-base-200/50 shadow"
                )}
              >
                <table className="table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Details</th>
                      <th>Channel</th>
                      <th className="text-end">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loaderData.messagePairs.map((pair, index) => (
                      <tr key={index}>
                        <td>
                          <div className="w-md line-clamp-1">
                            <RouterLink
                              className="link link-hover"
                              to={`/messages/${pair.queryMessage?.id}`}
                            >
                              {getMessageContent(pair.queryMessage)}
                            </RouterLink>
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2 items-center">
                            {!pair.queryMessage?.thread.isDefault && (
                              <div
                                className="tooltip"
                                data-tip="View the conversation"
                              >
                                <RouterLink
                                  className="btn btn-xs btn-square"
                                  to={`/messages/conversations?id=${pair.queryMessage?.threadId}`}
                                >
                                  <TbMessages />
                                </RouterLink>
                              </div>
                            )}
                            {pair.queryMessage?.thread.location && (
                              <CountryFlag
                                location={pair.queryMessage.thread.location}
                              />
                            )}

                            {pair.actionCalls.length > 0 && (
                              <div className="badge badge-secondary badge-soft gap-1 px-2">
                                <TbPointer />
                                {pair.actionCalls.length}
                              </div>
                            )}

                            {pair.maxScore !== undefined && (
                              <ScoreBadge score={pair.maxScore} />
                            )}
                            <Rating rating={pair.responseMessage.rating} />
                          </div>
                        </td>
                        <td className="w-10">
                          <ChannelBadge channel={pair.queryMessage?.channel} />
                        </td>
                        <td className="text-end min-w-34">
                          {moment(pair.queryMessage?.createdAt).fromNow()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <Outlet />
    </Page>
  );
}
