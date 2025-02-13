import {
  Box,
  GridItem,
  Group,
  Heading,
  IconButton,
  Input,
  Link,
  SimpleGrid,
} from "@chakra-ui/react";
import { Stack, Text } from "@chakra-ui/react";
import type { Message, ScrapeLink, Thread } from "@prisma/client";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { TbCheck, TbSend, TbTrash, TbWorld } from "react-icons/tb";
import Markdown from "react-markdown";
import { Prose } from "~/components/ui/prose";
import { getLinkTitle, getThreadName } from "~/thread-util";
import { sleep } from "~/util";
import { AppContext } from "./context";
import { Button } from "~/components/ui/button";

function makeMessage(type: string, data: any) {
  return JSON.stringify({ type, data });
}

function LinkCard({ link }: { link: ScrapeLink }) {
  return (
    <Stack bg="brand.gray.100" p={2} rounded={"md"} h="full">
      <Link
        href={link.url}
        key={link.url}
        fontSize={"xs"}
        lineClamp={2}
        target="_blank"
      >
        {getLinkTitle(link)}
      </Link>
    </Stack>
  );
}

function AssistantMessage({
  content,
  links,
}: {
  content: string;
  links: ScrapeLink[];
}) {
  return (
    <Stack>
      <Prose w="full">
        <Markdown>{content}</Markdown>

        <SimpleGrid columns={3} gap={2}>
          {links.map((link, index) => (
            <GridItem key={index}>
              <LinkCard link={link} />
            </GridItem>
          ))}
        </SimpleGrid>
      </Prose>
    </Stack>
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
  token,
  deleting,
  onDelete,
}: {
  thread: Thread;
  token: string;
  deleting: boolean;
  onDelete: () => void;
}) {
  const { setThreadTitle } = useContext(AppContext);
  const socket = useRef<WebSocket>(null);
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>(thread.messages);
  const containerRef = useRef<HTMLDivElement>(null);
  const promptBoxRef = useRef<HTMLDivElement>(null);
  const [deleteActive, setDeleteActive] = useState(false);
  const selectionPopoverRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");

  const title = useMemo(() => getThreadName(messages), [messages]);

  useEffect(() => {
    positionPromptBox();
    scrollToBottom(true);
  }, [messages]);

  useEffect(() => {
    socket.current = new WebSocket("ws://localhost:3000");
    socket.current.onopen = () => {
      socket.current!.send(
        makeMessage("auth", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );
    };
    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "llm-chunk") {
        if (message.data.end) {
          setMessages((prev) => [
            ...prev,
            {
              llmMessage: {
                role: message.data.role,
                content: message.data.content,
              },
              links: message.data.links ?? [],
            },
          ]);
          setContent("");
          return;
        }
        setContent((prev) => prev + message.data.content);
        scrollToBottom();
      }
    };

    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [token]);

  useEffect(() => {
    if (deleteActive) {
      setTimeout(() => {
        setDeleteActive(false);
      }, 3000);
    }
  }, [deleteActive]);

  useEffect(() => {
    setThreadTitle((titles) => ({
      ...titles,
      [thread.id]: title,
    }));
  }, [title]);

  useEffect(() => {
    function handleMouseUp() {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        if (selectionPopoverRef.current) {
          selectionPopoverRef.current.style.display = "none";
        }
        setSelectedText("");
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const selectedText = selection.toString().trim();
      setSelectedText(selectedText);
      if (selectionPopoverRef.current) {
        selectionPopoverRef.current.style.display = "block";
        const popoverRect = selectionPopoverRef.current.getBoundingClientRect();

        selectionPopoverRef.current.style.left = `${
          rect.left + rect.width / 2 - popoverRect.width / 2
        }px`;
        selectionPopoverRef.current.style.top = `${
          rect.top - popoverRect.height - 6
        }px`;
      }
    }

    function handleScroll() {
      if (selectionPopoverRef.current) {
        selectionPopoverRef.current.style.display = "none";
      }
      setSelectedText("");
    }

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("scroll", handleScroll);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("scroll", handleScroll);
    };
  }, []);

  async function handleAsk(query: string) {
    if (query.length === 0) return;

    socket.current!.send(
      makeMessage("ask-llm", { threadId: thread.id, query })
    );
    setMessages((prev) => [
      ...prev,
      { llmMessage: { role: "user", content: query }, links: [] },
    ]);
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

  function handleAskSelectedText(prefix: string) {
    if (selectedText.length === 0) return;
    handleAsk(`${prefix} ${selectedText}`);
    setSelectedText("");
    if (selectionPopoverRef.current) {
      selectionPopoverRef.current.style.display = "none";
    }
  }

  return (
    <Stack w={"full"} h="full" ref={containerRef}>
      <Stack>
        <Heading>{title}</Heading>
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
        {allMessages().map((message, index) => (
          <Stack key={index}>
            {message.role === "assistant" ? (
              <AssistantMessage
                content={message.content}
                links={message.links}
              />
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAsk(query);
            }
          }}
        />
        <IconButton
          onClick={() => handleAsk(query)}
          disabled={query.length === 0}
        >
          <TbSend />
        </IconButton>
      </Group>

      <Box
        position={"fixed"}
        top={0}
        left={0}
        ref={selectionPopoverRef}
        p={1}
        rounded={"md"}
        bg="brand.white"
        shadow={"md"}
        display={"none"}
      >
        <Group attached>
          <Button
            variant={"outline"}
            size="xs"
            onClick={() => handleAskSelectedText("What is")}
          >
            What?
          </Button>
          <Button
            variant={"outline"}
            size="xs"
            onClick={() => handleAskSelectedText("Why is")}
          >
            Why?
          </Button>
          <Button
            variant={"outline"}
            size="xs"
            onClick={() => handleAskSelectedText("How is")}
          >
            How?
          </Button>
          <Button
            variant={"outline"}
            size="xs"
            onClick={() => handleAskSelectedText("When is")}
          >
            When?
          </Button>
        </Group>
      </Box>
    </Stack>
  );
}
