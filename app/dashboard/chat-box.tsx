import {
  Box,
  Center,
  Group,
  Heading,
  IconButton,
  Input,
  Link,
  Skeleton,
} from "@chakra-ui/react";
import { Stack, Text } from "@chakra-ui/react";
import type { Scrape, Thread } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { TbArrowUp, TbChevronRight, TbMessage } from "react-icons/tb";
import { useScrapeChat, type AskStage } from "~/widget/use-chat";
import { MarkdownProse } from "~/widget/markdown-prose";

function ChatInput({
  onAsk,
  stage,
}: {
  onAsk: (query: string) => void;
  stage: AskStage;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(function () {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    const handleOnMessage = (event: MessageEvent) => {
      if (event.data === "focus") {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("message", handleOnMessage);
    return () => window.removeEventListener("message", handleOnMessage);
  }, []);

  function handleAsk() {
    onAsk(query);
    setQuery("");
  }

  function getPlaceholder() {
    switch (stage) {
      case "asked":
        return "😇 Thinking...";
      case "answering":
        return "🤓 Answering...";
    }
    return "Ask your question";
  }

  const disabled = stage !== "idle";

  return (
    <Group
      h="60px"
      borderTop={"1px solid"}
      borderColor={"brand.outline"}
      justify={"space-between"}
      p={4}
    >
      <Group flex={1}>
        <Input
          ref={inputRef}
          placeholder={getPlaceholder()}
          size={"xl"}
          p={0}
          outline={"none"}
          border="none"
          fontSize={"lg"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAsk();
            }
          }}
          disabled={disabled}
        />
      </Group>
      <Group>
        <IconButton
          rounded={"full"}
          onClick={handleAsk}
          size={"xs"}
          disabled={disabled}
        >
          <TbArrowUp />
        </IconButton>
      </Group>
    </Group>
  );
}

function SourceLink({ link }: { link: { url: string; title: string | null } }) {
  return (
    <Link
      borderBottom={"1px solid"}
      borderColor={"brand.outline"}
      _last={{ borderBottom: "none" }}
      _hover={{
        bg: "brand.gray.100",
      }}
      transition={"background-color 100ms ease-in-out"}
      variant={"plain"}
      href={link.url}
      target="_blank"
      textDecoration={"none"}
      outline={"none"}
    >
      <Stack px={4} py={3} w="full">
        <Group justify={"space-between"} w="full">
          <Stack gap={0}>
            <Text fontSize={"xs"} lineClamp={1}>
              {link.title}
            </Text>
            <Text fontSize={"xs"} opacity={0.5} lineClamp={1}>
              {link.url}
            </Text>
          </Stack>
          <Box>
            <TbChevronRight />
          </Box>
        </Group>
      </Stack>
    </Link>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <Stack
      borderTop={"1px solid"}
      borderColor={"brand.outline"}
      className="user-message"
      p={4}
      pb={0}
    >
      <Text fontSize={"2xl"} fontWeight={"bolder"} opacity={0.8}>
        {content}
      </Text>
    </Stack>
  );
}

function AssistantMessage({
  content,
  links,
}: {
  content: string;
  links: { url: string; title: string | null }[];
}) {
  return (
    <Stack>
      <Stack p={4} pt={0}>
        <MarkdownProse>{content}</MarkdownProse>
      </Stack>
      {links.length > 0 && (
        <Stack borderTop="1px solid" borderColor={"brand.outline"} gap={0}>
          {links.map((link, index) => (
            <SourceLink key={index} link={link} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function NoMessages({ scrape }: { scrape: Scrape }) {
  return (
    <Stack p={4} justify={"center"} align={"center"} h="full" gap={4}>
      <Text opacity={0.5}>
        <TbMessage size={"60px"} />
      </Text>
      <Heading size={"2xl"} px={4} textAlign={"center"}>
        {scrape.title}
      </Heading>
    </Stack>
  );
}

function LoadingMessage() {
  return (
    <Stack p={4}>
      <Skeleton h={"20px"} w={"100%"} />
      <Skeleton h={"20px"} w={"100%"} />
      <Skeleton h={"20px"} w={"60%"} />
    </Stack>
  );
}

export default function ScrapeWidget({
  thread,
  scrape,
  userToken,
  onBgClick,
}: {
  thread: Thread;
  scrape: Scrape;
  userToken: string;
  onBgClick?: () => void;
}) {
  const chat = useScrapeChat({
    token: userToken,
    scrapeId: scrape.id,
    defaultMessages: thread.messages,
    threadId: thread.id,
  });

  useEffect(function () {
    chat.connect();
    return () => chat.disconnect();
  }, []);

  useEffect(
    function () {
      scroll();
    },
    [chat.messages]
  );

  async function handleAsk(query: string) {
    chat.ask(query);
    await scroll();
  }

  async function scroll() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const message = document.querySelectorAll(`.user-message`);
    if (message) {
      message[message.length - 1]?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleBgClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onBgClick?.();
    }
  }

  const messages = chat.allMessages();

  return (
    <Center h="full" onClick={handleBgClick} p={4}>
      <Stack
        border="1px solid"
        borderColor={"brand.outline"}
        rounded={"xl"}
        boxShadow={"rgba(100, 100, 111, 0.2) 0px 7px 29px 0px"}
        bg="brand.white"
        w={"full"}
        maxW={"500px"}
        h="full"
        maxH={"500px"}
        overflow={"hidden"}
        gap={0}
      >
        <Stack flex="1" overflow={"auto"} gap={0}>
          {messages.length === 0 && <NoMessages scrape={scrape} />}
          {messages.map((message, index) => (
            <Stack key={index}>
              {message.role === "user" ? (
                <UserMessage content={message.content} />
              ) : (
                <AssistantMessage
                  content={message.content}
                  links={message.links}
                />
              )}
              {chat.askStage === "asked" && index === messages.length - 1 && (
                <LoadingMessage />
              )}
              {chat.askStage !== "idle" && index === messages.length - 1 && (
                <Box h="500px" w="full" />
              )}
            </Stack>
          ))}
        </Stack>
        <ChatInput onAsk={handleAsk} stage={chat.askStage} />
      </Stack>
    </Center>
  );
}
