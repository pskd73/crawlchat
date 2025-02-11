import { Box, Group, Heading, IconButton, Input } from "@chakra-ui/react";
import { Stack, Text } from "@chakra-ui/react";
import type { Thread } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { TbCheck, TbSend, TbTrash } from "react-icons/tb";
import Markdown from "react-markdown";
import { Prose } from "~/components/ui/prose";
import { getThreadName } from "~/thread-util";
import { sleep } from "~/util";

function makeMessage(type: string, data: any) {
  return JSON.stringify({ type, data });
}

function AssistantMessage({ content }: { content: string }) {
  return (
    <Prose w="full">
      <Markdown>{content}</Markdown>
    </Prose>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <Stack w="full" alignItems="flex-end">
      <Stack
        bg="brand.outline"
        p={4}
        rounded={"xl"}
        maxW="500px"
        w="fit-content"
        roundedBottomRight={0}
      >
        <Text>{content}</Text>
      </Stack>
    </Stack>
  );
}

export default function ChatBox({
  thread,
  deleting,
  onDelete,
}: {
  thread: Thread;
  deleting: boolean;
  onDelete: () => void;
}) {
  const socket = useRef<WebSocket>(null);
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    thread.messages as { role: string; content: string }[]
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const promptBoxRef = useRef<HTMLDivElement>(null);
  const [deleteActive, setDeleteActive] = useState(false);

  useEffect(() => {
    positionPromptBox();
    scrollToBottom(true);
  }, [messages]);

  useEffect(() => {
    socket.current = new WebSocket("ws://localhost:3000");
    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "llm-chunk") {
        if (message.data.end) {
          setMessages((prev) => [
            ...prev,
            { role: message.data.role, content: message.data.content },
          ]);
          setContent("");
          return;
        }
        setContent((prev) => prev + message.data.content);
        scrollToBottom();
      }
    };
  }, []);

  useEffect(() => {
    if (deleteActive) {
      setTimeout(() => {
        setDeleteActive(false);
      }, 3000);
    }
  }, [deleteActive]);

  async function handleAsk() {
    socket.current!.send(
      makeMessage("ask-llm", { threadId: thread.id, query })
    );
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setQuery("");
    await sleep(0);
    scrollToBottom();
  }

  function positionPromptBox() {
    if (!containerRef.current) return;
    if (!promptBoxRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    promptBoxRef.current.style.left = `${rect.left}px`;
    promptBoxRef.current.style.width = `${rect.width}px`;
  }

  function scrollToBottom(force = false) {
    const height = document.body.scrollHeight;

    const scrollY = window.scrollY + window.innerHeight;
    const delta = height - scrollY;
    if (delta > 100 && !force) return;

    window.scrollTo({
      top: height,
      behavior: "smooth",
    });
  }

  function handleDelete() {
    if (!deleteActive) {
      setDeleteActive(true);
      return;
    }
    onDelete();
  }

  return (
    <Stack w={"full"} h="full" ref={containerRef}>
      <Stack>
        <Heading>{getThreadName(thread, 100)}</Heading>
        <Group>
          <IconButton
            size={"xs"}
            variant={"subtle"}
            onClick={handleDelete}
            colorPalette={deleteActive || deleting ? "red" : undefined}
            disabled={deleting}
          >
            {deleteActive || deleting ? <TbCheck /> : <TbTrash />}
          </IconButton>
        </Group>
      </Stack>

      <Stack flex={1} pb={"60px"}>
        {[
          ...messages,
          ...(content ? [{ role: "assistant", content }] : []),
        ].map((message, index) => (
          <Stack key={index}>
            {message.role === "assistant" ? (
              <AssistantMessage content={message.content} />
            ) : (
              <UserMessage content={message.content} />
            )}
          </Stack>
        ))}
      </Stack>

      <Group
        position={"fixed"}
        bottom={0}
        left={0}
        w="full"
        zIndex={1}
        ref={promptBoxRef}
        pb={8}
        bg="brand.white"
      >
        <Input
          placeholder="Ask your query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <IconButton onClick={handleAsk}>
          <TbSend />
        </IconButton>
      </Group>
    </Stack>
  );
}
