import cn from "@meltdownjs/cn";
import { createToken } from "@packages/common/jwt";
import type {
  HelpdeskConfig,
  Message,
  Scrape,
  Thread,
} from "@packages/common/prisma";
import { prisma } from "@packages/common/prisma";
import Color from "color";
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLProps,
} from "react";
import { Toaster } from "react-hot-toast";
import { TbArrowRight, TbArrowUp, TbSparkles, TbTicket } from "react-icons/tb";
import { Outlet, redirect } from "react-router";
import { MCPIcon } from "~/components/mcp-icon";
import { makeCursorMcpConfig, makeMcpName } from "~/mcp-command";
import { makeMeta } from "~/meta";
import { sanitizeScrape, sanitizeThread } from "~/sanitize";
import { getSession } from "~/session";
import ChatBox from "~/widget/chat-box";
import { ChatBoxProvider, useChatBoxContext } from "~/widget/use-chat-box";
import type { Route } from "./+types/layout";
import { HelpdeskContext, HelpdeskProvider } from "./context";

const DEFAULT_HELPDESK_CONFIG = {
  enabled: false,
  heroBg: "#7F0E87",
  logo: "https://crawlchat.app/logo-white.png",
  navLinks: [
    {
      label: "Website",
      href: "https://crawlchat.app",
    },
  ],
  heroTitle: "Hello there 👋",
  searchPlaceholder: "Ask your question here",
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const scrape = await prisma.scrape.findFirstOrThrow({
    where: {
      slug: params.slug,
    },
  });

  let messages: Message[] = [];
  let thread: Thread | null = null;
  let userToken: string | null = null;

  const session = await getSession(request.headers.get("cookie"));
  const chatSessionKeys = session.get("chatSessionKeys") ?? {};

  if (chatSessionKeys[scrape.id]) {
    thread = await prisma.thread.findFirst({
      where: { id: chatSessionKeys[scrape.id] },
    });

    if (thread) {
      messages = await prisma.message.findMany({
        where: { threadId: thread.id },
      });
    }

    userToken = createToken(chatSessionKeys[scrape.id], {
      expiresInSeconds: 60 * 60 * 24,
    });
  }

  const scrapeWithConfig = scrape as Scrape & {
    helpdeskConfig?: HelpdeskConfig;
  };
  const helpdeskConfig: HelpdeskConfig | undefined =
    scrapeWithConfig.helpdeskConfig
      ? scrapeWithConfig.helpdeskConfig
      : undefined;

  if (!helpdeskConfig?.enabled) {
    return redirect("/");
  }

  sanitizeScrape(scrape);
  sanitizeThread(thread);

  return {
    scrape,
    thread,
    messages,
    userToken,
    helpdeskConfig,
  };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: `${data.scrape.title} - Helpdesk`,
  });
}

export function Container({
  children,
  className,
  ...props
}: HTMLProps<HTMLDivElement>) {
  return (
    <div className={cn("max-w-3xl mx-auto p-4 w-full", className)} {...props}>
      {children}
    </div>
  );
}

function SearchInput({
  color,
  config,
}: {
  color: string;
  config: HelpdeskConfig;
}) {
  const { ask } = useChatBoxContext();
  const { setChatActive } = useContext(HelpdeskContext);
  const ref = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const canSubmit = useMemo(() => {
    return query.trim().length > 0;
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "i" && event.metaKey) {
        event.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSubmit() {
    ask(query);
    setQuery("");
    setChatActive(true);
  }

  return (
    <div className="flex justify-center">
      <div className="bg-base-200 w-full flex shadow-xl">
        <div
          className={cn(
            "flex items-center gap-2 text-xl pl-4 hover:scale-105 transition-all",
            "cursor-pointer"
          )}
          style={{ color: config.heroBg || DEFAULT_HELPDESK_CONFIG.heroBg }}
          onClick={() => setChatActive(true)}
        >
          <TbSparkles />
        </div>
        <input
          ref={ref}
          type="text"
          placeholder={
            config.searchPlaceholder ||
            DEFAULT_HELPDESK_CONFIG.searchPlaceholder
          }
          className="input input-xl flex-1 shadow-none bg-base-200"
          style={{ border: 0, outline: 0, boxShadow: "none" }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
        />

        <div className="flex items-center gap-2 px-4">
          {canSubmit ? (
            <button
              className={cn(
                "h-8 w-8 rounded-box flex items-center justify-center",
                "cursor-pointer hover:scale-105 transition-all"
              )}
              style={{
                background: config.heroBg || DEFAULT_HELPDESK_CONFIG.heroBg,
                color,
              }}
              onClick={handleSubmit}
            >
              <TbArrowUp />
            </button>
          ) : (
            <>
              <kbd className="kbd">⌘</kbd>
              <kbd className="kbd">I</kbd>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PageChatBox() {
  const { chatActive, config } = useContext(HelpdeskContext);

  if (!chatActive) {
    return null;
  }

  return (
    <Container className={cn("p-0 -translate-y-15", "flex w-full h-full px-4")}>
      <div
        className={cn(
          "flex flex-col w-full h-full",
          "max-h-[480px] shadow-lg bg-base-200"
        )}
        style={{ borderColor: config.heroBg || DEFAULT_HELPDESK_CONFIG.heroBg }}
      >
        <ChatBox />
      </div>
    </Container>
  );
}

function Hero() {
  const { config } = useContext(HelpdeskContext);
  const color = useMemo(() => {
    const c = Color(config.heroBg || DEFAULT_HELPDESK_CONFIG.heroBg);
    return c.isDark() ? "white" : "black";
  }, [config.heroBg]);

  return (
    <div
      className="shadow-md"
      style={{ background: config.heroBg || DEFAULT_HELPDESK_CONFIG.heroBg }}
    >
      <Container className="flex flex-col">
        <div className="flex items-center justify-between" style={{ color }}>
          <img
            src={config.logo || DEFAULT_HELPDESK_CONFIG.logo}
            alt="CrawlChat"
            className="h-8"
          />

          <ul className="flex items-center gap-4">
            {config.navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="link link-hover">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center mt-16 mb-4" style={{ color }}>
          <h1 className="text-5xl font-medium text-center font-brand">
            {config.heroTitle}
          </h1>
        </div>

        <div className="translate-y-1/2">
          <SearchInput color={color} config={config} />
        </div>
      </Container>
    </div>
  );
}

function QuickLink({
  children,
  className,
  ...props
}: HTMLProps<HTMLAnchorElement>) {
  return (
    <a
      className={cn(
        "border border-base-300 rounded-box p-2 px-4 w-full block",
        "hover:bg-base-200 transition-all group",
        "flex justify-between gap-2 cursor-pointer bg-base-100",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">{children}</div>
      <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-all">
        <TbArrowRight />
      </div>
    </a>
  );
}

function QuickLinks() {
  const { ask } = useChatBoxContext();
  const { chatActive, scrape, setChatActive } = useContext(HelpdeskContext);

  function handleAddToCursor() {
    const name = makeMcpName(scrape);
    const script = makeCursorMcpConfig(scrape.id, name);
    window.open(
      `cursor://anysphere.cursor-deeplink/mcp/install?name=${name}&config=${btoa(
        script
      )}`,
      "_blank"
    );
  }

  function handleCreateTicket() {
    ask("I want to create a support ticket");
    setChatActive(true);
  }

  if (chatActive) {
    return null;
  }

  return (
    <Container className="w-full">
      <ul className="flex flex-col gap-2">
        {scrape.widgetConfig?.showMcpSetup && (
          <li>
            <QuickLink onClick={handleAddToCursor}>
              <MCPIcon />
              Add to Cursor as MCP
            </QuickLink>
          </li>
        )}
        {scrape.ticketingEnabled && (
          <li>
            <QuickLink onClick={handleCreateTicket}>
              <TbTicket />
              Create a support ticket
            </QuickLink>
          </li>
        )}
      </ul>
    </Container>
  );
}

export function Helpdesk({
  scrape,
  thread,
  messages,
  userToken,
  config,
  children,
}: {
  scrape: Scrape;
  thread: Thread | null;
  messages: Message[];
  userToken: string | null;
  config?: HelpdeskConfig;
  children?: React.ReactNode;
}) {
  return (
    <HelpdeskProvider
      scrape={scrape}
      config={config ?? DEFAULT_HELPDESK_CONFIG}
    >
      <ChatBoxProvider
        scrape={scrape}
        thread={thread}
        messages={messages}
        embed={false}
        admin={false}
        token={userToken}
        fullscreen={true}
      >
        <Hero />
        <PageChatBox />

        <div className="flex flex-col gap-4 mt-8">
          <QuickLinks />
          <Outlet />
          {children}
        </div>

        <Toaster />
      </ChatBoxProvider>
    </HelpdeskProvider>
  );
}

export default function Page({ loaderData }: Route.ComponentProps) {
  return (
    <Helpdesk
      scrape={loaderData.scrape}
      thread={loaderData.thread}
      messages={loaderData.messages}
      userToken={loaderData.userToken}
      config={loaderData.helpdeskConfig}
    />
  );
}
