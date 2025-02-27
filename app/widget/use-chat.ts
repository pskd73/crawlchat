import type { Message } from "@prisma/client";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { toaster } from "~/components/ui/toaster";
import { AppContext } from "~/dashboard/context";
import { makeMessage } from "~/dashboard/socket-util";
import { getThreadName } from "~/thread-util";

export type AskStage = "idle" | "asked" | "answering";

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
  const { setThreadTitle } = useContext(AppContext);
  const socket = useRef<WebSocket>(null);
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [content, setContent] = useState("");
  const [askStage, setAskStage] = useState<AskStage>("idle");

  const allMessages = useMemo(() => {
    const allMessages = [
      ...messages,
      ...(content
        ? [
            {
              llmMessage: { role: "assistant", content },
              links: [],
              pinnedAt: null,
              uuid: "new-answer",
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
      uuid: message.uuid,
    }));
  }, [messages, content]);

  useEffect(() => {
    if (setThreadTitle) {
      const title = getThreadName(messages);
      setThreadTitle((titles) => ({
        ...titles,
        [threadId]: title,
      }));
    }
  }, [messages]);

  function connect() {
    socket.current = new WebSocket(import.meta.env.VITE_SERVER_WS_URL);
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

  function handleQueryMessage({ uuid }: { uuid: string }) {
    setMessages((prev) => {
      const queryIndex = prev.findIndex(
        (message) => message.uuid === "new-query"
      );
      if (queryIndex === -1) {
        return prev;
      }
      return [
        ...prev.slice(0, queryIndex),
        {
          ...prev[queryIndex],
          uuid,
        },
        ...prev.slice(queryIndex + 1),
      ];
    });
  }

  function handleLlmChunk({
    end,
    role,
    content,
    links,
    uuid,
  }: {
    end?: boolean;
    role: string;
    content: string;
    links?: { url: string; title: string }[];
    uuid: string;
  }) {
    if (end) {
      setMessages((prev) => [
        ...prev,
        {
          llmMessage: {
            role,
            content,
          },
          links: links ?? [],
          pinnedAt: null,
          uuid,
          createdAt: new Date(),
        },
      ]);
      setContent("");
      setAskStage("idle");
      return;
    }
    setAskStage("answering");
    setContent((prev) => prev + content);
  }

  function handleError(message: string) {
    toaster.error({
      title: "Failed to connect",
      description: message,
    });
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
        uuid: "new-query",
        createdAt: new Date(),
      },
    ]);
    setAskStage("asked");
    return messagesCount + 1;
  }

  function pinMessage(uuid: string) {
    setMessages((prev) => {
      const index = prev.findIndex((message) => message.uuid === uuid);
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

  function unpinMessage(uuid: string) {
    setMessages((prev) => {
      const index = prev.findIndex((message) => message.uuid === uuid);
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

  function deleteMessage(uuids: string[]) {
    setMessages((prev) =>
      prev.filter((message) => !uuids.includes(message.uuid))
    );
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
  };
}
