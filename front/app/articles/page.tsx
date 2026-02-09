import { TbBook2, TbCheck, TbTrash } from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { Page } from "~/components/page";
import { prisma } from "@packages/common/prisma";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import type { Route } from "./+types/page";
import { ComposerSection, useComposer } from "~/compose";
import { useFetcher } from "react-router";
import { redirect } from "react-router";
import { makeMeta } from "~/meta";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const article = await prisma.article.findFirstOrThrow({
    where: {
      id: params.id,
      scrapeId,
    },
  });

  return { article };
}

export function meta() {
  return makeMeta({
    title: "Article - CrawlChat",
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save") {
    const content = formData.get("content") as string;
    const title = formData.get("title") as string;

    await prisma.article.update({
      where: {
        id: params.id,
      },
      data: {
        title: title || undefined,
        content: content,
      },
    });

    throw redirect(`/article/${params.id}`);
  }

  if (intent === "delete") {
    await prisma.article.delete({
      where: {
        id: params.id,
      },
    });

    throw redirect(`/articles`);
  }
}

export default function Article({ loaderData }: Route.ComponentProps) {
  const composer = useComposer({
    scrapeId: loaderData.article.scrapeId,
    intent: "compose",
    action: "/tool/compose",
    storageKeyPrefix: "compose-state",
    init: {
      format: "markdown",
      state: {
        slate: loaderData.article.content,
        messages: [],
        title: loaderData.article.title ?? undefined,
      },
    },
    stateLess: true,
  });

  const saveFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  return (
    <Page
      title={loaderData.article.title || "Article"}
      icon={<TbBook2 />}
      right={
        <div className="flex gap-2 items-center">
          <deleteFetcher.Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <div className="tooltip tooltip-left" data-tip="Delete article">
              <button
                className="btn btn-error btn-soft btn-square"
                type="submit"
                disabled={deleteFetcher.state !== "idle"}
              >
                {deleteFetcher.state === "submitting" ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <TbTrash />
                )}
              </button>
            </div>
          </deleteFetcher.Form>
          <saveFetcher.Form method="post">
            <input type="hidden" name="intent" value="save" />
            <input type="hidden" name="content" value={composer.state.slate} />
            <input
              type="hidden"
              name="title"
              value={composer.state.title ?? ""}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saveFetcher.state !== "idle"}
            >
              {saveFetcher.state !== "idle" && (
                <span className="loading loading-spinner loading-xs" />
              )}
              Save
              <TbCheck />
            </button>
          </saveFetcher.Form>
        </div>
      }
    >
      <ComposerSection composer={composer} />
    </Page>
  );
}
