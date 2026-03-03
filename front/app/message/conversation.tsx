import cn from "@meltdownjs/cn";
import { extractCitations } from "@packages/common/citation";
import { prisma, type Message } from "@packages/common/prisma";
import { useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  TbConfetti,
  TbMessage,
  TbMessages,
  TbPointer,
  TbShare,
  TbTrash,
} from "react-icons/tb";
import { Link, redirect, useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { Page } from "~/components/page";
import { ScoreBadge } from "~/components/score-badge";
import { makeMeta } from "~/meta";
import { MarkdownProse } from "~/widget/markdown-prose";
import type { Route } from "./+types/conversation";
import { CreditsUsedBadge } from "./credits-used-badge";
import { SentimentBadge } from "./sentiment-badge";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: {
      id: scrapeId,
    },
  });

  if (!scrape) {
    throw redirect("/app");
  }

  const thread = await prisma.thread.findFirstOrThrow({
    where: { id: params.conversationId },
    include: {
      messages: true,
    },
  });

  return { thread };
}

export function meta() {
  return makeMeta({
    title: "Conversation - CrawlChat",
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await prisma.thread.delete({
      where: { id: params.conversationId },
    });

    return redirect(`/questions/conversations`);
  }

  return null;
}

function AssistantMessage({ message }: { message: Message }) {
  const citation = useMemo(() => {
    return extractCitations(message.llmMessage?.content as any, message.links);
  }, [message.llmMessage?.content, message.links]);

  return (
    <MarkdownProse
      sources={Object.values(citation.citedLinks).map((link) => ({
        title: link?.title ?? link?.url ?? "Source",
        url: link?.url ?? undefined,
      }))}
      options={{ disabled: true }}
    >
      {citation.content}
    </MarkdownProse>
  );
}

export default function Conversation({ loaderData }: Route.ComponentProps) {
  const deleteFetcher = useFetcher();

  useEffect(() => {
    const messageId = new URL(window.location.href).hash.substring(1);
    if (messageId) {
      const messageElement = document.getElementById(messageId);
      const rect = messageElement?.getBoundingClientRect();
      if (rect) {
        window.scrollTo({
          top: rect.top + window.scrollY - 56,
          behavior: "smooth",
        });
      }
    }
  }, [loaderData.thread.messages]);

  function getMessageScore(message: Message) {
    return Math.max(
      ...Object.values(message.links).map((l) => l?.score ?? 0),
      0
    );
  }

  function handleShare() {
    navigator.clipboard.writeText(
      `${window.location.origin}/s/${loaderData.thread.id}`
    );
    toast.success("Share link copied to clipboard");
  }

  return (
    <Page
      title="Conversation"
      icon={<TbMessages />}
      right={
        <div className="flex items-center gap-2">
          {/* <Link
            to={`/questions/conversations/${loaderData.thread.id}/make-guide`}
            className="btn btn-primary btn-soft"
          >
            Make a guide
          </Link> */}

          <div
            className="tooltip tooltip-left"
            data-tip="Share the conversation"
          >
            <button
              className="btn btn-accent btn-soft btn-square"
              onClick={handleShare}
            >
              <TbShare />
            </button>
          </div>

          <deleteFetcher.Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <div
              className="tooltip tooltip-left"
              data-tip="Delete the conversation"
            >
              <button
                className="btn btn-error btn-soft btn-square"
                type="submit"
              >
                {deleteFetcher.state === "submitting" ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <TbTrash />
                )}
              </button>
            </div>
          </deleteFetcher.Form>
        </div>
      }
    >
      <div
        className={cn(
          "bg-base-100 border border-base-300 rounded-box",
          "sticky top-[76px] max-w-prose w-full"
        )}
      >
        {loaderData.thread.messages.map((message) => (
          <div key={message.id}>
            {message.llmMessage?.role === "user" ? (
              <div id={`message-${message.id}`} className={cn("p-4 pb-2")}>
                <span className="font-bold text-xl">
                  {message.llmMessage.content as any}
                </span>
              </div>
            ) : (
              <div className="border-b border-base-300 p-4 pt-0">
                <div className="flex gap-2 items-center mb-1">
                  <ScoreBadge score={getMessageScore(message)} />
                  <SentimentBadge
                    sentiment={message.analysis?.questionSentiment}
                  />
                  <CreditsUsedBadge
                    creditsUsed={message.creditsUsed ?? 0}
                    llmModel={message.llmModel}
                  />
                  {message.apiActionCalls.length > 0 && (
                    <div className="badge badge-secondary badge-soft gap-1 px-2">
                      <TbPointer />
                      {message.apiActionCalls.length}
                    </div>
                  )}
                  {message.analysis?.resolved && (
                    <div className="tooltip" data-tip="Resolved">
                      <div className="badge badge-primary badge-soft gap-1 px-2">
                        <TbConfetti />
                      </div>
                    </div>
                  )}
                  {message.questionId && (
                    <div
                      className="tooltip tooltip-right"
                      data-tip="View details"
                    >
                      <Link
                        to={`/questions/${message.questionId}`}
                        className="btn btn-xs btn-square"
                      >
                        <TbMessage />
                      </Link>
                    </div>
                  )}
                </div>
                <AssistantMessage message={message} />
              </div>
            )}
          </div>
        ))}
      </div>
    </Page>
  );
}
