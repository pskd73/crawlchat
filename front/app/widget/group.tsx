import type { Route } from "./+types/group";
import type { MessageSourceLink, Scrape } from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import { createToken } from "@packages/common/jwt";
import { useEffect, useMemo, useRef, useState } from "react";
import { TbArrowUp, TbShare, TbUser } from "react-icons/tb";
import { RiChatVoiceAiFill } from "react-icons/ri";
import { MarkdownProse } from "./markdown-prose";
import { useScrapeChat } from "./use-chat";
import cn from "@meltdownjs/cn";
import { makeMeta } from "~/meta";
import toast, { Toaster } from "react-hot-toast";
import Avatar from "boring-avatars";
import { extractCitations } from "@packages/common/citation";
import { Sources } from "./chat-box";

function isMongoObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export async function loader({ params }: Route.LoaderArgs) {
  const scrape = await prisma.scrape.findFirst({
    where: isMongoObjectId(params.id) ? { id: params.id } : { slug: params.id },
  });

  if (!scrape) {
    throw new Response("Collection not found", { status: 404 });
  }

  const thread = await prisma.thread.findFirst({
    where: { id: params.threadId },
    include: { messages: true },
  });

  if (!thread || thread.scrapeId !== scrape.id) {
    throw new Response("Thread not found", { status: 404 });
  }

  const userToken = createToken(params.threadId, {
    expiresInSeconds: 60 * 60 * 24,
  });

  return {
    scrape,
    thread,
    messages: thread.messages,
    userToken,
  };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: data.thread?.title ?? data.scrape?.title ?? "Group Chat",
  });
}

function Nav({ scrape }: { scrape: Scrape }) {
  return (
    <nav
      className={cn(
        "flex flex-col md:flex-row items-center py-4 gap-2 justify-between",
        "md:justify-between"
      )}
    >
      <div className="flex items-center gap-2">
        {scrape.logoUrl && (
          <img
            className="max-h-[24px]"
            src={scrape.logoUrl}
            alt={scrape.title ?? ""}
          />
        )}
        <div className="text-lg font-medium">{scrape.title}</div>
      </div>
      <div className="text-sm text-base-content/50 flex items-center gap-2">
        Grouped conversation
      </div>
    </nav>
  );
}

function UserMessage({
  content,
  fingerprint,
}: {
  content: string;
  fingerprint?: string;
}) {
  return (
    <div className="flex flex-col gap-0 border border-base-300 rounded-box overflow-hidden bg-base-100">
      <div className="flex items-center gap-2 p-2 px-4 border-b border-base-300">
        {fingerprint && (
          <Avatar
            name={fingerprint}
            size={20}
            variant="beam"
            className="shrink-0"
          />
        )}
        <div className="font-medium">
          User {fingerprint && `#${fingerprint.slice(0, 6)}`}
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}

function AssistantMessage({
  scrape,
  content,
  links,
}: {
  scrape: Scrape;
  content: string;
  links: MessageSourceLink[];
}) {
  const citation = useMemo(
    () => extractCitations(content, links),
    [content, links]
  );

  return (
    <div className="flex flex-col gap-0 rounded-box overflow-hidden bg-base-100 border-primary border-2">
      <div className="flex items-center gap-2 p-2 px-4 border-b border-base-300">
        <img
          className="max-h-[18px]"
          src={scrape.logoUrl ?? "/logo.png"}
          alt={scrape.title ?? ""}
        />
        <div className="font-medium">{scrape.title ?? "Assistant"}</div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <Sources citation={citation} />
        <MarkdownProse
          sources={Object.values(citation.citedLinks).map((link) => ({
            title: link?.title ?? link?.url ?? "Source",
            url: link?.url ?? undefined,
          }))}
        >
          {citation.content}
        </MarkdownProse>
      </div>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex flex-col gap-2 p-4 border border-base-300 rounded-box bg-base-100">
      <div className="skeleton h-[20px] w-full" />
      <div className="skeleton h-[20px] w-full" />
      <div className="skeleton h-[20px] w-[60%]" />
    </div>
  );
}

function ChatInput({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!inputRef.current) return;

    const adjustHeight = () => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = `${Math.max(28, inputRef.current.scrollHeight)}px`;
      }
    };

    adjustHeight();
    inputRef.current.addEventListener("input", adjustHeight);
    return () => inputRef.current?.removeEventListener("input", adjustHeight);
  }, []);

  function handleSend() {
    if (!query.trim()) return;
    onSend(query);
    setQuery("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      handleSend();
      event.preventDefault();
    }
  }

  return (
    <div
      className={cn(
        "flex gap-2 border border-base-300",
        "rounded-t-box p-3 px-4 bg-base-100"
      )}
    >
      <div className="flex-1 flex items-center">
        <textarea
          ref={inputRef}
          placeholder={placeholder}
          className={cn(
            "text-lg p-0 max-h-[240px] overflow-y-auto resize-none",
            "outline-none w-full placeholder-base-content/40",
            !query && "truncate"
          )}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={1}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
      </div>
      <button
        className={cn(
          "btn btn-sm btn-circle text-lg shadow-none border-0",
          query.trim() ? "btn-primary" : "btn-soft"
        )}
        onClick={handleSend}
        disabled={disabled || !query.trim()}
      >
        <TbArrowUp />
      </button>
    </div>
  );
}

export default function GroupChat({ loaderData }: Route.ComponentProps) {
  const { scrape, thread, messages: initialMessages, userToken } = loaderData;
  const scrollRef = useRef<HTMLDivElement>(null);

  const chat = useScrapeChat({
    token: userToken,
    scrapeId: scrape.id,
    defaultMessages: initialMessages,
    threadId: thread.id,
  });

  useEffect(() => {
    chat.connect();
    return () => chat.disconnect();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.allMessages, chat.askStage]);

  function getPlaceholder() {
    switch (chat.askStage) {
      case "asked":
        return "Thinking...";
      case "answering":
        return "Answering...";
      case "searching":
        return `Searching for "${chat.searchQuery ?? "answer"}"`;
      case "action-call":
        return `Running "${chat.actionCall}"`;
    }
    return "Ask a question...";
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Group link copied to clipboard");
  }

  const isDisabled = chat.askStage !== "idle";

  return (
    <div className="flex flex-col items-center bg-base-200 min-h-screen">
      <div className="flex flex-col gap-4 p-4 max-w-3xl w-full flex-1">
        <Nav scrape={scrape} />

        {thread.title && (
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">{thread.title}</h1>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex flex-col gap-4 flex-1 overflow-y-auto"
        >
          {chat.allMessages.map((message, index) => (
            <div key={message.id || index}>
              {message.role === "user" ? (
                <UserMessage
                  content={message.content}
                  fingerprint={message.fingerprint ?? undefined}
                />
              ) : (
                <AssistantMessage
                  scrape={scrape}
                  content={message.content}
                  links={message.links}
                />
              )}
            </div>
          ))}
          {(chat.askStage === "asked" ||
            chat.askStage === "searching" ||
            chat.askStage === "action-call") && <LoadingMessage />}
        </div>

        <div className="sticky bottom-4">
          <div>
            <ChatInput
              onSend={(message) => chat.ask(message)}
              disabled={isDisabled}
              placeholder={getPlaceholder()}
            />
            <div className="bg-base-100 rounded-b-box">
              <div
                className={cn(
                  "bg-base-300/80 border border-base-300 rounded-b-box p-1 px-2",
                  "flex items-center gap-1 text-xs justify-between"
                )}
              >
                <div className="flex items-center gap-1">
                  <span className="text-base-content/40">Powered by </span>
                  <a
                    href="https://crawlchat.app?ref=group-chat"
                    target="_blank"
                    className={cn(
                      "text-base-content/40 hover:text-base-content/80 transition-all",
                      "flex items-center gap-1"
                    )}
                  >
                    <RiChatVoiceAiFill />
                    CrawlChat
                  </a>
                </div>
                <div>
                  <div
                    className="tooltip tooltip-left"
                    data-tip="Copy group link"
                  >
                    <button
                      onClick={handleCopyLink}
                      className={cn(
                        "text-base-content/40 hover:text-base-content/80 transition-all",
                        "cursor-pointer"
                      )}
                    >
                      <TbShare />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
