import type { Route } from "./+types/page";
import type { Message } from "libs/prisma";
import {
  TbChartBarOff,
  TbCheck,
  TbCopy,
  TbMessage,
  TbTrash,
} from "react-icons/tb";
import { Page } from "~/components/page";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { prisma } from "~/prisma";
import { MarkdownProse } from "~/widget/markdown-prose";
import { Link, useFetcher } from "react-router";
import { fetchDataGaps } from "./fetch";
import { EmptyState } from "~/components/empty-state";
import moment from "moment";
import cn from "@meltdownjs/cn";
import toast from "react-hot-toast";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const messages = await fetchDataGaps(scrapeId);

  return { messages };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "done") {
    const messageId = formData.get("messageId") as string;
    await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        analysis: {
          upsert: {
            set: {
              dataGapDone: true,
            },
            update: {
              dataGapDone: true,
            },
          },
        },
      },
    });

    return { success: true };
  }

  if (intent === "delete") {
    const messageId = formData.get("messageId") as string;
    await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        analysis: {
          upsert: {
            set: {
              dataGapTitle: null,
              dataGapDescription: null,
            },
            update: {
              dataGapTitle: null,
              dataGapDescription: null,
            },
          },
        },
      },
    });

    return { success: true };
  }
}

export function DataGapCard({
  message,
  noControls,
}: {
  message: Message;
  noControls?: boolean;
}) {
  const doneFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      `# ${message.analysis!.dataGapTitle}\n\n${
        message.analysis!.dataGapDescription
      }`
    );
    toast.success("Copied to clipboard");
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 border border-base-300",
        "p-4 rounded-box bg-base-200/50 shadow"
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="font-bold">{message.analysis!.dataGapTitle}</div>
        <div className="flex gap-2">
          <div className="join">
            <Link
              className="btn btn-sm btn-square join-item"
              to={`/messages/${message.questionId}`}
            >
              <TbMessage />
            </Link>

            <button
              className="btn btn-square btn-sm join-item"
              onClick={handleCopy}
            >
              <TbCopy />
            </button>
          </div>

          {!noControls && (
            <div className="join">
              <doneFetcher.Form method="post">
                <input type="hidden" name="messageId" value={message.id} />
                <input type="hidden" name="intent" value="done" />
                <button
                  className="btn btn-sm btn-success join-item"
                  type="submit"
                  disabled={doneFetcher.state !== "idle"}
                >
                  <TbCheck />
                  Done
                </button>
              </doneFetcher.Form>
              <deleteFetcher.Form method="post">
                <input type="hidden" name="messageId" value={message.id} />
                <input type="hidden" name="intent" value="delete" />
                <button
                  className="btn btn-sm btn-error join-item"
                  disabled={deleteFetcher.state !== "idle"}
                  type="submit"
                >
                  <TbTrash />
                  Delete
                </button>
              </deleteFetcher.Form>
            </div>
          )}
        </div>
      </div>
      <MarkdownProse>{message.analysis!.dataGapDescription}</MarkdownProse>
      <div className="text-sm text-base-content/50">
        {moment(message.createdAt).fromNow()}
      </div>
    </div>
  );
}

export default function DataGapsPage({ loaderData }: Route.ComponentProps) {
  return (
    <Page title="Data gaps" icon={<TbChartBarOff />}>
      {loaderData.messages.length === 0 && (
        <div className="w-full h-full flex justify-center items-center">
          <EmptyState
            icon={<TbCheck />}
            title="No data gaps"
            description="You are sorted! There are no data gaps found in the last week. If you have not yet integrated the chatbot, integrate it now so it finds the data gaps automatically."
          />
        </div>
      )}
      {loaderData.messages.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="text-base-content/50">
            Following are the topics that are asked to the chat bot but no
            significant information is found in the knowledge base. It is worth
            to take a look at these topics and either add it your knowledge base
            (or the external documentation) or delete it if it is not
            appropriate or signification.
          </div>
          <div className="flex flex-col gap-4">
            {loaderData.messages.map((message) => (
              <DataGapCard key={message.id} message={message} />
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}
