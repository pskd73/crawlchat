import type { Route } from "./+types/message";
import type {
  ApiAction,
  CategorySuggestion,
  Message,
} from "@packages/common/prisma";
import {
  TbFolder,
  TbMessage,
  TbMessages,
  TbPaperclip,
  TbPhoto,
  TbPlus,
  TbSettingsBolt,
  TbStarFilled,
} from "react-icons/tb";
import { MarkdownProse } from "~/widget/markdown-prose";
import { useMemo, useState } from "react";
import { makeMessagePairs, type MessagePair } from "./analyse";
import { prisma } from "@packages/common/prisma";
import { Link, Link as RouterLink, useFetcher } from "react-router";
import { CountryFlag } from "./country-flag";
import { extractCitations } from "@packages/common/citation";
import { DataList } from "~/components/data-list";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { Rating } from "./rating-badge";
import { Page } from "~/components/page";
import { ChannelBadge } from "~/components/channel-badge";
import cn from "@meltdownjs/cn";
import { ScoreBadge } from "~/components/score-badge";
import { Timestamp } from "~/components/timestamp";
import { makeMeta } from "~/meta";
import { getImagesCount, getQueryString } from "@packages/common/llm-message";
import { SentimentBadge } from "./sentiment-badge";
import { SearchTypeBadge } from "./search-type-badge";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: {
      id: scrapeId,
    },
  });

  const queryMessage = await prisma.message.findUnique({
    where: {
      id: params.queryMessageId,
    },
  });

  const messages = await prisma.message.findMany({
    where: {
      scrapeId,
      threadId: queryMessage?.threadId,
    },
    include: {
      thread: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const messagePairs = makeMessagePairs(messages);
  const messagePair = messagePairs.find(
    (pair) => pair.queryMessage?.id === params.queryMessageId
  );

  const actions = await prisma.apiAction.findMany({
    where: {
      scrapeId,
    },
  });
  const actionsMap = new Map<string, ApiAction>(
    actions.map((action) => [action.id, action])
  );

  return { messagePairs, messagePair, actionsMap, scrape };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: `${
      (data.messagePair?.queryMessage?.llmMessage as any)?.content ?? "Message"
    } - CrawlChat`,
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  const scrape = await prisma.scrape.findFirst({
    where: {
      id: scrapeId,
    },
  });

  if (!scrape) {
    return Response.json({ error: "Scrape not found" }, { status: 404 });
  }

  if (intent === "add-category") {
    const suggestion = JSON.parse(formData.get("suggestion") as string);
    await prisma.scrape.update({
      where: { id: scrapeId },
      data: {
        messageCategories: {
          push: { ...suggestion, createdAt: new Date() },
        },
      },
    });

    const message = await prisma.message.findFirstOrThrow({
      where: { id: params.queryMessageId },
    });

    const index = parseInt(formData.get("index") as string);

    await prisma.message.update({
      where: { id: message.id },
      data: {
        analysis: {
          set: {
            categorySuggestions:
              message.analysis?.categorySuggestions?.filter(
                (_, i) => i !== index
              ) ?? [],
          },
        },
      },
    });

    return { success: true };
  }
}

function getMessageContent(message?: Message) {
  return (message?.llmMessage as any)?.content ?? "-";
}

function AssistantMessage({
  message,
  actionsMap,
  showResources = true,
}: {
  message: Message;
  actionsMap: Map<string, ApiAction>;
  showResources?: boolean;
}) {
  const [hoveredUniqueId, setHoveredUniqueId] = useState<string | null>(null);
  const citation = useMemo(
    () => extractCitations(getMessageContent(message), message.links),
    [message]
  );
  const flashToolCalls = useMemo(() => {
    return message.toolCalls
      .filter((toolCall) =>
        ["grep", "ls", "find", "tree", "read"].includes(toolCall.toolName)
      )
      .map((toolCall) => ({
        toolName: toolCall.toolName,
        params: JSON.stringify(toolCall.params),
        responseLength: toolCall.responseLength,
      }));
  }, [message.toolCalls]);

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "bg-base-100 rounded-box p-4 shadow border border-base-300",
          "max-w-prose"
        )}
      >
        <MarkdownProse
          sources={Object.values(citation.citedLinks).map((link) => ({
            title: link?.title ?? link?.url ?? "Source",
            url: link?.url ?? undefined,
          }))}
          options={{
            disabled: true,
            onSourceMouseEnter: (index) => {
              for (
                let i = 0;
                i < Object.keys(citation.citedLinks).length;
                i++
              ) {
                if (
                  citation.citedLinks[i].fetchUniqueId ===
                  message.links[index].fetchUniqueId
                ) {
                  setHoveredUniqueId(message.links[index].fetchUniqueId);
                  break;
                }
              }
            },
            onSourceMouseLeave: () => setHoveredUniqueId(null),
          }}
        >
          {citation.content}
        </MarkdownProse>
      </div>

      {flashToolCalls.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-lg">Codebase search</div>
          <div className="flex flex-col bg-base-100 rounded-box shadow border border-base-300">
            {flashToolCalls.map((toolCall, index) => (
              <div
                key={index}
                className={cn(
                  "p-2 border-b border-base-300 last:border-b-0",
                  "flex gap-2 items-center justify-between"
                )}
              >
                <div className="flex gap-2 items-center">
                  <div>{toolCall.toolName}</div>
                  <div className="text-xs text-base-content/50">
                    {JSON.parse(toolCall.params)}
                  </div>
                </div>
                <div className="tooltip" data-tip="Response length">
                  <div className="badge">{toolCall.responseLength}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResources && message.links.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-lg">Resources</div>
          <div
            className={cn(
              "overflow-x-auto border border-base-300",
              "rounded-box bg-base-100 shadow"
            )}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Query</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {message.links.map((link, index) => (
                  <tr
                    className={cn(
                      hoveredUniqueId === link.fetchUniqueId
                        ? "bg-brand-gray-100"
                        : "bg-brand-white"
                    )}
                    key={index}
                  >
                    <td>
                      <RouterLink
                        className="link link-hover"
                        to={`/knowledge/item/${link.scrapeItemId}`}
                        target="_blank"
                      >
                        {link.title || link.url}
                      </RouterLink>
                    </td>
                    <td className="w-28">
                      <SearchTypeBadge searchType={link.searchType ?? "-"} />
                    </td>
                    <td className="font-mono">
                      {link.searchQuery ? (
                        link.searchType === "search_data" ? (
                          <div
                            className="tooltip"
                            data-tip="Search in the knowledge base"
                          >
                            <Link
                              className={cn("link link-hover link-primary")}
                              to={`/knowledge?query=${link.searchQuery}`}
                              target="_blank"
                            >
                              {link.searchQuery}
                            </Link>
                          </div>
                        ) : (
                          link.searchQuery
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="w-24">
                      {link.score ? (
                        <div className="flex items-center gap-1">
                          {link.cited && (
                            <div className="badge badge-secondary badge-soft gap-1 px-2">
                              <TbStarFilled />
                            </div>
                          )}
                          <ScoreBadge score={link.score} />
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showResources && message.apiActionCalls.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-lg">Actions</div>
          {message.apiActionCalls.map((call, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 border border-base-300 rounded-box p-4 bg-base-100"
            >
              <DataList
                data={[
                  {
                    label: "Title",
                    value: actionsMap.get(call.actionId)?.title,
                  },
                  {
                    label: "Status code",
                    value: call.statusCode,
                  },
                  {
                    label: "Input",
                    value: JSON.stringify(call.data, null, 2),
                  },
                  {
                    label: "Output",
                    value: call.response as string,
                  },
                ]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySuggestion({
  suggestion,
  index,
}: {
  suggestion: CategorySuggestion;
  index: number;
}) {
  const fetcher = useFetcher();

  return (
    <div
      className={cn(
        "p-4 border-b border-base-300 last:border-b-0",
        "flex justify-between items-center"
      )}
    >
      <div>
        {suggestion.title}
        <p className="text-sm text-base-content/50">{suggestion.description}</p>
      </div>
      <div className="tooltip" data-tip="Add as category">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="add-category" />
          <input
            type="hidden"
            name="suggestion"
            value={JSON.stringify(suggestion)}
          />
          <input type="hidden" name="index" value={index} />
          <button
            className="btn btn-soft btn-primary"
            type="submit"
            disabled={fetcher.state !== "idle"}
          >
            {fetcher.state !== "idle" && (
              <span className="loading loading-spinner loading-xs" />
            )}
            Category <TbPlus />
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}

export function QuestionAnswer({
  messagePair,
  actionsMap,
  showResources = true,
}: {
  messagePair: MessagePair;
  actionsMap: Map<string, ApiAction>;
  showResources?: boolean;
}) {
  const imagesCount = useMemo(
    () =>
      getImagesCount((messagePair?.queryMessage?.llmMessage as any)?.content),
    [messagePair]
  );

  return (
    <>
      <div className="flex flex-col gap-2 max-w-prose">
        <div className="text-2xl">
          {getQueryString(
            (messagePair?.queryMessage?.llmMessage as any)?.content
          )}
        </div>

        <div className="flex gap-2 items-center">
          {messagePair?.queryMessage?.analysis?.category && (
            <span className="badge badge-soft badge-accent whitespace-nowrap">
              <TbFolder />
              {messagePair?.queryMessage?.analysis?.category}
            </span>
          )}
          <SentimentBadge
            sentiment={
              messagePair?.responseMessage?.analysis?.questionSentiment
            }
          />
          <ChannelBadge channel={messagePair?.queryMessage?.channel} />
          {messagePair?.responseMessage.rating && (
            <Rating rating={messagePair?.responseMessage.rating} />
          )}
          {messagePair?.queryMessage?.thread.location && (
            <CountryFlag
              location={messagePair?.queryMessage?.thread.location}
            />
          )}
          {imagesCount > 0 && (
            <span className="badge badge-primary badge-soft">
              <TbPhoto />
              {imagesCount}
            </span>
          )}
          <span>
            {messagePair?.queryMessage?.createdAt && (
              <Timestamp date={messagePair.queryMessage.createdAt} />
            )}
          </span>
        </div>
      </div>

      {messagePair?.queryMessage?.attachments &&
        messagePair.queryMessage.attachments.length > 0 && (
          <div
            className={cn(
              "bg-base-100 rounded-box p-2 shadow border border-base-300",
              "max-w-prose flex flex-col gap-2"
            )}
          >
            {messagePair.queryMessage.attachments.map((attachment, index) => (
              <div
                className="collapse bg-base-100 border border-base-300"
                key={index}
              >
                <input type="radio" name="my-accordion-1" />
                <div className="collapse-title font-semibold flex items-center gap-2">
                  <TbPaperclip />
                  {attachment.name}
                </div>
                <pre className="collapse-content text-sm">
                  {attachment.content}
                </pre>
              </div>
            ))}
          </div>
        )}

      {messagePair && (
        <AssistantMessage
          message={messagePair.responseMessage}
          actionsMap={actionsMap}
          showResources={showResources}
        />
      )}
    </>
  );
}

export default function Message({ loaderData }: Route.ComponentProps) {
  const messagePair = loaderData.messagePair;
  const actionsMap = loaderData.actionsMap;
  const categorySuggestions =
    messagePair?.queryMessage?.analysis?.categorySuggestions;
  const filteredCategorySuggestions = useMemo(() => {
    return categorySuggestions?.filter(
      (suggestion) =>
        !loaderData.scrape.messageCategories.some(
          (category) =>
            category.title.trim().toLowerCase() ===
            suggestion.title.trim().toLowerCase()
        )
    );
  }, [categorySuggestions, loaderData.scrape.messageCategories]);

  return (
    <Page
      title="Question"
      icon={<TbMessage />}
      right={
        <>
          {!messagePair?.queryMessage?.thread.isDefault && (
            <Link
              className="btn btn-primary btn-soft"
              to={`/questions/conversations?id=${messagePair?.queryMessage?.threadId}`}
              target="_blank"
            >
              <TbMessages />
              <span className="hidden md:block">View conversation</span>
            </Link>
          )}
          <Link
            className="btn btn-primary btn-soft"
            to={`/questions/${messagePair?.queryMessage?.id}/fix`}
          >
            <TbSettingsBolt />
            <span className="hidden md:block">Correct it</span>
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {messagePair && (
          <QuestionAnswer messagePair={messagePair} actionsMap={actionsMap} />
        )}

        {filteredCategorySuggestions &&
          filteredCategorySuggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-lg">Tags</div>
              <div
                className={cn(
                  "flex flex-col bg-base-100 rounded-box",
                  "shadow border border-base-300"
                )}
              >
                {filteredCategorySuggestions
                  .filter(
                    (suggestion) =>
                      !loaderData.scrape.messageCategories.some(
                        (category) =>
                          category.title.trim().toLowerCase() ===
                          suggestion.title.trim().toLowerCase()
                      )
                  )
                  .map((suggestion, index) => (
                    <CategorySuggestion
                      key={index}
                      suggestion={suggestion}
                      index={index}
                    />
                  ))}
              </div>
            </div>
          )}
      </div>
    </Page>
  );
}
