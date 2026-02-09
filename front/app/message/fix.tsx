import type { Route } from "./+types/fix";
import {
  TbAlertTriangle,
  TbCheck,
  TbEye,
  TbMessage,
  TbSettingsBolt,
} from "react-icons/tb";
import { Page } from "~/components/page";
import { prisma } from "@packages/common/prisma";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import {
  Link,
  redirect,
  useFetcher,
  type FetcherWithComponents,
} from "react-router";
import { createToken } from "@packages/common/jwt";
import { makeMeta } from "~/meta";
import { makeMessagePairs } from "./analyse";
import type { ApiAction } from "@packages/common/prisma";
import { QuestionAnswer } from "./message";
import { SettingsSection } from "~/components/settings-section";
import { useFetcherToast } from "~/components/use-fetcher-toast";
import { ComposerSection, useComposer } from "~/compose";

export async function loader({ params, request }: Route.LoaderArgs) {
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
      id: params.messageId,
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
    (pair) => pair.queryMessage?.id === params.messageId
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
    title: "Fix message - CrawlChat",
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const answer = formData.get("answer");

  if (intent === "summarise") {
    const token = createToken(user!.id);

    const response = await fetch(`${process.env.VITE_SERVER_URL}/fix-message`, {
      method: "POST",
      body: JSON.stringify({
        messageId: params.messageId,
        answer,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    const error = response.status !== 200 ? (data.error ?? data.message) : null;

    return Response.json({ content: data.content, title: data.title, error });
  }

  if (intent === "save") {
    const token = createToken(user!.id);

    const title = formData.get("title");
    const content = formData.get("content");

    if (!title || !content) {
      return Response.json({ error: "Title and content are required" });
    }

    const message = await prisma.message.findUnique({
      where: {
        id: params.messageId,
      },
    });

    if (!message) {
      throw redirect("/app");
    }

    const markdown = `Updated on ${new Date().toLocaleDateString()}:
## ${title}

${content}`;

    const response = await fetch(
      `${process.env.VITE_SERVER_URL}/resource/${message.scrapeId}`,
      {
        method: "POST",
        body: JSON.stringify({
          title,
          markdown,
          defaultGroupTitle: "Answer corrections",
          knowledgeGroupType: "answer_corrections",
          createItem: true,
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status !== 200) {
      const data = await response.json();
      return Response.json({ error: data.error ?? data.message });
    }

    const data = await response.json();
    const createdScrapeItem = await prisma.scrapeItem.findUnique({
      where: {
        id: data.scrapeItemId,
      },
    });

    await prisma.message.update({
      where: {
        id: params.messageId,
      },
      data: {
        correctionItemId: createdScrapeItem?.id,
      },
    });

    return {
      scrapeItem: createdScrapeItem,
    };
  }
}

function FixComposer({
  scrapeId,
  saveFetcher,
}: {
  scrapeId: string;
  saveFetcher: FetcherWithComponents<any>;
}) {
  const composer = useComposer({
    scrapeId,
    intent: "compose",
    action: "/tool/compose",
    storageKeyPrefix: "compose-state",
    stateLess: true,
    init: {
      format: "markdown",
      formatText: `Create a markdown page as a correction for the answer provided by AI.
      Keep things short and concise.
      Use basic markdown formatting.
      First message is a fact.`,
    },
  });

  useFetcherToast(saveFetcher, {
    title: "Saved",
  });

  const missingDetails =
    !composer.state.title?.trim() || !composer.state.slate.trim();

  return (
    <ComposerSection
      composer={composer}
      right={
        <saveFetcher.Form method="post">
          <input type="hidden" name="intent" value="save" />
          <input
            type="hidden"
            name="title"
            value={composer.state.title ?? ""}
          />
          <input type="hidden" name="content" value={composer.state.slate} />

          <div
            className="tooltip tooltip-left"
            data-tip={missingDetails ? "Title and content are required" : ""}
          >
            <button
              className="btn btn-primary"
              type="submit"
              disabled={saveFetcher.state !== "idle" || missingDetails}
            >
              {saveFetcher.state !== "idle" && (
                <span className="loading loading-spinner loading-xs" />
              )}
              Save it
              <TbCheck />
            </button>
          </div>
        </saveFetcher.Form>
      }
    />
  );
}

export default function FixMessage({ loaderData }: Route.ComponentProps) {
  const saveFetcher = useFetcher();

  return (
    <Page title="Fix message" icon={<TbSettingsBolt />}>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-col gap-4 max-w-prose flex-2">
          {loaderData.messagePair?.queryMessage?.correctionItemId && (
            <div role="alert" className="alert alert-warning">
              <TbAlertTriangle size={20} />
              <span>
                This message is already corrected{" "}
                <Link
                  className="link link-underline"
                  to={`/knowledge/item/${loaderData.messagePair?.queryMessage?.correctionItemId}`}
                >
                  here
                </Link>
              </span>
            </div>
          )}

          {saveFetcher.data?.scrapeItem ? (
            <SettingsSection
              title="Correct the answer"
              actionRight={
                <div className="flex flex-col md:flex-row gap-2 items-center">
                  <p className="text-xs text-base-content/50 mr-4">
                    It takes a few seconds for the page to be indexed and
                    available for testing.
                  </p>
                  <Link
                    to={`/knowledge/item/${saveFetcher.data.scrapeItem.id}`}
                    className="btn"
                  >
                    View the page
                    <TbEye />
                  </Link>
                  <Link
                    to={`/w/${
                      loaderData.scrape.slug ?? loaderData.scrape.id
                    }?q=${
                      loaderData.messagePair?.queryMessage?.llmMessage?.content
                    }`}
                    target="_blank"
                    className="btn btn-primary"
                  >
                    Test it
                    <TbMessage />
                  </Link>
                </div>
              }
              description="Saved the answer to the knowledge base!"
            />
          ) : (
            <FixComposer
              scrapeId={loaderData.scrape.id}
              saveFetcher={saveFetcher}
            />
          )}
        </div>

        <div className="flex flex-col gap-4 flex-1">
          {loaderData.messagePair && (
            <QuestionAnswer
              messagePair={loaderData.messagePair}
              actionsMap={loaderData.actionsMap}
              showResources={false}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
