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
  TbChevronDown,
  TbChevronRight,
  TbChevronUp,
  TbEraser,
  TbHelp,
  TbMessage,
  TbPin,
  TbRefresh,
  TbTrash,
} from "react-icons/tb";
import { useScrapeChat, type AskStage } from "~/widget/use-chat";
import { MarkdownProse } from "~/widget/markdown-prose";
import { InputGroup } from "~/components/ui/input-group";
import { Tooltip } from "~/components/ui/tooltip";
import {
  MenuContent,
  MenuItem,
  MenuItemGroup,
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
  onRefresh,
}: {
  content: string;
  links: MessageSourceLink[];
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const [more, setMore] = useState(false);
  const [uniqueLinks, moreLinks, hasMore] = useMemo(() => {
    let updatedLinks = links.filter(
      (link, index, self) => index === self.findIndex((t) => t.url === link.url)
    );
    updatedLinks.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const cited = content.match(/\!\!([0-9]*)!!/g);
    if (cited) {
      const indexes = cited.map((c) => parseInt(c.replace(/\!\!|!!/g, "")));
      updatedLinks = updatedLinks.filter((_, index) => indexes.includes(index));
    }

    const minLinks = 4;
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
        <MarkdownProse
          sources={links.map((link) => ({
            title: link?.title ?? link?.url ?? "Source",
            url: link?.url ?? undefined,
          }))}
        >
          {content}
        </MarkdownProse>
        <Group pb={uniqueLinks.length === 0 ? 4 : 0}>
          <Tooltip content="Pin message" showArrow>
            <IconButton
              size={"xs"}
              rounded={"full"}
              variant={pinned ? "solid" : "subtle"}
              onClick={pinned ? onUnpin : onPin}
            >
              <TbPin />
            </IconButton>
          </Tooltip>
          <Tooltip content="Delete message" showArrow>
            <IconButton
              size={"xs"}
              rounded={"full"}
              variant={"subtle"}
              onClick={onDelete}
            >
              <TbTrash />
            </IconButton>
          </Tooltip>
          <Tooltip content="Regenerate message" showArrow>
            <IconButton
              size={"xs"}
              rounded={"full"}
              variant={"subtle"}
              onClick={onRefresh}
            >
              <TbRefresh />
            </IconButton>
          </Tooltip>
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
                {more ? <TbChevronUp /> : <TbChevronDown />}
                {more ? "Show less" : moreLinks.length + " more"}
              </Button>
            </Flex>
          )}
        </Stack>
      )}
    </Stack>
  );
}

function NoMessages({
  scrape,
  onQuestionClick,
}: {
  scrape: Scrape;
  onQuestionClick: (question: string) => void;
}) {
  const shouldShowDefaultTitle = !scrape.widgetConfig?.welcomeMessage;
  return (
    <Stack p={4} justify={"center"} align={"center"} h="full" gap={4}>
      {shouldShowDefaultTitle && (
        <Stack align={"center"} mb={8}>
          <Text opacity={0.5}>
            <TbMessage size={"60px"} />
          </Text>
          <Heading size={"2xl"} px={4} textAlign={"center"}>
            {scrape.title}
          </Heading>
        </Stack>
      )}

      {scrape.widgetConfig?.welcomeMessage && (
        <Stack w="full" maxW={"400px"}>
          <MarkdownProse>{scrape.widgetConfig?.welcomeMessage}</MarkdownProse>
        </Stack>
      )}

      {scrape.widgetConfig?.questions &&
        scrape.widgetConfig.questions.length > 0 && (
          <Stack w="full" maxW={"400px"}>
            <Heading size={"xs"} opacity={0.5}>
              QUICK QUESTIONS
            </Heading>
            <Stack w="full">
              {scrape.widgetConfig?.questions.map((question, i) => (
                <Group
                  key={i}
                  border={"1px solid"}
                  borderColor={"brand.outline"}
                  rounded={"md"}
                  p={2}
                  px={3}
                  w="full"
                  _hover={{
                    bg: "brand.gray.100",
                  }}
                  transition={"background-color 200ms ease-in-out"}
                  cursor={"pointer"}
                  alignItems={"flex-start"}
                  onClick={() => onQuestionClick(question.text)}
                >
                  <Box mt={1}>
                    <TbHelp />
                  </Box>
                  <Text>{question.text}</Text>
                </Group>
              ))}
            </Stack>
          </Stack>
        )}
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
  onPinSelect: (id: string) => void;
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

  function handlePinSelect(id: string) {
    onPinSelect(id);
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
              <MenuItemGroup title="Pinned messages">
                {messages
                  .filter((m) => m.pinnedAt)
                  .map((message) => (
                    <MenuItem value={message.id}>
                      {(message.llmMessage as any)?.content}
                    </MenuItem>
                  ))}
              </MenuItemGroup>
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
  messages,
  scrape,
  userToken,
  onBgClick,
  onPin,
  onUnpin,
  onErase,
  onDelete,
}: {
  thread: Thread;
  messages: Message[];
  scrape: Scrape;
  userToken: string;
  onBgClick?: () => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onErase: () => void;
  onDelete: (ids: string[]) => void;
}) {
  const chat = useScrapeChat({
    token: userToken,
    scrapeId: scrape.id,
    defaultMessages: messages,
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

  function handlePin(id: string) {
    onPin(id);
    chat.pinMessage(id);
  }

  function handleUnpin(id: string) {
    onUnpin(id);
    chat.unpinMessage(id);
  }

  function handleErase() {
    onErase();
    chat.erase();
  }

  function handlePinSelect(id: string) {
    scroll(`#message-${id}`);
  }

  function handleDelete(ids: string[]) {
    onDelete(ids);
    chat.deleteMessage(ids);
  }

  async function handleRefresh(questionId: string, answerId: string) {
    const message = chat.getMessage(questionId);
    if (!message) return;

    onDelete([questionId, answerId]);
    chat.deleteMessage([questionId, answerId]);
    chat.ask((message.llmMessage as any).content as string);
    await scroll();
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
          {chat.allMessages.length === 0 && (
            <NoMessages scrape={scrape} onQuestionClick={handleAsk} />
          )}
          {chat.allMessages.map((message, index) => (
            <Stack key={index} id={`message-${message.id}`}>
              {message.role === "user" ? (
                <UserMessage content={message.content} />
              ) : (
                <AssistantMessage
                  content={message.content}
                  links={message.links}
                  pinned={chat.allMessages[index - 1]?.pinned}
                  onPin={() => handlePin(chat.allMessages[index - 1]?.id)}
                  onUnpin={() => handleUnpin(chat.allMessages[index - 1]?.id)}
                  onDelete={() =>
                    handleDelete([chat.allMessages[index - 1]?.id, message.id])
                  }
                  onRefresh={() =>
                    handleRefresh(chat.allMessages[index - 1]?.id, message.id)
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
