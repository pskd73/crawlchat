import type { Message, MessageRating, Scrape, Thread } from "libs/prisma";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { useFetcher } from "react-router";
import { getMessagesScore } from "~/score";
import { useScrapeChat } from "~/widget/use-chat";

export function useChatBox({
  scrape,
  thread: initialThread,
  messages,
  embed,
  admin,
  token: initialToken,
  fullscreen,
  readonly: initReadOnly,
}: {
  scrape: Scrape;
  thread: Thread | null;
  messages: Message[];
  embed: boolean;
  admin: boolean;
  token: string | null;
  fullscreen?: boolean;
  readonly?: boolean;
}) {
  const pinFetcher = useFetcher();
  const unpinFetcher = useFetcher();
  const eraseFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const rateFetcher = useFetcher();
  const ticketCreateFetcher = useFetcher();
  const createThreadFetcher = useFetcher();
  const [eraseAt, setEraseAt] = useState<number>();
  const [thread, setThread] = useState<Thread | null>(initialThread);
  const [token, setToken] = useState<string | null>(initialToken);
  const readOnly = admin || initReadOnly;

  const chat = useScrapeChat({
    token: token ?? undefined,
    scrapeId: scrape.id,
    defaultMessages: messages,
    threadId: thread?.id,
  });

  const [screen, setScreen] = useState<"chat" | "mcp" | "ticket-create">(
    "chat"
  );
  const overallScore = useMemo(() => getMessagesScore(messages), [messages]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [pendingQuery, setPendingQuery] = useState<string>();
  const titleSlug = useMemo(() => {
    return scrape.title?.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }, [scrape.title]);
  const customerEmail = useMemo(
    () =>
      thread?.ticketUserEmail ??
      (thread?.customTags as Record<string, any>)?.email ??
      null,
    [thread]
  );
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [internalLinkHosts, setInternalLinkHosts] = useState<string[]>([]);

  useEffect(() => {
    if (token) {
      chat.connect();
      return () => chat.disconnect();
    }
  }, [token]);

  useEffect(function () {
    scroll();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const isDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setTheme(isDarkMode ? "dark" : "light");

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleThemeChange);
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, []);

  useEffect(() => {
    if (createThreadFetcher.data) {
      setThread(createThreadFetcher.data.thread);
      setToken(createThreadFetcher.data.userToken);
    }
  }, [createThreadFetcher.data]);

  useEffect(() => {
    if (eraseFetcher.data) {
      setThread(null);
      setToken(null);
    }
  }, [eraseFetcher.data]);

  useEffect(() => {
    if (ticketCreateFetcher.data) {
      setEraseAt(new Date().getTime());
    }
  }, [ticketCreateFetcher.data]);

  useEffect(() => {
    if (embed && window.parent) {
      window.parent.postMessage(
        JSON.stringify({
          type: "embed-ready",
          widgetConfig: {
            ...scrape.widgetConfig,
            logoUrl: scrape.logoUrl,
          },
        }),
        "*"
      );
    }
  }, [embed]);

  useEffect(() => {
    if (embed) {
      document.documentElement.style.background = "transparent";
    }

    function handleKeyDown(event: KeyboardEvent) {
      window.parent.postMessage(
        JSON.stringify({
          type: "keydown",
          data: {
            key: event.key,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
          },
        }),
        "*"
      );
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [embed]);

  useEffect(() => {
    if (ticketCreateFetcher.data) {
      toast.success("Ticket created & check your email.");
    }
  }, [ticketCreateFetcher.data]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "focus") {
        scroll();
        document.querySelector("html")?.style.setProperty("color-scheme", "");
      }

      if (event.data === "dark-mode") {
        setTheme("dark");
      }

      if (event.data === "light-mode") {
        setTheme("light");
      }

      try {
        const data = JSON.parse(event.data);
        if (data.type === "internal-link-host") {
          setInternalLinkHosts((hosts) => [...hosts, data.host]);
        }
      } catch {}
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (chat.connected && thread?.id && pendingQuery) {
      ask(pendingQuery);
      setPendingQuery(undefined);
    }
  }, [chat.connected]);

  useEffect(() => {
    if (eraseAt) {
      chat.erase();
      setScreen("chat");
    }
  }, [eraseAt]);

  function rate(id: string, rating: MessageRating) {
    toast.success("Thank you for your feedback!");
    rateFetcher.submit({ intent: "rate", id, rating }, { method: "post" });
  }

  async function ask(query: string) {
    if (!thread?.id) {
      chat.setMakingThreadId();
      createThreadFetcher.submit(
        { intent: "create-thread" },
        { method: "post" }
      );
      setPendingQuery(query);
      return;
    }
    chat.ask(query);
    await scroll();
  }

  async function scroll(selector = ".message") {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const message = document.querySelectorAll(selector);
    if (message) {
      message[message.length - 1]?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function close() {
    if (embed) {
      window.parent.postMessage("close", "*");
    }
    inputRef.current?.blur();
  }

  function erase() {
    eraseFetcher.submit({ intent: "erase" }, { method: "post" });
    chat.erase();
  }

  function scrollToMessage(id: string) {
    scroll(`#message-${id}`);
  }

  function deleteMessages(ids: string[]) {
    deleteFetcher.submit({ intent: "delete", ids }, { method: "post" });
    chat.deleteMessage(ids);
  }

  async function refresh(questionId: string, answerId: string) {
    const message = chat.getMessage(questionId);
    if (!message) return;

    chat.deleteMessage([questionId, answerId]);
    chat.ask((message.llmMessage as any).content as string, {
      delete: [questionId, answerId],
    });
    await scroll();
  }

  function cancelTicketCreate() {
    setScreen("chat");
    scroll();
  }

  function createTicket(email: string, title: string, message: string) {
    ticketCreateFetcher.submit(
      { intent: "ticket-create", email, title, message },
      { method: "post" }
    );
  }

  function handleInternalLinkClick(url: string) {
    window.parent.postMessage(
      JSON.stringify({
        type: "internal-link-click",
        url,
      }),
      "*"
    );
  }

  return {
    scrape,
    thread,
    messages,
    embed,
    token,
    pinFetcher,
    unpinFetcher,
    eraseFetcher,
    deleteFetcher,
    rateFetcher,
    ticketCreateFetcher,
    createThreadFetcher,
    eraseAt,
    chat,
    inputRef,
    readOnly,
    screen,
    overallScore,
    admin,
    customerEmail,
    titleSlug,
    fullscreen,
    theme,
    internalLinkHosts,
    close,
    erase,
    deleteMessages,
    rate,
    ask,
    createTicket,
    cancelTicketCreate,
    refresh,
    scrollToMessage,
    scroll,
    setScreen,
    setTheme,
    handleInternalLinkClick,
  };
}

export type ChatBoxState = ReturnType<typeof useChatBox>;
export const ChatBoxContext = createContext<ChatBoxState | null>(null);
export const useChatBoxContext = () => {
  const context = useContext(ChatBoxContext);
  if (!context) {
    throw new Error("useChatBoxContext must be used within a ChatBoxProvider");
  }
  return context;
};

export function ChatBoxProvider({
  children,
  scrape,
  thread,
  messages,
  embed,
  admin,
  token,
  fullscreen,
  readonly,
}: {
  children: React.ReactNode;
  scrape: Scrape;
  thread: Thread | null;
  messages: Message[];
  embed: boolean;
  admin: boolean;
  token: string | null;
  fullscreen?: boolean;
  readonly?: boolean;
}) {
  const chatBox = useChatBox({
    scrape,
    thread,
    messages,
    embed,
    admin,
    token,
    fullscreen,
    readonly,
  });
  return (
    <ChatBoxContext.Provider value={chatBox}>
      {children}
    </ChatBoxContext.Provider>
  );
}
