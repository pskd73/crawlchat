import type {
  CategorySuggestion,
  Message,
  Prisma,
  Scrape,
  ScrapeItem,
} from "@packages/common/prisma";
import type { Route } from "./+types/messages";
import {
  TbChevronLeft,
  TbChevronRight,
  TbConfetti,
  TbFolder,
  TbMessage,
  TbMessages,
  TbPaperclip,
  TbPointer,
  TbX,
} from "react-icons/tb";
import { Page } from "~/components/page";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "@packages/common/prisma";
import { makeMessagePairs } from "./analyse";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import { CountryFlag } from "./country-flag";
import { Rating } from "./rating-badge";
import { EmptyState } from "~/components/empty-state";
import { ScoreBadge } from "~/components/score-badge";
import { ChannelBadge } from "~/components/channel-badge";
import { getQueryString } from "@packages/common/llm-message";
import cn from "@meltdownjs/cn";
import { Timestamp } from "~/components/timestamp";
import { makeMeta } from "~/meta";
import type { PropsWithChildren } from "react";
import { CreditsUsedBadge } from "./credits-used-badge";
import { SentimentBadge } from "./sentiment-badge";
import Avatar from "boring-avatars";
import { LanguageBadge } from "./language-badge";
import { ViewSwitch } from "./view-switch";

function isLowRating(message: Message) {
  if (message.analysis?.questionSentiment === "sad") return true;

  if (message.links.length === 0) return false;

  if (message.rating === "down") return true;

  const maxScore = Math.max(...message.links.map((l) => l.score ?? 0));

  return maxScore < 0.5;
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const pageSize = 20;

  const where: Prisma.MessageWhereInput = {
    scrapeId,
    llmMessage: {
      is: {
        role: "user",
      },
    },
    OR: [
      {
        channel: {
          not: "mcp",
        },
      },
      {
        channel: {
          isSet: false,
        },
      },
    ],
  };
  if (url.searchParams.get("category")) {
    where.analysis = {
      is: {
        category: url.searchParams.get("category"),
      },
    };
  }
  if (url.searchParams.get("fingerprint")) {
    where.fingerprint = url.searchParams.get("fingerprint");
  }
  if (url.searchParams.get("mcp")) {
    delete where.OR;
  }

  const pageId = url.searchParams.get("pageId");
  let filterItem: ScrapeItem | null = null;
  if (pageId) {
    filterItem = await prisma.scrapeItem.findFirstOrThrow({
      where: {
        scrapeId,
        id: pageId,
      },
    });
    const answersWithLink = await prisma.message.findMany({
      where: {
        scrapeId,
        questionId: { not: null },
        links: { some: { scrapeItemId: pageId, cited: true } },
      },
      select: { questionId: true },
    });
    const questionIds = [
      ...new Set(
        answersWithLink
          .map((a) => a.questionId)
          .filter((id): id is string => id !== null)
      ),
    ];
    where.id = { in: questionIds };
  }

  const total = await prisma.message.count({
    where,
  });

  const questions = await prisma.message.findMany({
    where,
    include: {
      thread: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const answers = await prisma.message.findMany({
    where: {
      questionId: {
        in: questions.map((q) => q.id),
      },
    },
    include: {
      thread: true,
    },
  });

  let messagePairs = makeMessagePairs([...questions, ...answers]);
  if (url.searchParams.get("low-rating")) {
    messagePairs = messagePairs.filter((pair) =>
      isLowRating(pair.responseMessage)
    );
  }

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId },
  });

  return {
    messagePairs,
    scrape,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    filterItem,
  };
}

export function meta() {
  return makeMeta({
    title: "Messages - CrawlChat",
  });
}

export function getMessageContent(message?: Message) {
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

function Pagination({
  page,
  totalPages,
  setPage,
}: {
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
}) {
  const previous = page > 1;
  const next = page < totalPages;

  return (
    <div className="flex justify-center items-center gap-2">
      <button
        onClick={() => setPage(page - 1)}
        className="btn btn-square"
        disabled={!previous}
      >
        <TbChevronLeft />
      </button>
      {page} / {totalPages}
      <button
        onClick={() => setPage(page + 1)}
        className="btn btn-square"
        disabled={!next}
      >
        <TbChevronRight />
      </button>
    </div>
  );
}

function FilterItem({
  children,
  onRemove,
}: PropsWithChildren<{ onRemove: () => void }>) {
  return (
    <div
      className={cn(
        "flex gap-2 items-center border-2 border-base-300 pb-2",
        "rounded-box bg-base-100 p-2 h-10 pl-3 text-sm whitespace-nowrap"
      )}
    >
      {children}
      <button className="btn btn-square btn-xs" onClick={onRemove}>
        <TbX />
      </button>
    </div>
  );
}

export default function MessagesLayout({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function goto({
    page,
    category,
    showMcp,
    showOnlyLowRatings,
  }: {
    page?: number;
    category?: string;
    showMcp?: boolean;
    showOnlyLowRatings?: boolean;
  }) {
    const params = new URLSearchParams(location.search);
    if (page !== undefined) {
      params.set("page", page.toString());
    }

    if (category !== undefined) {
      if (category) {
        params.set("category", category);
      } else {
        params.delete("category");
      }
    }

    if (showMcp !== undefined) {
      if (showMcp) {
        params.set("mcp", "true");
      } else {
        params.delete("mcp");
      }
    }

    if (showOnlyLowRatings !== undefined) {
      if (showOnlyLowRatings) {
        params.set("low-rating", "true");
      } else {
        params.delete("low-rating");
      }
    }

    navigate(`/questions?${params.toString()}`);
  }

  const params = new URLSearchParams(location.search);
  const category = params.get("category");
  const showMcp = params.get("mcp") === "true";
  const showOnlyLowRatings = params.get("low-rating") === "true";

  return (
    <Page title="Questions" icon={<TbMessage />} right={<ViewSwitch />}>
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
            {loaderData.filterItem && (
              <div className="flex flex-col gap-2">
                Page: {loaderData.filterItem.title}
              </div>
            )}

            <div className="flex gap-2 items-center overflow-x-auto">
              {showMcp && (
                <FilterItem onRemove={() => goto({ showMcp: false })}>
                  MCP
                </FilterItem>
              )}
              {showOnlyLowRatings && (
                <FilterItem
                  onRemove={() => goto({ showOnlyLowRatings: false })}
                >
                  Low ratings
                </FilterItem>
              )}

              <select
                value={category ?? ""}
                className="select w-fit outline-0"
                onChange={(e) => goto({ category: e.target.value })}
              >
                <option value="">All categories</option>
                {loaderData.scrape.messageCategories.map((category, index) => (
                  <option key={index} value={category.title}>
                    {category.title}
                  </option>
                ))}
              </select>

              <select
                value={category ?? ""}
                className="select w-fit outline-0"
                onChange={(e) => {
                  if (e.target.value === "mcp") {
                    goto({ showMcp: true });
                  } else if (e.target.value === "low-rating") {
                    goto({ showOnlyLowRatings: true });
                  }
                }}
              >
                <option>Filter</option>
                {!showMcp && <option value="mcp">MCP</option>}
                {!showOnlyLowRatings && (
                  <option value="low-rating">Low ratings</option>
                )}
              </select>
            </div>

            <div
              className={cn(
                "overflow-x-auto border border-base-300",
                "rounded-box bg-base-100 shadow"
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
                        <div className="w-[400px] min-w-0 flex items-center gap-2">
                          {pair.queryMessage?.fingerprint && (
                            <Avatar
                              name={pair.queryMessage.fingerprint}
                              size={24}
                              variant="beam"
                              className="shrink-0"
                            />
                          )}
                          <div
                            className="min-w-0 tooltip tooltip-right"
                            data-tip={
                              pair.responseMessage?.analysis?.shortQuestion
                            }
                          >
                            <RouterLink
                              className="link link-hover block truncate max-w-fit"
                              to={`/questions/${pair.queryMessage?.id}`}
                            >
                              {getMessageContent(pair.queryMessage)}
                            </RouterLink>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2 items-center">
                          {!pair.queryMessage?.thread.isDefault && (
                            <div
                              className="tooltip"
                              data-tip="View in conversation"
                            >
                              <RouterLink
                                className="btn btn-xs btn-square"
                                to={`/questions/conversations/${pair.queryMessage?.threadId}#message-${pair.queryMessage?.id}`}
                              >
                                <TbMessages />
                              </RouterLink>
                            </div>
                          )}

                          {pair.responseMessage?.analysis?.resolved && (
                            <div className="tooltip" data-tip="Resolved">
                              <div className="badge badge-primary badge-soft gap-1 px-2">
                                <TbConfetti />
                              </div>
                            </div>
                          )}

                          {pair.queryMessage?.thread.location && (
                            <CountryFlag
                              location={pair.queryMessage.thread.location}
                            />
                          )}

                          <SentimentBadge
                            sentiment={
                              pair.responseMessage?.analysis?.questionSentiment
                            }
                          />

                          {pair.queryMessage?.attachments &&
                            pair.queryMessage.attachments.length > 0 && (
                              <div
                                className="tooltip"
                                data-tip={pair.queryMessage.attachments
                                  .map((attachment) => attachment.name)
                                  .join(", ")}
                              >
                                <div className="badge badge-secondary badge-soft gap-1 px-2">
                                  <TbPaperclip />
                                  {pair.queryMessage.attachments.length}
                                </div>
                              </div>
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
                          {pair.responseMessage.analysis?.language && (
                            <LanguageBadge
                              language={pair.responseMessage.analysis.language}
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
                      <td className="min-w-12">
                        <div className="flex items-center gap-2">
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
                        </div>
                      </td>
                      <td className="text-end min-w-46">
                        {pair.queryMessage?.createdAt && (
                          <Timestamp date={pair.queryMessage.createdAt} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Pagination
                page={loaderData.page}
                totalPages={loaderData.totalPages}
                setPage={(page) => goto({ page })}
              />
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
