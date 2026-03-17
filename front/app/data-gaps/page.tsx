import cn from "@meltdownjs/cn";
import type { Message } from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  TbBattery1,
  TbBattery2,
  TbBattery3,
  TbChartBarOff,
  TbCheck,
  TbChevronDown,
  TbChevronUp,
  TbCopy,
  TbMessage,
  TbX,
} from "react-icons/tb";
import { Link, useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { EmptyState } from "~/components/empty-state";
import { Page } from "~/components/page";
import { Timestamp } from "~/components/timestamp";
import { makeMeta } from "~/meta";
import type { Route } from "./+types/page";
import { fetchDataGaps } from "./fetch";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const messages = await fetchDataGaps(scrapeId);

  return { messages };
}

export function meta() {
  return makeMeta({
    title: "Data gaps - CrawlChat",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");
  const messageId = formData.get("messageId") as string;

  const message = await prisma.message.findFirstOrThrow({
    where: { id: messageId },
  });

  if (intent === "accept") {
    await prisma.message.update({
      where: { id: messageId },
      data: {
        dataGap: {
          ...message.dataGap!,
          status: "accepted",
        },
      },
    });

    return { success: true };
  }

  if (intent === "reject") {
    await prisma.message.update({
      where: { id: messageId },
      data: {
        dataGap: {
          ...message.dataGap!,
          status: "rejected",
        },
      },
    });

    return { success: true };
  }
}

export function DataGapCard({ message }: { message: Message }) {
  const acceptFetcher = useFetcher();
  const rejectFetcher = useFetcher();
  const [expanded, setExpanded] = useState(false);
  const maxScore = useMemo(
    () =>
      message.links.reduce(
        (max, source) => Math.max(max, source.score ?? 0),
        0
      ),
    [message.links]
  );
  const strength = useMemo(() => {
    if (maxScore < 0.3) return "Weak";
    if (maxScore <= 0.75) return "Moderate";
    return "Strong";
  }, [maxScore]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      `# ${message.dataGap!.title}\n\n${message.dataGap!.description ?? ""}`
    );
    toast.success("Copied to clipboard");
  };

  return (
    <div
      className={cn(
        "p-4 flex flex-col gap-2",
        "border-b border-base-300 last:border-b-0"
      )}
    >
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "flex flex-col md:flex-row md:items-center",
            "gap-2 md:justify-between"
          )}
        >
          <div className="flex flex-col gap-1">
            <div>{message.dataGap!.title}</div>
            <div className="flex items-center gap-2">
              <div
                className="tooltip tooltip-right"
                data-tip={`${strength} - ${maxScore.toFixed(2)}`}
              >
                <div
                  className={cn(
                    "badge badge-soft",
                    strength === "Weak" && "badge-warning",
                    strength === "Moderate" && "badge-info",
                    strength === "Strong" && "badge-primary"
                  )}
                >
                  {strength === "Weak" && <TbBattery1 />}
                  {strength === "Moderate" && <TbBattery2 />}
                  {strength === "Strong" && <TbBattery3 />}
                </div>
              </div>
              <Timestamp
                date={message.createdAt}
                className="text-base-content/50"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-col md:flex-row">
            <button
              className="btn btn-square"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? <TbChevronUp /> : <TbChevronDown />}
            </button>

            <div className="join">
              <Link
                className="btn btn-square join-item"
                to={`/questions/${message.questionId}`}
              >
                <TbMessage />
              </Link>

              <button className="btn btn-square join-item" onClick={handleCopy}>
                <TbCopy />
              </button>
            </div>

            <div className="join">
              <acceptFetcher.Form method="post">
                <input type="hidden" name="messageId" value={message.id} />
                <input type="hidden" name="intent" value="accept" />
                <button
                  className="btn btn-success btn-soft join-item"
                  type="submit"
                  disabled={acceptFetcher.state !== "idle"}
                >
                  <TbCheck />
                  Accept
                </button>
              </acceptFetcher.Form>
              <rejectFetcher.Form method="post">
                <input type="hidden" name="messageId" value={message.id} />
                <input type="hidden" name="intent" value="reject" />
                <div
                  className="tooltip tooltip-left"
                  data-tip="Reject it so that similar data gaps are not created again"
                >
                  <button
                    className="btn btn-error btn-soft join-item"
                    disabled={rejectFetcher.state !== "idle"}
                    type="submit"
                  >
                    <TbX />
                    Reject
                  </button>
                </div>
              </rejectFetcher.Form>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="text-base-content/60">
          {message.dataGap!.description}
        </div>
      )}
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
            These topics were asked but not found in the knowledge base. Review
            each one and either add it to your knowledge base or cancel it if
            it's not relevant.
          </div>
          <div className={cn("border border-base-300 rounded-box bg-base-100")}>
            {loaderData.messages.map((message) => (
              <DataGapCard key={message.id} message={message} />
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}
