import type { Route } from "./+types/conversations";
import type { Prisma } from "libs/prisma";
import { Page } from "~/components/page";
import {
  TbChevronLeft,
  TbChevronRight,
  TbMessage,
  TbMessages,
  TbTicket,
  TbTrash,
} from "react-icons/tb";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { prisma } from "~/prisma";
import { useEffect, useState } from "react";
import { getMessagesScore } from "~/score";
import { Link, redirect, useFetcher } from "react-router";
import { ViewSwitch } from "./view-switch";
import { CountryFlag } from "./country-flag";
import { ChatBoxProvider } from "~/widget/use-chat-box";
import { EmptyState } from "~/components/empty-state";
import moment from "moment";
import ChatBox, { ChatboxContainer } from "~/widget/chat-box";
import cn from "@meltdownjs/cn";
import { makeMeta } from "~/meta";

type ThreadWithMessages = Prisma.ThreadGetPayload<{
  include: {
    messages: true;
  };
}>;

export async function loader({ request }: Route.LoaderArgs) {
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

  const ONE_WEEK_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 10;
  const id = searchParams.get("id");

  const where: Prisma.ThreadWhereInput = {
    scrapeId,
    lastMessageAt: {
      gte: ONE_WEEK_AGO,
    },
    OR: [
      {
        isDefault: false,
      },
      {
        isDefault: {
          isSet: false,
        },
      },
    ],
  };

  if (id) {
    where.id = id;
  }

  const totalThreads = await prisma.thread.count({
    where,
  });

  const totalPages = Math.ceil(totalThreads / pageSize);

  const threads = await prisma.thread.findMany({
    where,
    include: {
      messages: true,
    },
    orderBy: {
      lastMessageAt: "desc",
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    threads,
    scrape,
    totalThreads,
    totalPages,
    page,
    from: (page - 1) * pageSize + 1,
    to: (page - 1) * pageSize + pageSize,
  };
}

export function meta() {
  return makeMeta({
    title: "Conversations - CrawlChat",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const id = formData.get("id") as string;
    await prisma.thread.delete({
      where: { id },
    });

    return { success: true };
  }

  return null;
}

export default function Conversations({ loaderData }: Route.ComponentProps) {
  const [selectedThread, setSelectedThread] = useState<
    ThreadWithMessages | undefined
  >(loaderData.threads[0]);
  const deleteFetcher = useFetcher();

  useEffect(() => {
    if (loaderData.threads) {
      setSelectedThread(loaderData.threads[0]);
    }
  }, [loaderData.threads]);

  return (
    <Page title="Conversations" icon={<TbMessages />} right={<ViewSwitch />}>
      {loaderData.threads.length === 0 && (
        <div className="flex h-full w-full items-center justify-center">
          <EmptyState
            icon={<TbMessages />}
            title="No conversations found"
            description="Integrate the collection on your website to start making conversations"
          />
        </div>
      )}

      {loaderData.threads.length > 0 && (
        <div className="flex h-full gap-4">
          <div
            className={cn(
              "flex flex-col w-full gap-4",
              "h-full overflow-y-auto flex-1"
            )}
          >
            <div className="text-base-content/50">
              Here are the conversations made by your customers or community on
              your website
            </div>

            <div className="flex gap-2 items-center">
              <Link
                className="btn btn-square"
                to={
                  loaderData.page > 1
                    ? `/messages/conversations?page=${loaderData.page - 1}`
                    : "#"
                }
              >
                <TbChevronLeft />
              </Link>

              <div className="flex items-center flex-1 justify-center gap-4 text-sm">
                <span>
                  {loaderData.from} - {loaderData.to}
                </span>
                <span>
                  [{loaderData.page} / {loaderData.totalPages}]
                </span>
              </div>

              <Link
                className="btn btn-square"
                to={
                  loaderData.page < loaderData.totalPages
                    ? `/messages/conversations?page=${loaderData.page + 1}`
                    : "#"
                }
              >
                <TbChevronRight />
              </Link>
            </div>

            <div
              className={cn(
                "bg-base-200 p-2 rounded-box border border-base-300",
                "shadow-sm"
              )}
            >
              <div
                className={cn(
                  "rounded-box overflow-hidden border",
                  "border-base-300",
                  "bg-base-100 shadow"
                )}
              >
                {loaderData.threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={cn(
                      "flex flex-col gap-1 px-4 py-2",
                      "border-b border-base-300",
                      "cursor-pointer last:border-0",
                      "hover:bg-base-200",
                      selectedThread?.id === thread.id && "bg-base-200"
                    )}
                    onClick={() => setSelectedThread(thread)}
                  >
                    <div className="flex gap-2 items-center justify-between">
                      <div className="flex gap-2 items-center">
                        {thread.location?.country && (
                          <CountryFlag location={thread.location} />
                        )}
                        <span className="text-base-content/80 line-clamp-1">
                          {thread.messages[0]?.llmMessage
                            ? (thread.messages[0]?.llmMessage as any).content
                            : thread.id.substring(thread.id.length - 4)}
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        {thread.ticketStatus && (
                          <div
                            className="tooltip tooltip-left"
                            data-tip="Ticket created"
                          >
                            <span className="badge badge-primary px-1">
                              <TbTicket />
                            </span>
                          </div>
                        )}
                        <div
                          className="tooltip tooltip-left"
                          data-tip="Avg score"
                        >
                          <span className="badge badge-primary badge-soft">
                            {getMessagesScore(thread.messages).toFixed(2)}
                          </span>
                        </div>
                        <div
                          className="tooltip tooltip-left"
                          data-tip="Number of messages"
                        >
                          <span className="badge badge-primary badge-soft">
                            <TbMessage />
                            {thread.messages.length}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-base-content/50 text-sm">
                      {moment(thread.createdAt).fromNow()}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {thread.customTags &&
                        Object.keys(thread.customTags).map((key) => (
                          <div key={key}>
                            <span className="badge badge-primary px-1">
                              {key}:{" "}
                              {(thread.customTags as Record<string, any>)[key]}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-[600px] relative">
            {selectedThread && (
              <ChatBoxProvider
                key={selectedThread.id}
                scrape={loaderData.scrape!}
                thread={selectedThread}
                messages={selectedThread.messages}
                embed={false}
                admin={true}
                token={null}
                readonly={true}
              >
                <ChatboxContainer>
                  <ChatBox />
                </ChatboxContainer>
              </ChatBoxProvider>
            )}

            <div className="absolute top-0 right-0">
              <deleteFetcher.Form method="post">
                <input type="hidden" name="id" value={selectedThread?.id} />
                <input type="hidden" name="intent" value="delete" />
                <div
                  className="tooltip tooltip-left"
                  data-tip="Delete the conversation"
                >
                  <button className="btn btn-error btn-square" type="submit">
                    {deleteFetcher.state === "submitting" ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <TbTrash />
                    )}
                  </button>
                </div>
              </deleteFetcher.Form>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
