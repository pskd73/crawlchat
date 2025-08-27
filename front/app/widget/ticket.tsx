import type {
  Prisma,
  Scrape,
  ScrapeUser,
  Thread,
  TicketAuthorRole,
} from "libs/prisma";
import type { Route } from "./+types/ticket";
import {
  TbAlertCircle,
  TbArrowRight,
  TbCheck,
  TbCopy,
  TbMessage,
  TbUser,
} from "react-icons/tb";
import { prisma } from "libs/prisma";
import { RiChatVoiceAiFill } from "react-icons/ri";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { MarkdownProse } from "./markdown-prose";
import { sendReactEmail } from "~/email";
import toast, { Toaster } from "react-hot-toast";
import cn from "@meltdownjs/cn";
import moment from "moment";
import TicketUserMessageEmail from "emails/ticket-user-message";
import TicketAdminMessageEmail from "emails/ticket-admin-message";

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
  return [
    {
      title: data.thread?.title ?? "CrawlChat",
    },
  ];
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
      thread.title &&
      (thread.scrape.user.settings?.ticketEmailUpdates ?? true)
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
        />
      );
    }

    return { message };
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

function Message({
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
        "bg-base-200/50",
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
          {moment(message.createdAt).fromNow()}
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
  const [resolve, setResolve] = useState(false);
  const commentSubmitRef = useRef<HTMLButtonElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

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
    if (resolve && commentSubmitRef.current) {
      commentSubmitRef.current.click();
    }
  }, [resolve]);

  useEffect(() => {
    if (commentRef.current) {
      commentRef.current.value = "";
      setResolve(false);
    }
  }, [commentFetcher.data]);

  function handleResolve() {
    setResolve(true);
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
    <div className="flex flex-col gap-2 items-center bg-base-100 min-h-screen">
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
                Opened {moment(openedAt).fromNow()}
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
                    {moment(loaderData.thread.ticketClosedAt).fromNow()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {loaderData.thread.ticketStatus !== "closed" && (
          <commentFetcher.Form method="post">
            <div className="flex flex-col gap-2">
              <input type="hidden" name="intent" value={"comment"} />
              <input type="hidden" name="resolve" value={resolve.toString()} />
              <input
                type="hidden"
                name="key"
                value={loaderData.passedKey ?? ""}
              />
              <div className="font-medium">Add a message</div>
              <textarea
                className="textarea textarea-bordered w-full"
                ref={commentRef}
                name="content"
                placeholder="Type your message here..."
                rows={3}
                required
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  className="btn"
                  onClick={handleResolve}
                  disabled={commentFetcher.state !== "idle"}
                >
                  {commentFetcher.state !== "idle" && resolve && (
                    <span className="loading loading-spinner loading-xs" />
                  )}
                  Resolve & Close
                  <TbCheck />
                </button>
                <button
                  className="btn btn-primary"
                  ref={commentSubmitRef}
                  type="submit"
                  disabled={commentFetcher.state !== "idle"}
                >
                  {commentFetcher.state !== "idle" && !resolve && (
                    <span className="loading loading-spinner loading-xs" />
                  )}
                  Comment
                  <TbMessage />
                </button>
              </div>
            </div>
          </commentFetcher.Form>
        )}
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}
