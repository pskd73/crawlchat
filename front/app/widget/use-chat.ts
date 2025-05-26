import type { Message } from "libs/prisma";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { toaster } from "~/components/ui/toaster";
import { AppContext } from "~/dashboard/context";
import { makeMessage } from "~/dashboard/socket-util";
import { getThreadName } from "~/thread-util";

export type AskStage = "idle" | "asked" | "answering" | "searching";

export function useScrapeChat({
  token,
  scrapeId,
  threadId,
  defaultMessages,
}: {
  token: string;
  scrapeId: string;
  threadId: string;
  defaultMessages: Message[];
}) {
  const socket = useRef<WebSocket>(null);
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [content, setContent] = useState("");
  const [askStage, setAskStage] = useState<AskStage>("idle");
  const [searchQuery, setSearchQuery] = useState<string>();

  const allMessages = useMemo(() => {
    const allMessages = [
      ...messages.filter((message) => !message.ticketMessage),
      ...(content
        ? [
            {
              llmMessage: { role: "assistant", content },
              links: [],
              pinnedAt: null,
              id: "new-answer",
              rating: null,
              createdAt: new Date(),
            },
          ]
        : []),
    ];
    return allMessages.map((message) => ({
      role: (message.llmMessage as any).role,
      content: (message.llmMessage as any).content,
      links: message.links,
      pinned: message.pinnedAt !== null,
      id: message.id,
      rating: message.rating,
    }));
  }, [messages, content]);

  function connect() {
    socket.current = new WebSocket(window.ENV.VITE_SERVER_WS_URL);
    socket.current.onopen = () => {
      joinRoom();
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
      }
    };
  }

  function joinRoom() {
    socket.current!.send(
      makeMessage("join-room", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );
  }

  function handleQueryMessage({ id }: { id: string }) {
    setMessages((prev) => {
      const queryIndex = prev.findIndex(
        (message) => message.id === "new-query"
      );
      if (queryIndex === -1) {
        return prev;
      }
      return [
        ...prev.slice(0, queryIndex),
        {
          ...prev[queryIndex],
          id,
        },
        ...prev.slice(queryIndex + 1),
      ];
    });
  }

  function handleStage({ stage, query }: { stage: string; query?: string }) {
    if (stage === "tool-call") {
      setAskStage("searching");
      setSearchQuery(query);
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
      setMessages((prev) => [...prev, message]);
      setContent("");
      setAskStage("idle");
      return;
    }
    setAskStage("answering");
    setContent((prev) => prev + content);
    setSearchQuery(undefined);
  }

  function handleError(message: string) {
    alert(message);
    setContent("");
    setAskStage("idle");
  }

  function disconnect() {
    socket.current?.close();
  }

  function ask(query: string) {
    if (query.length === 0) return -1;

    socket.current!.send(makeMessage("ask-llm", { threadId, query }));
    const messagesCount = messages.length;
    setMessages((prev) => [
      ...prev,
      {
        llmMessage: { role: "user", content: query },
        links: [],
        pinnedAt: null,
        id: "new-query",
        createdAt: new Date(),
        threadId,
        updatedAt: new Date(),
        ownerUserId: "",
        scrapeId,
        channel: null,
        rating: null,
        correctionItemId: null,
        ticketMessage: null,
      },
    ]);
    setAskStage("asked");
    return messagesCount + 1;
  }

  function pinMessage(id: string) {
    setMessages((prev) => {
      const index = prev.findIndex((message) => message.id === id);
      if (index === -1) {
        return prev;
      }
      return [
        ...prev.slice(0, index),
        { ...prev[index], pinnedAt: new Date() },
        ...prev.slice(index + 1),
      ];
    });
  }

  function unpinMessage(id: string) {
    setMessages((prev) => {
      const index = prev.findIndex((message) => message.id === id);
      if (index === -1) {
        return prev;
      }
      return [
        ...prev.slice(0, index),
        { ...prev[index], pinnedAt: null },
        ...prev.slice(index + 1),
      ];
    });
  }

  function erase() {
    setMessages([]);
  }

  function deleteMessage(ids: string[]) {
    setMessages((prev) => prev.filter((message) => !ids.includes(message.id)));
  }

  function getMessage(id: string) {
    return messages.find((message) => message.id === id);
  }

  return {
    connect,
    disconnect,
    content,
    setContent,
    messages,
    setMessages,
    ask,
    allMessages,
    askStage,
    pinMessage,
    unpinMessage,
    erase,
    deleteMessage,
    searchQuery,
    getMessage,
  };
}
