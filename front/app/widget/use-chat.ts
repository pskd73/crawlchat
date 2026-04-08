import FingerprintJS from "@fingerprintjs/fingerprintjs";
import type { Message } from "@packages/common/prisma";
import { useEffect, useMemo, useRef, useState } from "react";

export type AskStage =
  | "idle"
  | "asked"
  | "answering"
  | "searching"
  | "action-call";

function makeMessage(type: string, data: any) {
  return JSON.stringify({ type, data });
}

export function useScrapeChat({
  token,
  scrapeId,
  threadId,
  defaultMessages,
  secret,
}: {
  token?: string;
  scrapeId: string;
  defaultMessages: Message[];
  threadId?: string;
  secret?: string;
}) {
  const socket = useRef<WebSocket>(null);
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [content, setContent] = useState<{ text: string; date: Date }>({
    text: "",
    date: new Date(),
  });
  const [askStage, setAskStage] = useState<AskStage>("idle");
  const [searchQuery, setSearchQuery] = useState<string>();
  const [actionCall, setActionCall] = useState<string>();
  const [connected, setConnected] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        if (mounted) {
          setFingerprint(result.visitorId);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const allMessages = useMemo(() => {
    const allMessages = [
      ...messages.filter((message) => !message.ticketMessage),
      ...(content.text
        ? [
            {
              llmMessage: { role: "assistant", content: content.text },
              links: [],
              pinnedAt: null,
              id: "new-answer",
              rating: null,
              createdAt: content.date,
              fingerprint,
            },
          ]
        : []),
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return allMessages.map((message) => ({
      role: (message.llmMessage as any).role,
      content: (message.llmMessage as any).content,
      links: message.links,
      pinned: message.pinnedAt !== null,
      id: message.id,
      rating: message.rating,
      fingerprint: message.fingerprint,
    }));
  }, [messages, content]);

  function startHeartbeat() {
    const interval = setInterval(() => {
      if (socket.current?.readyState !== WebSocket.OPEN) return;
      socket.current.send(makeMessage("ping", { timestamp: Date.now() }));
    }, 8000);
    return () => clearInterval(interval);
  }

  function connect() {
    socket.current = new WebSocket(window.ENV.VITE_SERVER_WS_URL);
    socket.current.onopen = () => {
      joinRoom();
      startHeartbeat();
    };
    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "llm-chunk") {
        handleLlmChunk(message.data);
      } else if (message.type === "error") {
        handleError(message.data.message);
      } else if (message.type === "query-message") {
        handleQueryMessage(message.data);
      } else if (message.type === "stage") {
        handleStage(message.data);
      } else if (message.type === "connected") {
        setConnected(true);
      } else if (message.type === "follow-up-questions") {
        setFollowUpQuestions(message.data.questions);
      }
    };
  }

  function joinRoom() {
    socket.current!.send(
      makeMessage("join-room", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        threadId,
      })
    );
  }

  function handleQueryMessage(messageData: Message) {
    setMessages((prev) => {
      const queryIndex = prev.findIndex(
        (message) => message.id === "new-query"
      );
      if (queryIndex === -1) {
        const alreadyExists = prev.some((m) => m.id === messageData.id);
        if (alreadyExists) return prev;
        return [...prev, { ...messageData, createdAt: new Date() }];
      }
      return [
        ...prev.slice(0, queryIndex),
        {
          ...prev[queryIndex],
          id: messageData.id,
        },
        ...prev.slice(queryIndex + 1),
      ];
    });
  }

  function handleStage({
    stage,
    query,
    action,
  }: {
    stage: string;
    query?: string;
    action?: string;
  }) {
    if (stage === "tool-call") {
      if (query) {
        setAskStage("searching");
        setSearchQuery(query);
      }
      if (action) {
        setAskStage("action-call");
        setActionCall(action);
      }
    }
  }

  function handleLlmChunk({
    end,
    content,
    message,
  }: {
    end?: boolean;
    content: string;
    message: Message;
  }) {
    if (end) {
      setMessages((prev) => [...prev, { ...message, createdAt: new Date() }]);
      setContent({ text: "", date: new Date() });
      setAskStage("idle");
      return;
    }
    setAskStage("answering");
    setContent((prev) => {
      const delta = new Date().getTime() - prev.date.getTime();
      const shouldOverride = delta > 2000 && prev.text.length <= 500;
      return {
        text: shouldOverride ? content : prev.text + content,
        date: new Date(),
      };
    });
    setSearchQuery(undefined);
  }

  function handleError(message: string) {
    alert(message);
    if (message.toLowerCase().includes("limit exceeded")) {
      setMessages((prev) => prev.slice(0, -1));
    }
    setContent({ text: "", date: new Date() });
    setAskStage("idle");
  }

  function disconnect() {
    setConnected(false);
    socket.current?.close();
  }

  function ask(query: string, options?: { delete?: string[]; url?: string }) {
    if (query.length === 0) return -1;

    socket.current!.send(
      makeMessage("ask-llm", {
        threadId,
        query,
        delete: options?.delete,
        clientData: {
          currentTimeISO: new Date().toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        secret: secret,
        fingerprint,
        url: options?.url,
      })
    );
    const messagesCount = messages.length;
    setMessages((prev) => [
      ...prev,
      {
        llmMessage: { role: "user", content: query },
        links: [],
        pinnedAt: null,
        id: "new-query",
        createdAt: new Date(),
        threadId: threadId ?? "",
        updatedAt: new Date(),
        ownerUserId: "",
        scrapeId,
        channel: null,
        rating: null,
        correctionItemId: null,
        ticketMessage: null,
        slackMessageId: null,
        discordMessageId: null,
        apiActionCalls: [],
        questionId: null,
        analysis: null,
        llmModel: "gpt_4o_mini",
        creditsUsed: 0,
        attachments: [],
        fingerprint,
        url: null,
        answerId: null,
        githubCommentId: null,
        dataGap: null,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        llmCost: 0,
        toolCalls: [],
        showedApiPlayground: false,
      },
    ]);
    setAskStage("asked");
    setFollowUpQuestions([]);
    return messagesCount + 1;
  }

  function erase() {
    setMessages([]);
    setFollowUpQuestions([]);
  }

  function deleteMessage(ids: string[]) {
    setMessages((prev) => prev.filter((message) => !ids.includes(message.id)));
  }

  function getMessage(id: string) {
    return messages.find((message) => message.id === id);
  }

  function setMakingThreadId() {
    setAskStage("asked");
  }

  return {
    connect,
    disconnect,
    messages,
    setMessages,
    ask,
    allMessages,
    askStage,
    erase,
    deleteMessage,
    searchQuery,
    getMessage,
    connected,
    setMakingThreadId,
    actionCall,
    followUpQuestions,
    setFollowUpQuestions,
    fingerprint,
  };
}
