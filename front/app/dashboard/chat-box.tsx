import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Group,
  Heading,
  IconButton,
  Input,
  Kbd,
  Link,
  Skeleton,
} from "@chakra-ui/react";
import { Stack, Text } from "@chakra-ui/react";
import type { Message, MessageSourceLink, Scrape, Thread } from "libs/prisma";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  TbArrowUp,
  TbChevronRight,
  TbEraser,
  TbMessage,
  TbPin,
  TbTrash,
} from "react-icons/tb";
import { useScrapeChat, type AskStage } from "~/widget/use-chat";
import { MarkdownProse } from "~/widget/markdown-prose";
import { InputGroup } from "~/components/ui/input-group";
import { Tooltip } from "~/components/ui/tooltip";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from "~/components/ui/menu";
import { track } from "~/pirsch";
import { Link as RouterLink } from "react-router";

function ChatInput({
  onAsk,
  stage,
  searchQuery,
}: {
  onAsk: (query: string) => void;
  stage: AskStage;
  searchQuery?: string;
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !inputRef.current?.matches(":focus")) {
        inputRef.current?.focus();
      }
    };

    window.addEventListener("message", handleOnMessage);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("message", handleOnMessage);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleAsk() {
    onAsk(query);
    track("chat_ask", { query });
    setQuery("");
  }

  function getPlaceholder() {
    switch (stage) {
      case "asked":
        return "😇 Thinking...";
      case "answering":
        return "🤓 Answering...";
      case "searching":
        return `🔍 Searching for "${searchQuery ?? "answer"}"`;
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
        <InputGroup flex="1" endElement={<Kbd>⏎</Kbd>}>
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
        </InputGroup>
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

function SourceLink({ link }: { link: MessageSourceLink }) {
  return (
    <Link
      borderBottom={"1px solid"}
      borderColor={"brand.outline"}
      _hover={{
        bg: "brand.gray.100",
      }}
      transition={"background-color 100ms ease-in-out"}
      variant={"plain"}
      href={link.url ?? undefined}
      target="_blank"
      textDecoration={"none"}
      outline={"none"}
    >
      <Stack px={4} py={3} w="full">
        <Group justify={"space-between"} w="full">
          <Stack gap={0}>
            <Text fontSize={"xs"} lineClamp={1} data-score={link.score}>
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
  pinned,
  onPin,
  onUnpin,
  onDelete,
}: {
  content: string;
  links: MessageSourceLink[];
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onDelete: () => void;
}) {
  const [more, setMore] = useState(false);
  const [uniqueLinks, moreLinks, hasMore] = useMemo(() => {
    let updatedLinks = links.filter(
      (link, index, self) => index === self.findIndex((t) => t.url === link.url)
    );
    updatedLinks.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const minLinks = 2;
    const linksToShow = more ? updatedLinks.length : minLinks;

    return [
      updatedLinks.slice(0, linksToShow),
      updatedLinks.slice(linksToShow),
      updatedLinks.length > minLinks,
    ];
  }, [links, more]);

  return (
    <Stack>
      <Stack px={4} gap={0}>
        <MarkdownProse>{content}</MarkdownProse>
        <Group>
          <IconButton
            size={"xs"}
            rounded={"full"}
            variant={pinned ? "solid" : "subtle"}
            onClick={pinned ? onUnpin : onPin}
          >
            <TbPin />
          </IconButton>
          <IconButton
            size={"xs"}
            rounded={"full"}
            variant={"subtle"}
            onClick={onDelete}
          >
            <TbTrash />
          </IconButton>
        </Group>
      </Stack>
      {uniqueLinks.length > 0 && (
        <Stack gap={0}>
          <Stack borderTop="1px solid" borderColor={"brand.outline"} gap={0}>
            {uniqueLinks.map((link, index) => (
              <SourceLink key={index} link={link} />
            ))}
          </Stack>

          {hasMore && (
            <Flex px={4} py={2}>
              <Button
                variant={"subtle"}
                size={"xs"}
                onClick={() => setMore(!more)}
              >
                {more ? "Show less" : "+" + moreLinks.length + " more"}
              </Button>
            </Flex>
          )}
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

function Toolbar({
  messages,
  onErase,
  onPinSelect,
}: {
  messages: Message[];
  onErase: () => void;
  onPinSelect: (uuid: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pinnedCount = useMemo(() => {
    return messages.filter((message) => message.pinnedAt).length;
  }, [messages]);

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

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onErase();
  }

  function handlePinSelect(uuid: string) {
    onPinSelect(uuid);
  }

  return (
    <Group
      h="60px"
      borderBottom={"1px solid"}
      borderColor={"brand.outline"}
      p={4}
      w={"full"}
      justify={"space-between"}
    >
      <Group>
        <Group></Group>
      </Group>
      <Group>
        <Text fontSize={"xs"} opacity={0.5}>
          Powered by{" "}
          <Link asChild target="_blank" fontWeight={"bold"}>
            <RouterLink to="/">CrawlChat</RouterLink>
          </Link>
        </Text>
        {pinnedCount > 0 && (
          <MenuRoot
            positioning={{ placement: "bottom-end" }}
            onSelect={(e) => handlePinSelect(e.value)}
          >
            <MenuTrigger asChild>
              <IconButton
                size={"xs"}
                rounded={"full"}
                variant={"subtle"}
                position={"relative"}
              >
                <TbPin />
                <Badge
                  ml="1"
                  colorScheme="red"
                  variant="solid"
                  borderRadius="full"
                  position={"absolute"}
                  top={-1}
                  right={-1}
                  size={"xs"}
                >
                  {pinnedCount}
                </Badge>
              </IconButton>
            </MenuTrigger>
            <MenuContent>
              {messages
                .filter((m) => m.pinnedAt)
                .map((message) => (
                  <MenuItem value={message.uuid}>
                    {(message.llmMessage as any)?.content}
                  </MenuItem>
                ))}
            </MenuContent>
          </MenuRoot>
        )}

        <Tooltip
          content={confirmDelete ? "Are you sure?" : "Clear chat"}
          open={confirmDelete}
          showArrow
        >
          <IconButton
            size={"xs"}
            rounded={"full"}
            variant={confirmDelete ? "solid" : "subtle"}
            colorPalette={confirmDelete ? "red" : undefined}
            onClick={handleDelete}
          >
            <TbEraser />
          </IconButton>
        </Tooltip>
      </Group>
    </Group>
  );
}

export default function ScrapeWidget({
  thread,
  scrape,
  userToken,
  onBgClick,
  onPin,
  onUnpin,
  onErase,
  onDelete,
}: {
  thread: Thread;
  scrape: Scrape;
  userToken: string;
  onBgClick?: () => void;
  onPin: (uuid: string) => void;
  onUnpin: (uuid: string) => void;
  onErase: () => void;
  onDelete: (uuids: string[]) => void;
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

  useEffect(function () {
    scroll();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onBgClick?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "focus") {
        scroll();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function handleAsk(query: string) {
    chat.ask(query);
    await scroll();
  }

  async function scroll(selector = ".user-message") {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const message = document.querySelectorAll(selector);
    if (message) {
      message[message.length - 1]?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleBgClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onBgClick?.();
    }
  }

  function getSize() {
    switch (scrape.widgetConfig?.size) {
      case "large":
        return { width: "800px", height: "800px" };
      case "full_screen":
        return { width: "100%", height: "100%" };
      default:
        return { width: "500px", height: "500px" };
    }
  }

  function handlePin(uuid: string) {
    onPin(uuid);
    chat.pinMessage(uuid);
  }

  function handleUnpin(uuid: string) {
    onUnpin(uuid);
    chat.unpinMessage(uuid);
  }

  function handleErase() {
    onErase();
    chat.erase();
  }

  function handlePinSelect(uuid: string) {
    scroll(`#message-${uuid}`);
  }

  function handleDelete(uuids: string[]) {
    onDelete(uuids);
    chat.deleteMessage(uuids);
  }

  const { width, height } = getSize();

  return (
    <Center h="full" onClick={handleBgClick} p={4}>
      <Stack
        border="1px solid"
        borderColor={"brand.outline"}
        rounded={"xl"}
        boxShadow={"rgba(100, 100, 111, 0.2) 0px 7px 29px 0px"}
        bg="brand.white"
        w={"full"}
        maxW={width}
        h="full"
        maxH={height}
        overflow={"hidden"}
        gap={0}
      >
        <Toolbar
          messages={chat.messages}
          onErase={handleErase}
          onPinSelect={handlePinSelect}
        />
        <Stack flex="1" overflow={"auto"} gap={0}>
          {chat.allMessages.length === 0 && <NoMessages scrape={scrape} />}
          {chat.allMessages.map((message, index) => (
            <Stack key={index} id={`message-${message.uuid}`}>
              {message.role === "user" ? (
                <UserMessage content={message.content} />
              ) : (
                <AssistantMessage
                  content={message.content}
                  links={message.links}
                  pinned={chat.allMessages[index - 1]?.pinned}
                  onPin={() => handlePin(chat.allMessages[index - 1]?.uuid)}
                  onUnpin={() => handleUnpin(chat.allMessages[index - 1]?.uuid)}
                  onDelete={() =>
                    handleDelete([
                      chat.allMessages[index - 1]?.uuid,
                      message.uuid,
                    ])
                  }
                />
              )}
              {(chat.askStage === "asked" || chat.askStage === "searching") &&
                index === chat.allMessages.length - 1 && <LoadingMessage />}
              {chat.askStage !== "idle" &&
                index === chat.allMessages.length - 1 && (
                  <Box h={"2000px"} w="full" />
                )}
            </Stack>
          ))}
        </Stack>
        <ChatInput
          onAsk={handleAsk}
          stage={chat.askStage}
          searchQuery={chat.searchQuery}
        />
      </Stack>
    </Center>
  );
}
