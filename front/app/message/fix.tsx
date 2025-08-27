import type { Route } from "./+types/fix";
import type { ScrapeItem } from "@prisma/client";
import {
  TbAlertTriangle,
  TbArrowRight,
  TbCheck,
  TbSettingsBolt,
} from "react-icons/tb";
import { Page } from "~/components/page";
import { prisma } from "~/prisma";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { Link, redirect, useFetcher } from "react-router";
import { createToken } from "libs/jwt";
import { useEffect } from "react";
import toast from "react-hot-toast";

export async function loader({ params, request }: Route.LoaderArgs) {
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

  const message = await prisma.message.findUnique({
    where: {
      id: params.messageId,
    },
  });

  if (!message) {
    throw redirect("/app");
  }

  return {
    scrape,
    message,
  };
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

    const error = response.status !== 200 ? data.error ?? data.message : null;

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

    const { scrapeItem } = (await response.json()) as {
      scrapeItem: ScrapeItem;
    };

    await prisma.message.update({
      where: {
        id: params.messageId,
      },
      data: {
        correctionItemId: scrapeItem.id,
      },
    });

    throw redirect(`/knowledge/item/${scrapeItem.id}`);
  }
}

export default function FixMessage({ loaderData }: Route.ComponentProps) {
  const summarizeFetcher = useFetcher();
  const saveFetcher = useFetcher();

  useEffect(() => {
    if (summarizeFetcher.data?.error) {
      toast.error(summarizeFetcher.data.error);
    }
  }, [summarizeFetcher.data]);

  useEffect(() => {
    if (saveFetcher.data?.error) {
      toast.error(saveFetcher.data.error);
    }
  }, [saveFetcher.data]);

  return (
    <Page title="Fix message" icon={<TbSettingsBolt />}>
      <div className="flex flex-col gap-4">
        <div className="text-base-content/50">
          You can attach your answer below and the AI will summarise the fix. It
          finally adds it to the knowledge base so that this will be considered
          for further answers. Uses 1 message credit and 1 scrape credit.
        </div>

        {loaderData.message.correctionItemId && (
          <div role="alert" className="alert alert-warning">
            <TbAlertTriangle />
            <span>
              This message is already corrected{" "}
              <Link
                className="link link-primary link-hover"
                to={`/knowledge/item/${loaderData.message.correctionItemId}`}
              >
                here
              </Link>
            </span>
          </div>
        )}

        {summarizeFetcher.data?.title && summarizeFetcher.data?.content ? (
          <saveFetcher.Form method="post">
            <div className="flex flex-col gap-2">
              <input type="hidden" name="intent" value={"save"} />

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Title</legend>
                <input
                  type="text"
                  placeholder="Ex: Price details"
                  className="input w-full"
                  name="title"
                  defaultValue={summarizeFetcher.data.title}
                  disabled={saveFetcher.state !== "idle"}
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Answer</legend>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Answer to add as knowledge"
                  rows={4}
                  name="content"
                  defaultValue={summarizeFetcher.data.content}
                  disabled={saveFetcher.state !== "idle"}
                />
              </fieldset>
              <div className="flex items-center justify-end w-full">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saveFetcher.state !== "idle"}
                >
                  {saveFetcher.state !== "idle" && (
                    <span className="loading loading-spinner loading-sm" />
                  )}
                  Save
                  <TbCheck />
                </button>
              </div>
            </div>
          </saveFetcher.Form>
        ) : (
          <summarizeFetcher.Form method="post">
            <div className="flex flex-col gap-2">
              <input type="hidden" name="intent" value={"summarise"} />
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Enter the correct answer/fix here"
                rows={4}
                name="answer"
                disabled={saveFetcher.state !== "idle"}
              />
              <div className="flex items-center justify-end w-full">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={summarizeFetcher.state !== "idle"}
                >
                  {summarizeFetcher.state !== "idle" && (
                    <span className="loading loading-spinner loading-sm" />
                  )}
                  Summarise
                  <TbArrowRight />
                </button>
              </div>
            </div>
          </summarizeFetcher.Form>
        )}
      </div>
    </Page>
  );
}
