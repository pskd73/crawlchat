import type { Route } from "./+types/message";
import type { ApiAction, Message } from "libs/prisma";
import { TbChartBar, TbMessage, TbSettingsBolt } from "react-icons/tb";
import { MarkdownProse } from "~/widget/markdown-prose";
import { useEffect, useMemo, useState } from "react";
import { makeMessagePairs } from "./analyse";
import { prisma } from "libs/prisma";
import {
  Link,
  Link as RouterLink,
  useLocation,
  useNavigate,
} from "react-router";
import { CountryFlag } from "./country-flag";
import { extractCitations } from "libs/citation";
import { DataList } from "~/components/data-list";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { Rating } from "./rating-badge";
import { Page } from "~/components/page";
import { ChannelBadge } from "~/components/channel-badge";
import toast from "react-hot-toast";
import cn from "@meltdownjs/cn";
import moment from "moment";
import { ScoreBadge } from "~/components/score-badge";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

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

  return { messagePairs, messagePair, actionsMap };
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
      <MarkdownProse
        sources={Object.values(citation.citedLinks).map((link) => ({
          title: link?.title ?? link?.url ?? "Source",
          url: link?.url ?? undefined,
        }))}
        options={{
          disabled: true,
          onSourceMouseEnter: (index) => {
            for (let i = 0; i < Object.keys(citation.citedLinks).length; i++) {
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
          {message.apiActionCalls.map((call) => (
            <div className="flex flex-col gap-2 border border-base-300 rounded-box p-4 bg-base-200">
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

export default function Message({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const location = useLocation();

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

  function copyMessage() {
    navigator.clipboard.writeText(
      (messagePair?.queryMessage?.llmMessage as any)?.content ?? ""
    );
    toast.success("Copied to clipboard");
  }

  return (
    <Page
      title="Message"
      icon={<TbMessage />}
      right={
        <Link
          className="btn btn-primary"
          to={`/messages/${messagePair?.queryMessage?.id}/fix`}
        >
          <TbSettingsBolt />
          Correct it
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 max-w-prose">
          <div className="text-2xl">
            {(messagePair?.queryMessage?.llmMessage as any)?.content}
          </div>

          <div className="flex gap-2 items-center">
            <ChannelBadge channel={messagePair?.queryMessage?.channel} />
            {messagePair?.responseMessage.rating && (
              <Rating rating={messagePair?.responseMessage.rating} />
            )}
            {messagePair?.queryMessage?.thread.location && (
              <CountryFlag
                location={messagePair?.queryMessage?.thread.location}
              />
            )}
            <span>
              {moment(messagePair?.queryMessage?.createdAt).fromNow()}
            </span>
          </div>
        </div>

        {messagePair && (
          <AssistantMessage
            message={messagePair.responseMessage}
            actionsMap={actionsMap}
          />
        )}
      </div>
    </Page>
  );
}
