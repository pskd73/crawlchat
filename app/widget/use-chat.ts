import type { Message } from "@prisma/client";
import { useRef, useState } from "react";
import { toaster } from "~/components/ui/toaster";
import { makeMessage } from "~/dashboard/socket-util";

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
  const socket = useRef<WebSocket>(null);
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [content, setContent] = useState("");
  const [askStage, setAskStage] = useState<AskStage>("idle");

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

  function handleLlmChunk({
    end,
    role,
    content,
    links,
  }: {
    end?: boolean;
    role: string;
    content: string;
    links?: { url: string; title: string }[];
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
      { llmMessage: { role: "user", content: query }, links: [] },
    ]);
    setAskStage("asked");
    return messagesCount + 1;
  }

  function allMessages() {
    const allMessages = [
      ...messages,
      ...(content
        ? [{ llmMessage: { role: "assistant", content }, links: [] }]
        : []),
    ];
    return allMessages.map((message) => ({
      role: (message.llmMessage as any).role,
      content: (message.llmMessage as any).content,
      links: message.links,
    }));
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
    askStage
  };
}
