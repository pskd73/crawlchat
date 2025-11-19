import type { Route } from "./+types/message";
import type { ApiAction, CategorySuggestion, Message } from "libs/prisma";
import {
  TbFolder,
  TbMessage,
  TbMessages,
  TbPaperclip,
  TbPhoto,
  TbPlus,
  TbSettingsBolt,
} from "react-icons/tb";
import { MarkdownProse } from "~/widget/markdown-prose";
import { useEffect, useMemo, useState } from "react";
import { makeMessagePairs } from "./analyse";
import { prisma } from "libs/prisma";
import {
  Link,
  Link as RouterLink,
  useFetcher,
  useLocation,
} from "react-router";
import { CountryFlag } from "./country-flag";
import { extractCitations } from "libs/citation";
import { DataList } from "~/components/data-list";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { Rating } from "./rating-badge";
import { Page } from "~/components/page";
import { ChannelBadge } from "~/components/channel-badge";
import cn from "@meltdownjs/cn";
import moment from "moment";
import { ScoreBadge } from "~/components/score-badge";
import { makeMeta } from "~/meta";
import { getImagesCount, getQueryString } from "libs/llm-message";
import { SentimentBadge } from "./sentiment-badge";

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
}: {
  message: Message;
  actionsMap: Map<string, ApiAction>;
}) {
  const [hoveredUniqueId, setHoveredUniqueId] = useState<string | null>(null);
  const citation = useMemo(
    () => extractCitations(getMessageContent(message), message.links),
    [message]
  );

  return (
    <div className="flex flex-col gap-4 max-w-prose">
      <div className="bg-base-200/50 rounded-box p-4 shadow border border-base-300">
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

      {message.links.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-lg">Resources</div>
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
                    <td className="w-18 md:w-56">{link.searchQuery ?? "-"}</td>
                    <td className="w-24">
                      {link.score && <ScoreBadge score={link.score} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {message.apiActionCalls.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-lg">Actions</div>
          {message.apiActionCalls.map((call, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 border border-base-300 rounded-box p-4 bg-base-200"
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
      <div className="tooltip" data-tip="Add category to the collection">
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
            Add <TbPlus />
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}

export default function Message({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const imagesCount = useMemo(
    () =>
      getImagesCount(
        (loaderData.messagePair?.queryMessage?.llmMessage as any)?.content
      ),
    [loaderData.messagePair]
  );

  useEffect(() => {
    const drawer = document.getElementById(
      "message-drawer"
    ) as HTMLInputElement;
    if (drawer) {
      drawer.checked = true;
    }
  }, [location.pathname]);

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
              sentiment={messagePair?.responseMessage?.analysis?.questionSentiment}
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
              {moment(messagePair?.queryMessage?.createdAt).fromNow()}
            </span>
          </div>
        </div>

        {messagePair?.queryMessage?.attachments &&
          messagePair.queryMessage.attachments.length > 0 && (
            <div
              className={cn(
                "bg-base-200/50 rounded-box p-2 shadow border border-base-300",
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
          />
        )}

        {filteredCategorySuggestions &&
          filteredCategorySuggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-lg">Category Suggestions</div>
              <div
                className={cn(
                  "flex flex-col bg-base-200/50 rounded-box",
                  "shadow border border-base-300 max-w-prose"
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
