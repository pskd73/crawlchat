import type { MessageSourceLink, MessageRating, WidgetSize } from "libs/prisma";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  forwardRef,
} from "react";
import {
  TbArrowUp,
  TbHelp,
  TbMessage,
  TbRefresh,
  TbRobotFace,
  TbPointer,
  TbThumbUp,
  TbThumbDown,
  TbShare2,
  TbX,
  TbArrowRight,
  TbTrash,
  TbFileDescription,
  TbChevronDown,
  TbChevronUp,
  TbCopy,
  TbCheck,
  TbMenu2,
  TbChartBar,
} from "react-icons/tb";
import { MarkdownProse } from "~/widget/markdown-prose";
import { track } from "~/pirsch";
import { extractCitations } from "libs/citation";
import { makeCursorMcpJson, makeMcpCommand, makeMcpName } from "~/mcp/setup";
import { useChatBoxContext } from "./use-chat-box";
import cn from "@meltdownjs/cn";
import toast from "react-hot-toast";

export function useChatBoxDimensions(
  size: WidgetSize | null,
  ref: React.RefObject<HTMLDivElement | null>
) {
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);

  function getDimensionsForSize(width: number, height: number) {
    const padding = 32;
    width -= padding * 2;
    height -= padding * 2;

    switch (size) {
      case "large":
        width = Math.min(width, 700);
        height = Math.min(height, 600);
        return { width: width, height: height };
      default:
        width = Math.min(width, 520);
        height = Math.min(height, 460);
        return { width: width, height: height };
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const dims = getDimensionsForSize(rect.width, rect.height);
        setWidth(dims.width);
        setHeight(dims.height);
      }
    };
    window.addEventListener("resize", handleResize);

    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { width, height };
}

function ChatInput() {
  const { ask, chat, screen, readOnly, scrape, inputRef, embed, sidePanel } =
    useChatBoxContext();

  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const cleanedQuery = useMemo(() => {
    return query.trim();
  }, [query]);

  useEffect(() => {
    if (!inputRef.current) return;

    const adjustHeight = () => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current!.style.height = `${inputRef.current!.scrollHeight}px`;
      }
    };

    adjustHeight();

    const handleInput: EventListener = () => {
      adjustHeight();
    };

    const handlePaste: EventListener = () => {
      setTimeout(() => {
        adjustHeight();
      }, 0);
    };

    inputRef.current.addEventListener("input", handleInput);
    inputRef.current.addEventListener("paste", handlePaste);

    return () => {
      inputRef.current?.removeEventListener("input", handleInput);
      inputRef.current?.removeEventListener("paste", handlePaste);
    };
  }, [chat.askStage]);

  useEffect(
    function () {
      const handleOnMessage = (event: MessageEvent) => {
        if (event.data === "focus") {
          inputRef.current?.focus();
        }
      };

      if (!embed) {
        inputRef.current?.focus();
      }

      window.addEventListener("message", handleOnMessage);
      return () => {
        window.removeEventListener("message", handleOnMessage);
      };
    },
    [embed]
  );

  function handleAsk() {
    if (!cleanedQuery.length) return;
    ask(query);
    setQuery("");
    track("chat_ask", { query });
  }

  function getPlaceholder() {
    switch (chat.askStage) {
      case "asked":
        return "😇 Thinking...";
      case "answering":
        return "🤓 Answering...";
      case "searching":
        return `🔍 Searching for "${chat.searchQuery ?? "answer"}"`;
      case "action-call":
        return `🤖 Doing "${chat.actionCall}"`;
    }
    return scrape.widgetConfig?.textInputPlaceholder ?? "Ask your question";
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      handleAsk();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  const isDisabled = screen !== "chat" || readOnly || chat.askStage !== "idle";
  const bg = scrape.widgetConfig?.applyColorsToChatbox
    ? scrape.widgetConfig.primaryColor
    : undefined;
  const color = scrape.widgetConfig?.applyColorsToChatbox
    ? scrape.widgetConfig.buttonTextColor
    : undefined;

  return (
    <div
      className={cn(
        "flex gap-2 border-t border-base-300 justify-between p-4",
        "transition-all",
        sidePanel && "m-2 border rounded-2xl",
        sidePanel && focused && "shadow"
      )}
    >
      <div className="flex-1 flex items-center">
        <textarea
          ref={inputRef}
          placeholder={getPlaceholder()}
          className={cn(
            "text-lg p-0 max-h-[240px] overflow-y-auto resize-none",
            "outline-none w-full",
            !query && "truncate"
          )}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={1}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>

      <button
        className={cn(
          "btn btn-sm btn-circle text-lg shadow-none border-0",
          cleanedQuery.length > 0 ? "btn-primary" : "btn-soft"
        )}
        onClick={handleAsk}
        disabled={isDisabled}
        style={{
          backgroundColor: !isDisabled ? bg ?? undefined : undefined,
          color: !isDisabled ? color ?? undefined : undefined,
        }}
      >
        <TbArrowUp />
      </button>
    </div>
  );
}

export function SourceLink({
  link,
  index,
  color,
}: {
  link: MessageSourceLink;
  index: number;
  color?: string;
}) {
  const { internalLinkHosts, handleInternalLinkClick } = useChatBoxContext();

  const internal = link.url
    ? internalLinkHosts.includes(new URL(link.url).hostname)
    : false;

  return (
    <a
      className={cn(
        "flex items-center gap-1",
        "transition-all decoration-0 opacity-70",
        "hover:opacity-100 text-sm group",
        link.url && "cursor-pointer"
      )}
      href={internal ? undefined : link.url ?? undefined}
      target={internal ? undefined : "_blank"}
      style={{
        color: color ?? undefined,
      }}
      onClick={
        internal ? () => handleInternalLinkClick(link.url ?? "") : undefined
      }
    >
      <TbFileDescription size={14} className="flex-shrink-0" />
      <span className="truncate min-w-0">{link.title}</span>
    </a>
  );
}

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="user-message text-xl font-bold opacity-80 whitespace-pre-wrap">
      {content}
    </div>
  );
}

export function Sources({
  citation,
  color,
}: {
  citation: ReturnType<typeof extractCitations>;
  color?: string;
}) {
  const { internalLinkHosts } = useChatBoxContext();
  const [showSources, setShowSources] = useState(false);
  const citedLinks = Object.entries(citation.citedLinks)
    .filter(([_, link]) => link)
    .map(([index, link]) => ({
      index: Number(index),
      link,
    }));

  useEffect(() => {
    if (internalLinkHosts.length > 0) {
      setShowSources(true);
    }
  }, [internalLinkHosts]);

  if (citedLinks.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2", showSources && "mb-2")}>
      <div
        className={cn(
          "flex items-center gap-2 hover:opacity-100 opacity-70 cursor-pointer text-sm",
          "transition-all",
          showSources && "opacity-100"
        )}
        onClick={() => setShowSources(!showSources)}
        style={{
          color: color ?? undefined,
        }}
      >
        {citedLinks.length} Source{citedLinks.length > 1 ? "s" : ""}
        {showSources ? <TbChevronUp /> : <TbChevronDown />}
      </div>

      {showSources &&
        citedLinks.map(({ index, link }) => (
          <SourceLink key={index} link={link} index={index} color={color} />
        ))}
    </div>
  );
}

function MessageButton({
  tip,
  onClick,
  disabled,
  children,
  active,
}: {
  tip: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div className="tooltip" data-tip={tip}>
      <button
        className={cn(
          "btn btn-circle btn-sm shadow-none",
          active && "btn-primary"
        )}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    </div>
  );
}

export function MessageCopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <MessageButton tip="Copy" onClick={handleCopy} disabled={copied}>
      {copied ? <TbCheck /> : <TbCopy />}
    </MessageButton>
  );
}

export function AssistantMessage({
  id,
  questionId,
  content,
  links,
  rating,
  last,
  pullUp,
}: {
  id: string;
  questionId: string;
  content: string;
  links: MessageSourceLink[];
  rating: MessageRating | null;
  last: boolean;
  pullUp: boolean;
}) {
  const {
    refresh,
    rate,
    readOnly,
    admin,
    createTicket,
    ticketCreateFetcher,
    customerEmail,
    scrape,
    chat,
  } = useChatBoxContext();
  const citation = useMemo(
    () => extractCitations(content, links),
    [content, links]
  );
  const score = useMemo(
    () => Math.max(...links.map((l) => l.score ?? 0), 0),
    [links]
  );
  const [currentRating, setCurrentRating] = useState<MessageRating | null>(
    rating
  );

  function handleRate(rating: MessageRating) {
    setCurrentRating(rating);
    if (rating !== currentRating) {
      track("chat_rate", { rating, messageId: id });
      rate(id, rating);
    }
  }

  const color = scrape.widgetConfig?.applyColorsToChatbox
    ? scrape.widgetConfig.primaryColor
    : undefined;

  return (
    <div className={cn("flex flex-col gap-2", pullUp && "-mt-6")}>
      <Sources citation={citation} color={color ?? undefined} />

      <div className="flex flex-col gap-4">
        <MarkdownProse
          size={scrape.widgetConfig?.size === "large" ? "lg" : "md"}
          sources={Object.values(citation.citedLinks).map((link) => ({
            title: link?.title ?? link?.url ?? "Source",
            url: link?.url ?? undefined,
          }))}
          options={{
            onTicketCreate: createTicket,
            ticketCreateLoading: ticketCreateFetcher.state !== "idle",
            disabled: readOnly,
            customerEmail,
          }}
        >
          {citation.content}
        </MarkdownProse>

        {chat.askStage === "idle" && (
          <div className="flex items-center gap-2">
            <MessageCopyButton content={content} />

            <MessageButton
              tip="Refresh"
              onClick={() => refresh(questionId, id)}
              disabled={readOnly}
            >
              <TbRefresh />
            </MessageButton>

            <MessageButton
              tip="Helpful"
              onClick={() => handleRate("up")}
              disabled={readOnly}
              active={currentRating === "up"}
            >
              <TbThumbUp />
            </MessageButton>

            <MessageButton
              tip="Not helpful"
              onClick={() => handleRate("down")}
              disabled={readOnly}
              active={currentRating === "down"}
            >
              <TbThumbDown />
            </MessageButton>

            {admin && (
              <div className="badge badge-soft badge-primary">
                <TbChartBar />
                {score.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NoMessages() {
  const { ask, scrape } = useChatBoxContext();

  return (
    <div className="flex flex-col gap-4 p-4 flex-1">
      <MarkdownProse size="lg">
        {scrape.widgetConfig?.welcomeMessage ||
          "Ask your queries here. Remember, I am an AI assistant and refer to the sources to confirm the answer."}
      </MarkdownProse>

      {scrape.widgetConfig?.questions &&
        scrape.widgetConfig.questions.length > 0 && (
          <div className="w-full flex flex-col gap-2">
            <div className="text-xs opacity-50">QUICK QUESTIONS</div>
            <div className="w-full flex flex-col gap-2">
              {scrape.widgetConfig?.questions
                .filter((q) => q.text)
                .map((question, i) => (
                  <div
                    key={i}
                    className={cn(
                      "border border-base-300 rounded-box flex items-center gap-2",
                      "p-2 px-3 w-full hover:bg-base-200 transition-all cursor-pointer"
                    )}
                    onClick={() => ask(question.text)}
                  >
                    <TbHelp />
                    {question.text}
                  </div>
                ))}
            </div>
          </div>
        )}
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex flex-col gap-2">
      <div className="skeleton h-[20px] w-full" />
      <div className="skeleton h-[20px] w-full" />
      <div className="skeleton h-[20px] w-[60%]" />
    </div>
  );
}

function MCPSetup() {
  const { scrape } = useChatBoxContext();
  const [section, setSection] = useState<string>("mcp-command");
  const sections = useMemo(
    () => [
      {
        value: "mcp-command",
        icon: <TbRobotFace />,
        title: "MCP Command",
        script: makeMcpCommand(scrape.id, makeMcpName(scrape)),
        language: "sh",
      },
      {
        value: "stats",
        icon: <TbPointer />,
        title: "Cursor",
        script: makeCursorMcpJson(scrape.id, makeMcpName(scrape)),
        language: "json",
      },
    ],
    [scrape]
  );

  return (
    <div className="flex flex-col gap-2 w-full h-full p-4">
      <div className="text-lg font-bold flex items-center gap-2">
        <TbRobotFace />
        Setup MCP client
      </div>

      <div className="text-base-content/50 mb-4">
        Model Context Protocol is a standard way for AI apps to extend the
        ability to do custom actions. You can also use your own AI applications
        to interact with the documentation such as Cursor, Windsurf, Claude or
        ever growing list.
      </div>

      <div className="join join-vertical">
        {sections.map((item) => (
          <div className="collapse collapse-arrow join-item bg-base-100 border border-base-300">
            <input type="radio" name={"mcp-section"} />
            <div className="collapse-title font-semibold">{item.title}</div>
            <div className="collapse-content text-sm">
              <MarkdownProse noMarginCode>
                {`\`\`\`${item.language}\n${item.script}\n\`\`\``}
              </MarkdownProse>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ToolbarButton = forwardRef<
  HTMLButtonElement,
  PropsWithChildren<{ onClick?: () => void }>
>(function ToolbarButton({ children, onClick }, ref) {
  return (
    <button
      className="btn btn-sm btn-ghost btn-plain btn-square text-lg"
      tabIndex={0}
      ref={ref}
      onClick={onClick}
    >
      {children}
    </button>
  );
});

function Toolbar() {
  const {
    chat,
    erase,
    thread,
    screen,
    setScreen,
    overallScore,
    scrape,
    admin,
    fullscreen,
    close,
  } = useChatBoxContext();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(
    function () {
      if (!confirmDelete) {
        return;
      }

      const timeout = setTimeout(() => setConfirmDelete(false), 3000);
      return () => clearTimeout(timeout);
    },
    [confirmDelete]
  );

  function handleShare() {
    navigator.clipboard.writeText(`${window.location.origin}/s/${thread?.id}`);
    toast.success("Share link copied to clipboard");
  }

  function handleMenuSelect(value: string) {
    (document.activeElement as HTMLElement).blur();
    if (value === "share") {
      return handleShare();
    }
    if (value === "mcp") {
      return setScreen("mcp");
    }
  }

  const widgetConfig = scrape.widgetConfig;
  const bg = widgetConfig?.applyColorsToChatbox
    ? widgetConfig.primaryColor
    : undefined;
  const color = widgetConfig?.applyColorsToChatbox
    ? widgetConfig.buttonTextColor
    : undefined;

  return (
    <div
      className={cn(
        "flex h-[60px] gap-2 border-b border-base-300",
        "p-4 w-full justify-between bg-base-200 items-center",
        "items-center"
      )}
      style={{
        backgroundColor: bg ?? undefined,
        color: color ?? undefined,
      }}
    >
      <div className="flex flex-1 gap-2 items-center">
        {fullscreen && (
          <ToolbarButton onClick={() => close()}>
            <TbX />
          </ToolbarButton>
        )}
        {scrape.widgetConfig?.logoUrl && (
          <img
            src={scrape.widgetConfig.logoUrl}
            alt="Logo"
            style={{ maxWidth: "24px", maxHeight: "24px" }}
          />
        )}

        <div className="text-xl font-bold">
          {scrape.widgetConfig?.title ?? scrape.title ?? "Ask AI"}
        </div>

        {admin &&
          overallScore !== undefined &&
          Number.isFinite(overallScore) && (
            <div className="tooltip tooltip-right" data-tip="Avg score">
              <span className="badge badge-primary badge-soft">
                {overallScore.toFixed(2)}
              </span>
            </div>
          )}
      </div>

      <div className="flex gap-2">
        {screen === "mcp" && (
          <div className="tooltip tooltip-left" data-tip="Switch to chat">
            <ToolbarButton onClick={() => setScreen("chat")}>
              <TbMessage />
            </ToolbarButton>
          </div>
        )}

        {chat.allMessages.length > 0 && (
          <div
            className="tooltip tooltip-left"
            data-tip="Clear & start new conversation"
          >
            <ToolbarButton onClick={() => erase()}>
              <TbTrash />
            </ToolbarButton>
          </div>
        )}

        <div className="dropdown dropdown-end">
          <ToolbarButton>
            <TbMenu2 />
          </ToolbarButton>
          <ul
            tabIndex={0}
            className={cn(
              "menu dropdown-content bg-base-100 rounded-box",
              "z-1 w-34 p-2 shadow-sm text-base-content"
            )}
          >
            {chat.messages.length > 0 && (
              <li>
                <a onClick={() => handleMenuSelect("share")}>
                  <TbShare2 />
                  Share chat
                </a>
              </li>
            )}
            {(scrape.widgetConfig?.showMcpSetup ?? true) && (
              <li>
                <a onClick={() => handleMenuSelect("mcp")}>
                  <TbRobotFace />
                  As MCP
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PoweredBy() {
  const { titleSlug, sidePanel } = useChatBoxContext();

  return (
    <div className={cn("text-xs", sidePanel && "flex justify-center gap-1")}>
      <span className="opacity-40">Powered by </span>
      <a
        className="link link-primary link-hover"
        href={`https://crawlchat.app?ref=powered-by-${titleSlug}`}
        target="_blank"
      >
        CrawlChat
      </a>
    </div>
  );
}

export function ChatboxContainer({
  children,
  noShadow,
}: {
  children: React.ReactNode;
  noShadow?: boolean;
}) {
  const { close, scrape, theme } = useChatBoxContext();
  const containerRef = useRef<HTMLDivElement>(null);

  function handleBgClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  const borderColor = scrape.widgetConfig?.applyColorsToChatbox
    ? scrape.widgetConfig.primaryColor
    : undefined;

  return (
    <div
      className={cn("flex w-full h-full", "md:justify-center md:items-center")}
      onClick={handleBgClick}
      ref={containerRef}
    >
      <div
        data-theme={theme}
        className={cn(
          "flex flex-col bg-base-100 relative md:rounded-xl overflow-hidden",
          "md:border w-full h-full md:h-auto border-base-300",
          scrape.widgetConfig?.size !== "large" &&
            "md:w-[520px] md:max-h-[460px]",
          scrape.widgetConfig?.size === "large" &&
            "md:w-[700px] md:max-h-[600px]",
          !noShadow && "md:shadow-2xl"
        )}
        style={{
          borderColor: borderColor ?? undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function ScrapeWidget() {
  const { screen, chat, ask } = useChatBoxContext();

  function handleAsk(question: string) {
    ask(question);
  }

  return (
    <>
      <Toolbar />
      <div className="flex flex-col flex-1 overflow-auto" id="chat-box-scroll">
        {screen === "chat" && (
          <>
            {chat.allMessages.length === 0 && <NoMessages />}
            {chat.allMessages.map((message, index) => (
              <div
                key={index}
                id={`message-${message.id}`}
                className={cn(
                  "message flex flex-col gap-2 first:border-t-0 p-4",
                  message.role === "user" && "border-t border-base-300"
                )}
              >
                {message.role === "user" ? (
                  <UserMessage content={message.content} />
                ) : (
                  <AssistantMessage
                    id={message.id}
                    questionId={chat.allMessages[index - 1]?.id}
                    content={message.content}
                    links={message.links}
                    rating={message.rating}
                    last={index === chat.allMessages.length - 1}
                    pullUp={chat.allMessages[index - 1]?.role === "user"}
                  />
                )}
                {(chat.askStage === "asked" ||
                  chat.askStage === "searching" ||
                  chat.askStage === "action-call") &&
                  index === chat.allMessages.length - 1 && <LoadingMessage />}
                {chat.askStage !== "idle" &&
                  index === chat.allMessages.length - 1 && (
                    <div className="h-[2000px] w-full" />
                  )}
              </div>
            ))}
            {chat.followUpQuestions.length > 0 && (
              <div className="p-4 pt-0 flex flex-col gap-2">
                {chat.followUpQuestions.map((question, index) => (
                  <div
                    key={index}
                    className={cn(
                      "border border-base-300 rounded-box p-1",
                      "w-fit px-2 hover:shadow-sm transition-all cursor-pointer"
                    )}
                    onClick={() => handleAsk(question)}
                  >
                    {question}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {screen === "mcp" && <MCPSetup />}
      </div>
      {screen === "chat" && <ChatInput />}
      <div className="px-4 py-2 bg-base-300/80 border-t border-base-300">
        <PoweredBy />
      </div>
    </>
  );
}
