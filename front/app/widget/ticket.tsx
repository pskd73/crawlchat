import cn from "@meltdownjs/cn";
import type {
  Prisma,
  Scrape,
  ScrapeUser,
  Thread,
  TicketAuthorRole,
} from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import TicketAdminMessageEmail from "emails/ticket-admin-message";
import TicketUserMessageEmail from "emails/ticket-user-message";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { RiChatVoiceAiFill } from "react-icons/ri";
import {
  TbAlertCircle,
  TbArrowRight,
  TbCheck,
  TbCopy,
  TbMessage,
  TbUser,
} from "react-icons/tb";
import { useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { Timestamp } from "~/components/timestamp";
import { sendReactEmail } from "~/email";
import { makeMeta, NO_INDEX_HTTP_HEADERS } from "~/meta";
import type { Route } from "./+types/ticket";
import { MarkdownProse } from "./markdown-prose";

function getRole(thread?: Thread | null, scrapeUsers?: ScrapeUser[] | null) {
  const role: "agent" | "user" =
    thread &&
    scrapeUsers &&
    scrapeUsers.find((su) => thread && su.scrapeId === thread.scrapeId)
      ? "agent"
      : "user";
  return role;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  let key = url.searchParams.get("key");
  let ticketNumber = parseInt(params.number);

  let thread = await prisma.thread.findFirst({
    where: {
      ticketNumber,
    },
    include: {
      messages: true,
      scrape: true,
    },
  });

  const loggedInUser = await getAuthUser(request, { dontRedirect: true });
  const role = getRole(thread, loggedInUser?.scrapeUsers);
  if (role === "agent" && thread) {
    key = thread.ticketKey;
  }
  if (key !== thread?.ticketKey) {
    thread = null;
  }

  return { thread, passedKey: key, ticketNumber, role };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: data.thread?.title ?? "CrawlChat",
    noIndex: true,
  });
}

export function headers() {
  return NO_INDEX_HTTP_HEADERS;
}

export async function action({ params, request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const key = formData.get("key") as string;

  const thread = await prisma.thread.findFirst({
    where: {
      ticketNumber: parseInt(params.number),
      ticketKey: key,
    },
    include: {
      scrape: {
        include: {
          user: true,
          scrapeUsers: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }

  const loggedInUser = await getAuthUser(request, { dontRedirect: true });

  if (intent === "comment") {
    const content = formData.get("content") as string;
    const role = getRole(thread, loggedInUser?.scrapeUsers);
    const resolve = formData.get("resolve") === "true";

    const message = await prisma.message.create({
      data: {
        ownerUserId: thread.scrape.userId,
        threadId: thread.id,
        scrapeId: thread.scrape.id,
        llmMessage: {
          role: "user",
          content,
        },
        ticketMessage: {
          role,
          event: "message",
        },
      },
    });

    const threadUpdate: Prisma.ThreadUpdateInput = {
      lastMessageAt: new Date(),
    };

    if (resolve) {
      threadUpdate.ticketStatus = "closed";
      threadUpdate.ticketClosedAt = new Date();
    }

    await prisma.thread.update({
      where: { id: thread.id },
      data: threadUpdate,
    });

    if (
      role === "agent" &&
      thread.ticketUserEmail &&
      thread.ticketNumber !== null &&
      thread.ticketNumber !== undefined &&
      thread.ticketKey &&
      thread.title
    ) {
      let subjectPrefix = resolve ? "Ticket resolved" : "New message on ticket";
      await sendReactEmail(
        thread.ticketUserEmail,
        `${subjectPrefix} (#${thread.ticketNumber})`,
        <TicketUserMessageEmail
          scrapeTitle={thread.scrape.title ?? "CrawlChat"}
          ticketNumber={thread.ticketNumber}
          ticketKey={thread.ticketKey}
          title={thread.title}
          message={content}
        />
      );
    }

    if (
      role === "user" &&
      thread.ticketUserEmail &&
      thread.ticketNumber !== null &&
      thread.ticketNumber !== undefined &&
      thread.ticketKey &&
      thread.title
    ) {
      for (const scrapeUser of thread.scrape.scrapeUsers) {
        if (
          scrapeUser.user &&
          (scrapeUser.user.settings?.ticketEmailUpdates ?? true)
        ) {
          await sendReactEmail(
            thread.scrape.user.email,
            `New message on ticket (#${thread.ticketNumber})`,
            <TicketAdminMessageEmail
              scrapeTitle={thread.scrape.title ?? "CrawlChat"}
              ticketNumber={thread.ticketNumber}
              title={thread.title}
              message={content}
              email={thread.ticketUserEmail}
              customTags={
                thread.customTags as Record<
                  string,
                  string | boolean | number
                > | null
              }
            />
          );
        }
      }
    }

    return { message };
  }

  if (intent === "close") {
    await prisma.thread.update({
      where: { id: thread.id },
      data: { ticketStatus: "closed" },
    });

    return { success: true };
  }
}

function Nav({ scrape }: { scrape: Scrape }) {
  return (
    <nav className="flex items-center pt-4 gap-2 justify-between">
      <div className="flex items-center gap-2">
        {scrape.logoUrl && (
          <img
            className="max-h-[18px]"
            src={scrape.logoUrl}
            alt={scrape.title ?? ""}
          />
        )}
        <div className="text-lg font-medium">{scrape.title}</div>
      </div>
      <div className="text-sm text-base-content/50 flex items-center gap-2">
        Powered by{" "}
        <a
          className="link link-hover link-primary flex items-center gap-1"
          href="https://crawlchat.app"
        >
          <RiChatVoiceAiFill />
          CrawlChat
        </a>
      </div>
    </nav>
  );
}

type TicketMessage = {
  id: string;
  role: TicketAuthorRole;
  content: string;
  createdAt: Date;
};

export function Message({
  scrape,
  message,
  role,
}: {
  scrape: Scrape;
  message: TicketMessage;
  role: "agent" | "user";
}) {
  const youTag = role === "user" ? "You" : "User";
  const shouldHighlight =
    role === "agent" ? message.role === "user" : message.role === "agent";

  return (
    <div
      className={cn(
        "flex flex-col gap-0 border border-base-300 rounded-box overflow-hidden",
        "bg-base-100",
        shouldHighlight && "border-primary border-2"
      )}
    >
      <div className="flex items-center gap-2 p-2 px-4 border-b border-base-300">
        {message.role === "agent" && (
          <img
            className="max-h-[18px]"
            src={scrape.logoUrl ?? "/logo.png"}
            alt={scrape.title ?? ""}
          />
        )}
        {message.role === "user" && <TbUser />}
        <div className="font-medium">
          {message.role === "user" ? youTag : scrape.title}
        </div>
        <div className="text-sm text-base-content/50">
          <Timestamp date={message.createdAt} />
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <MarkdownProse>{message.content}</MarkdownProse>
      </div>
    </div>
  );
}

export default function Ticket({ loaderData }: Route.ComponentProps) {
  const commentFetcher = useFetcher();
  const closeFetcher = useFetcher();
  const resolveFetcher = useFetcher();
  const [comment, setComment] = useState("");

  const ticketMessages = useMemo<TicketMessage[]>(() => {
    if (!loaderData.thread) return [];
    return loaderData.thread.messages
      .filter((message) => message.ticketMessage)
      .map((message) => ({
        id: message.id,
        role: message.ticketMessage!.role,
        content: (message.llmMessage as any).content,
        createdAt: message.createdAt,
      }));
  }, [loaderData.thread]);

  const openedAt = useMemo(() => {
    if (ticketMessages.length === 0) return null;
    return ticketMessages[0].createdAt;
  }, [ticketMessages]);

  useEffect(() => {
    if (commentFetcher.data) {
      setComment("");
    }
  }, [commentFetcher.data]);

  function handleResolve() {
    resolveFetcher.submit(
      {
        intent: "comment",
        resolve: "true",
        content: comment,
        key: loaderData.passedKey,
      },
      { method: "post" }
    );
  }

  function handleComment() {
    commentFetcher.submit(
      { intent: "comment", content: comment, key: loaderData.passedKey },
      { method: "post" }
    );
  }

  function handleClose() {
    closeFetcher.submit(
      { intent: "close", key: loaderData.passedKey },
      { method: "post" }
    );
  }

  function copyToClipboard(value: string) {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  }

  if (!loaderData.thread) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full gap-4">
        <TbAlertCircle size={48} />
        <div className="text-lg font-medium">Ticket not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-center bg-base-200 min-h-screen">
      <div className="flex flex-col gap-8 p-4 max-w-3xl w-full">
        <Nav scrape={loaderData.thread.scrape} />
        {loaderData.thread.title && (
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">
              <span className="text-base-content/20">
                #{loaderData.thread.ticketNumber}
              </span>{" "}
              {loaderData.thread.title}
            </h1>

            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div
                className={cn(
                  "badge badge-soft",
                  loaderData.thread.ticketStatus === "open"
                    ? "badge-success"
                    : undefined
                )}
              >
                {loaderData.thread.ticketStatus!.toUpperCase()}
              </div>
              <div className="text-sm text-base-content/80">
                Opened <Timestamp date={openedAt!} />
              </div>
              {loaderData.role === "agent" && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-base-content/80">
                    {loaderData.thread.ticketUserEmail}
                  </div>
                  <button
                    className="btn btn-square btn-xs"
                    onClick={() =>
                      copyToClipboard(loaderData.thread!.ticketUserEmail ?? "")
                    }
                  >
                    <TbCopy />
                  </button>
                </div>
              )}
            </div>

            {loaderData.role === "agent" &&
              loaderData.thread.customTags &&
              Object.keys(loaderData.thread.customTags).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.keys(loaderData.thread.customTags).map((key) => (
                    <div key={key} className="tooltip" data-tip={key}>
                      <div className="badge badge-soft">
                        {
                          loaderData.thread!.customTags![
                            key as keyof typeof loaderData.thread.customTags
                          ]
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
        <div className="flex flex-col gap-4">
          {ticketMessages.map((message, idx) => (
            <Message
              key={message.id}
              message={message}
              scrape={loaderData.thread!.scrape}
              role={loaderData.role}
            />
          ))}
          {loaderData.thread.ticketStatus === "closed" && (
            <div className="flex flex-col gap-4">
              {loaderData.thread.scrape.resolveYesConfig && (
                <div className="flex flex-col gap-2 border border-base-300 rounded-box p-4">
                  <span className="font-medium">
                    {loaderData.thread.scrape.resolveYesConfig.title}
                  </span>
                  <span>
                    {loaderData.thread.scrape.resolveYesConfig.description}
                  </span>
                  <div>
                    <a
                      className="btn btn-primary"
                      href={loaderData.thread.scrape.resolveYesConfig.link}
                      target="_blank"
                    >
                      {loaderData.thread.scrape.resolveYesConfig.btnLabel}
                      <TbArrowRight />
                    </a>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 opacity-50">
                <TbCheck />
                <div className="text-sm text-base-content/50">
                  This ticket has been resolved and closed{" "}
                  <span className="font-medium">
                    <Timestamp date={loaderData.thread.ticketClosedAt!} />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {loaderData.thread.ticketStatus !== "closed" && (
          <div className="flex flex-col gap-2">
            <div className="font-medium">Add a message</div>
            <textarea
              className="textarea textarea-bordered w-full"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Type your message here..."
              rows={3}
            />
            <div className="flex items-center gap-2 justify-end">
              {loaderData.role === "agent" && (
                <div
                  className="tooltip"
                  data-tip="No email notifications will be sent"
                >
                  <button
                    className="btn"
                    type="submit"
                    disabled={closeFetcher.state !== "idle"}
                    onClick={handleClose}
                  >
                    {closeFetcher.state !== "idle" && (
                      <span className="loading loading-spinner loading-xs" />
                    )}
                    Close
                  </button>
                </div>
              )}
              <button
                className="btn"
                onClick={handleResolve}
                type="button"
                disabled={!comment || resolveFetcher.state !== "idle"}
              >
                {resolveFetcher.state !== "idle" && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                Resolve
                <TbCheck />
              </button>
              <button
                className="btn btn-primary"
                disabled={!comment || commentFetcher.state !== "idle"}
                onClick={handleComment}
              >
                {commentFetcher.state !== "idle" && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                Comment
                <TbMessage />
              </button>
            </div>
          </div>
        )}
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}
