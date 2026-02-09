import { TbBook2, TbCheck } from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { Page } from "~/components/page";
import { prisma } from "@packages/common/prisma";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import type { Route } from "./+types/make-guide";
import { ComposerSection, useComposer } from "~/compose";
import { getMessageContent } from "./messages";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { redirect } from "react-router";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId },
  });

  const thread = await prisma.thread.findFirstOrThrow({
    where: { id: params.conversationId, scrapeId },
    include: {
      messages: true,
    },
  });

  return { thread, scrape };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "publish") {
    const content = formData.get("content") as string;
    const title = formData.get("title") as string;

    await prisma.article.create({
      data: {
        userId: user!.id,
        scrapeId: scrapeId,
        purpose: "guide",
        title: title || undefined,
        content: content,
      },
    });

    throw redirect(`/questions/conversations`);
  }
}

export default function MakeGuide({ loaderData }: Route.ComponentProps) {
  const composer = useComposer({
    scrapeId: loaderData.scrape.id,
    intent: "compose",
    action: "/tool/compose",
    storageKeyPrefix: "compose-state",
    prompt: `You are a helpful guide writer.
      You are given a conversation and you need to write a guide based on the conversation.

      It should be plain steps as markdown list or nested lists. No headings, no subheadings.
      Each step should not be more than 2 sentences.
      Don't use headings at all. It should be just pure bullet points.

      <conversation>
        ${loaderData.thread.messages
          .map(
            (message) =>
              `${message.llmMessage?.role}: ${getMessageContent(message)}`
          )
          .join("\n")}
      </conversation>`,
    init: {
      format: "markdown",
      formatText: `
        1. Go to <https://www.google.com>
        2. Click on the search icon
        3. Type "How to make a guide"
        4. Click on the search button
      `,
    },
    stateLess: true,
  });

  const publishFetcher = useFetcher();

  useEffect(() => {
    setTimeout(() => {
      composer.askEdit("Make a guide");
    }, 100);
  }, []);

  return (
    <Page
      title="Make a guide"
      icon={<TbBook2 />}
      right={
        <publishFetcher.Form method="post">
          <input type="hidden" name="intent" value="publish" />
          <input type="hidden" name="content" value={composer.state.slate} />
          <input
            type="hidden"
            name="title"
            value={composer.state.title ?? ""}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={publishFetcher.state !== "idle"}
          >
            {publishFetcher.state !== "idle" && (
              <span className="loading loading-spinner loading-xs" />
            )}
            Publish
            <TbCheck />
          </button>
        </publishFetcher.Form>
      }
    >
      <ComposerSection composer={composer} />
    </Page>
  );
}
