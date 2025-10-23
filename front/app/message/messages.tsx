import type { CategorySuggestion, Message, Prisma, Scrape } from "libs/prisma";
import type { Route } from "./+types/messages";
import { TbFolder, TbMessage, TbMessages, TbPointer } from "react-icons/tb";
import { Page } from "~/components/page";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import { makeMessagePairs } from "./analyse";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import {
  Outlet,
  Link as RouterLink,
  useLocation,
  useNavigate,
} from "react-router";
import { ViewSwitch } from "./view-switch";
import { CountryFlag } from "./country-flag";
import { Rating } from "./rating-badge";
import { EmptyState } from "~/components/empty-state";
import { ScoreBadge } from "~/components/score-badge";
import { ChannelBadge } from "~/components/channel-badge";
import { getQueryString } from "libs/llm-message";
import moment from "moment";
import cn from "@meltdownjs/cn";
import { makeMeta } from "~/meta";
import { useEffect, useMemo, useState } from "react";
import { CreditsUsedBadge } from "./credits-used-badge";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const url = new URL(request.url);

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId },
  });

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const where: Prisma.MessageWhereInput = {
    scrapeId,
    createdAt: {
      gte: ONE_WEEK_AGO,
    },
  };
  if (url.searchParams.get("category")) {
    where.analysis = {
      is: {
        category: url.searchParams.get("category"),
      },
    };
  }

  const messages = await prisma.message.findMany({
    where,
    include: {
      thread: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return { messagePairs: makeMessagePairs(messages), scrape };
}

export function meta() {
  return makeMeta({
    title: "Messages - CrawlChat",
  });
}

function getMessageContent(message?: Message) {
  const content = (message?.llmMessage as any)?.content;
  return getQueryString(content) ?? "-";
}

function CategorySuggestionCount({
  scrape,
  suggestions,
}: {
  scrape: Scrape;
  suggestions: CategorySuggestion[];
}) {
  const filtered = suggestions.filter(
    (suggestion) =>
      !scrape.messageCategories.some(
        (category) =>
          category.title.trim().toLowerCase() ===
          suggestion.title.trim().toLowerCase()
      )
  );

  if (filtered.length === 0) return null;

  return (
    <div
      className="tooltip"
      data-tip={filtered.map((suggestion) => suggestion.title).join(", ")}
    >
      <span className="text-base-content/50">+{filtered.length}</span>
    </div>
  );
}

export default function MessagesLayout({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [category, setCategory] = useState<string>();

  useEffect(() => {
    const url = new URL(window.location.href);
    setCategory(url.searchParams.get("category") ?? undefined);
  }, [location.search]);

  useEffect(() => {
    if (category !== undefined) {
      navigate(category ? `/messages?category=${category}` : `/messages`);
    }
  }, [category]);

  return (
    <Page title="Messages" icon={<TbMessage />} right={<ViewSwitch />}>
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 justify-between">
          <div className="text-base-content/50">
            Showing messages in last 7 days
          </div>

          <select
            value={category ?? ""}
            className="select w-fit"
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {loaderData.scrape.messageCategories.map((category, index) => (
              <option key={index} value={category.title}>
                {category.title}
              </option>
            ))}
          </select>
        </div>

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
                      <th>Category</th>
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
                            {pair.responseMessage.creditsUsed !== null && (
                              <CreditsUsedBadge
                                creditsUsed={pair.responseMessage.creditsUsed}
                                llmModel={pair.responseMessage.llmModel}
                              />
                            )}
                          </div>
                        </td>
                        <td className="w-10">
                          <ChannelBadge
                            channel={pair.queryMessage?.channel}
                            onlyIcon
                          />
                        </td>
                        <td className="min-w-12 flex items-center gap-2">
                          {pair.queryMessage?.analysis?.category && (
                            <span className="badge badge-soft badge-accent whitespace-nowrap">
                              <TbFolder />
                              {pair.queryMessage?.analysis?.category}
                            </span>
                          )}
                          <CategorySuggestionCount
                            scrape={loaderData.scrape}
                            suggestions={
                              pair.queryMessage?.analysis
                                ?.categorySuggestions ?? []
                            }
                          />
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
