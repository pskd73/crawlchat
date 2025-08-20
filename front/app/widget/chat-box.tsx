import {
  Accordion,
  Badge,
  Box,
  Flex,
  Group,
  Heading,
  Icon,
  IconButton,
  Input,
  Link,
  Skeleton,
  Textarea,
} from "@chakra-ui/react";
import { Stack, Text } from "@chakra-ui/react";
import type { MessageSourceLink, MessageRating, WidgetSize } from "libs/prisma";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  TbArrowUp,
  TbHelp,
  TbMessage,
  TbRefresh,
  TbRobotFace,
  TbPointer,
  TbThumbUp,
  TbThumbDown,
  TbShare2,
  TbX,
  TbTicket,
  TbArrowRight,
  TbMenu,
  TbTrash,
  TbFileDescription,
  TbChevronDown,
  TbChevronUp,
  TbCopy,
  TbCheck,
} from "react-icons/tb";
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
import { extractCitations } from "libs/citation";
import { Button } from "~/components/ui/button";
import { makeCursorMcpJson, makeMcpCommand, makeMcpName } from "~/mcp/setup";
import { getScoreColor } from "~/score";
import { Field } from "~/components/ui/field";
import { toaster } from "~/components/ui/toaster";
import { useChatBoxContext } from "./use-chat-box";

export function useChatBoxDimensions(
  size: WidgetSize | null,
  ref: React.RefObject<HTMLDivElement | null>
) {
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);

  function getDimensionsForSize(width: number, height: number) {
    const padding = 32;
    width -= padding * 2;
    height -= padding * 2;

    switch (size) {
      case "large":
        width = Math.min(width, 700);
        height = Math.min(height, 600);
        return { width: width, height: height };
      default:
        width = Math.min(width, 520);
        height = Math.min(height, 460);
        return { width: width, height: height };
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const dims = getDimensionsForSize(rect.width, rect.height);
        setWidth(dims.width);
        setHeight(dims.height);
      }
    };
    window.addEventListener("resize", handleResize);

    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { width, height };
}

function ChatInput() {
  const { ask, chat, screen, readOnly, scrape, inputRef, embed } =
    useChatBoxContext();

  const [query, setQuery] = useState("");
  const [height, setHeight] = useState(60);
  const cleanedQuery = useMemo(() => {
    return query.trim();
  }, [query]);

  useEffect(adjustHeight, [query]);

  useEffect(
    function () {
      const handleOnMessage = (event: MessageEvent) => {
        if (event.data === "focus") {
          inputRef.current?.focus();
        }
      };

      if (!embed) {
        inputRef.current?.focus();
      }

      window.addEventListener("message", handleOnMessage);
      return () => {
        window.removeEventListener("message", handleOnMessage);
      };
    },
    [embed]
  );

  function handleAsk() {
    if (!cleanedQuery.length) return;
    ask(query);
    setQuery("");
    track("chat_ask", { query });
  }

  function getPlaceholder() {
    switch (chat.askStage) {
      case "asked":
        return "😇 Thinking...";
      case "answering":
        return "🤓 Answering...";
      case "searching":
        return `🔍 Searching for "${chat.searchQuery ?? "answer"}"`;
      case "action-call":
        return `🤖 Doing "${chat.actionCall}"`;
    }
    return scrape.widgetConfig?.textInputPlaceholder ?? "Ask your question";
  }

  function adjustHeight() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) {
      setHeight(rect.height + 36);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      handleAsk();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  const isDisabled = screen !== "chat" || readOnly || chat.askStage !== "idle";

  return (
    <Group
      h={`${height}px`}
      borderTop={"1px solid"}
      borderColor={"brand.outline"}
      justify={"space-between"}
      p={4}
    >
      <Group flex={1}>
        <InputGroup flex="1">
          <Textarea
            ref={inputRef}
            placeholder={getPlaceholder()}
            truncate={!query}
            size={"xl"}
            p={0}
            outline={"none"}
            border="none"
            fontSize={"lg"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={1}
            autoresize
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            maxHeight={"240px"}
            overflowY={"auto"}
          />
        </InputGroup>
      </Group>
      <Group>
        <IconButton
          rounded={"full"}
          onClick={handleAsk}
          size={"xs"}
          disabled={isDisabled}
          variant={cleanedQuery.length > 0 ? "solid" : "subtle"}
        >
          <TbArrowUp />
        </IconButton>
      </Group>
    </Group>
  );
}

export function SourceLink({
  link,
  index,
}: {
  link: MessageSourceLink;
  index: number;
}) {
  return (
    <Link
      transition={"all 200ms ease-in-out"}
      href={link.url ?? undefined}
      cursor={!link.url ? "default" : "pointer"}
      target="_blank"
      textDecoration={"none"}
      outline={"none"}
      opacity={0.6}
      _hover={{
        opacity: 1,
      }}
      w="fit"
      fontSize={"sm"}
      className="group"
    >
      <TbFileDescription />
      {link.title}
      {link.url && (
        <Icon display={"none"} _groupHover={{ display: "inline-block" }}>
          <TbArrowRight />
        </Icon>
      )}
    </Link>
  );
}

export function Resolved({
  onRate,
}: {
  onRate: (rating: MessageRating) => void;
}) {
  const { scrape, setScreen } = useChatBoxContext();
  const [view, setView] = useState<"default" | "yes" | "no">("default");

  function resolved(resolved: boolean | null) {
    if (resolved === false) {
      if (scrape.resolveNoConfig?.link) {
        window.open(scrape.resolveNoConfig.link, "_blank");
      } else {
        setScreen("ticket-create");
      }
    } else if (resolved === true) {
      if (scrape.resolveYesConfig?.link) {
        window.open(scrape.resolveYesConfig.link, "_blank");
      }
    }
  }

  function handleYes() {
    if (scrape.resolveYesConfig) {
      return setView("yes");
    }
    resolved(true);
    onRate("up");
  }

  function handleNo() {
    if (scrape.resolveNoConfig) {
      return setView("no");
    }
    resolved(false);
    onRate("down");
  }

  function handleCancel() {
    if (view !== "default") {
      return setView("default");
    }
    resolved(null);
    onRate("none");
  }

  function getTitleDescription() {
    if (view === "yes") {
      return [
        scrape.resolveYesConfig?.title,
        scrape.resolveYesConfig?.description,
      ];
    }
    if (view === "no") {
      return [
        scrape.resolveNoConfig?.title,
        scrape.resolveNoConfig?.description,
      ];
    }
    return [
      scrape.resolveQuestion || "Issue solved?",
      scrape.resolveDescription || "Confirm if your issue is solved.",
    ];
  }

  const [title, description] = getTitleDescription();

  return (
    <Stack borderBottom={"1px solid"} borderColor={"brand.outline"}>
      <Stack px={4} py={3} w="full">
        <Group justify={"space-between"} w="full">
          <Stack gap={0}>
            <Text fontSize={"xs"} lineClamp={1}>
              {title}
            </Text>
            <Text fontSize={"xs"} opacity={0.5} lineClamp={1}>
              {description}
            </Text>
          </Stack>
          <Group>
            {view === "default" && (
              <Button size={"xs"} variant={"outline"} onClick={handleYes}>
                <TbThumbUp /> Yes
              </Button>
            )}
            {view === "default" && (
              <Button size={"xs"} variant={"subtle"} onClick={handleNo}>
                <TbThumbDown /> No
              </Button>
            )}
            {view === "yes" && (
              <Button
                size={"xs"}
                onClick={() => resolved(true)}
                variant={"outline"}
              >
                {scrape.resolveYesConfig?.btnLabel || "Go"}
                <TbArrowRight />
              </Button>
            )}
            {view === "no" && (
              <Button
                size={"xs"}
                onClick={() => resolved(false)}
                variant={"outline"}
              >
                {scrape.resolveNoConfig?.btnLabel || "Go"}
                <TbArrowRight />
              </Button>
            )}

            <IconButton size={"xs"} variant={"subtle"} onClick={handleCancel}>
              <TbX />
            </IconButton>
          </Group>
        </Group>
      </Stack>
    </Stack>
  );
}

export function UserMessage({ content }: { content: string }) {
  return (
    <Stack className="user-message">
      <Text
        fontSize={"xl"}
        fontWeight={"bolder"}
        opacity={0.8}
        whiteSpace={"pre-wrap"}
      >
        {content}
      </Text>
    </Stack>
  );
}

export function Sources({
  citation,
}: {
  citation: ReturnType<typeof extractCitations>;
}) {
  const [showSources, setShowSources] = useState(false);
  const citedLinks = Object.entries(citation.citedLinks)
    .filter(([_, link]) => link)
    .map(([index, link]) => ({
      index: Number(index),
      link,
    }));

  if (citedLinks.length === 0) {
    return null;
  }

  return (
    <Stack mb={showSources ? 2 : 0}>
      <Group
        opacity={showSources ? 1 : 0.5}
        _hover={{
          opacity: 1,
        }}
        cursor={"pointer"}
        fontSize={"sm"}
        transition={"opacity 200ms ease-in-out"}
        onClick={() => setShowSources(!showSources)}
      >
        <Text>
          {citedLinks.length} Source{citedLinks.length > 1 ? "s" : ""}
        </Text>
        {showSources ? <TbChevronUp /> : <TbChevronDown />}
      </Group>

      {showSources &&
        citedLinks.map(({ index, link }) => (
          <SourceLink key={index} link={link} index={index} />
        ))}
    </Stack>
  );
}

export function MessageCopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Tooltip content="Copy" showArrow>
      <IconButton
        size={"xs"}
        rounded={"full"}
        variant={"subtle"}
        onClick={handleCopy}
        disabled={copied}
      >
        {copied ? <TbCheck /> : <TbCopy />}
      </IconButton>
    </Tooltip>
  );
}

export function AssistantMessage({
  id,
  questionId,
  content,
  links,
  rating,
  last,
  pullUp,
}: {
  id: string;
  questionId: string;
  content: string;
  links: MessageSourceLink[];
  rating: MessageRating | null;
  last: boolean;
  pullUp: boolean;
}) {
  const {
    refresh,
    rate,
    readOnly,
    admin,
    createTicket,
    ticketCreateFetcher,
    customerEmail,
    scrape,
  } = useChatBoxContext();
  const citation = useMemo(
    () => extractCitations(content, links),
    [content, links]
  );
  const score = useMemo(
    () => Math.max(...links.map((l) => l.score ?? 0), 0),
    [links]
  );
  const [currentRating, setCurrentRating] = useState<MessageRating | null>(
    rating
  );

  function handleRate(rating: MessageRating) {
    setCurrentRating(rating);
    if (rating !== currentRating) {
      track("chat_rate", { rating, messageId: id });
      rate(id, rating);
    }
  }

  return (
    <Stack mt={pullUp ? -6 : 0}>
      <Sources citation={citation} />

      <Stack gap={4}>
        <MarkdownProse
          size={scrape.widgetConfig?.size === "large" ? "lg" : "md"}
          sources={Object.values(citation.citedLinks).map((link) => ({
            title: link?.title ?? link?.url ?? "Source",
            url: link?.url ?? undefined,
          }))}
          options={{
            onTicketCreate: createTicket,
            ticketCreateLoading: ticketCreateFetcher.state !== "idle",
            disabled: readOnly,
            customerEmail,
          }}
        >
          {citation.content}
        </MarkdownProse>

        <Group>
          <MessageCopyButton content={content} />

          <Tooltip content="Refresh" showArrow>
            <IconButton
              size={"xs"}
              rounded={"full"}
              variant={"subtle"}
              onClick={() => refresh(questionId, id)}
              disabled={readOnly}
            >
              <TbRefresh />
            </IconButton>
          </Tooltip>

          <Tooltip content="Helpful" showArrow>
            <IconButton
              size={"xs"}
              rounded={"full"}
              variant={currentRating === "up" ? "solid" : "subtle"}
              onClick={() => handleRate("up")}
              disabled={readOnly}
            >
              <TbThumbUp />
            </IconButton>
          </Tooltip>

          <Tooltip content="Not helpful" showArrow>
            <IconButton
              size={"xs"}
              rounded={"full"}
              variant={currentRating === "down" ? "solid" : "subtle"}
              onClick={() => handleRate("down")}
              disabled={readOnly}
            >
              <TbThumbDown />
            </IconButton>
          </Tooltip>

          {admin && (
            <Tooltip content="Score of this message" showArrow>
              <Badge colorPalette={getScoreColor(score)} variant={"surface"}>
                {score.toFixed(2)}
              </Badge>
            </Tooltip>
          )}
        </Group>
      </Stack>

      {/* <Stack gap={0}>
        <Stack borderTop="1px solid" borderColor={"brand.outline"} gap={0}>
          {last && !readOnly && scrape.ticketingEnabled && !currentRating && (
            <Resolved onRate={handleRate} />
          )}
        </Stack>
      </Stack> */}
    </Stack>
  );
}

function NoMessages() {
  const { ask, scrape } = useChatBoxContext();

  return (
    <Stack p={4} gap={4} flex={1}>
      <Stack w="full">
        <MarkdownProse size="lg">
          {scrape.widgetConfig?.welcomeMessage ||
            "Ask your queries here. Remember, I am an AI assistant and refer to the sources to confirm the answer."}
        </MarkdownProse>
      </Stack>

      {scrape.widgetConfig?.questions &&
        scrape.widgetConfig.questions.length > 0 && (
          <Stack w="full">
            <Heading size={"xs"} opacity={0.5}>
              QUICK QUESTIONS
            </Heading>
            <Stack w="full">
              {scrape.widgetConfig?.questions
                .filter((q) => q.text)
                .map((question, i) => (
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
                    onClick={() => ask(question.text)}
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
    <Stack>
      <Skeleton h={"20px"} w={"100%"} />
      <Skeleton h={"20px"} w={"100%"} />
      <Skeleton h={"20px"} w={"60%"} />
    </Stack>
  );
}

function MCPSetup() {
  const { scrape } = useChatBoxContext();
  const [section, setSection] = useState<string>("mcp-command");
  const sections = useMemo(
    () => [
      {
        value: "mcp-command",
        icon: <TbRobotFace />,
        title: "MCP Command",
        script: makeMcpCommand(scrape.id, makeMcpName(scrape)),
        language: "sh",
      },
      {
        value: "stats",
        icon: <TbPointer />,
        title: "Cursor",
        script: makeCursorMcpJson(scrape.id, makeMcpName(scrape)),
        language: "json",
      },
    ],
    [scrape]
  );

  return (
    <Stack h="full" p={4}>
      <Stack align={"center"}>
        <Stack w="full" gap={8}>
          <Stack>
            <Heading>
              <Group>
                <TbRobotFace />
                <Text>Setup MCP client</Text>
              </Group>
            </Heading>
            <Text opacity={0.5} fontSize={"sm"}>
              <Text as="span" fontWeight={"bold"}>
                Model Context Protocol
              </Text>{" "}
              is a standard way for AI apps to extend the ability to do custom
              actions. You can also use your own AI applications to interact
              with the documentation such as Cursor, Windsurf, Claude or ever
              growing list.
            </Text>
          </Stack>
          <Stack>
            <Group justify={"end"}>
              <Link
                fontSize={"sm"}
                href="https://guides.crawlchat.app/walkthrough/67db0080600010f091e529b7/read"
                target="_blank"
              >
                <TbHelp /> Help
              </Link>
            </Group>
            <Accordion.Root
              value={[section]}
              onValueChange={(e) => setSection(e.value[0])}
              variant={"enclosed"}
            >
              {sections.map((item) => (
                <Accordion.Item key={item.value} value={item.value}>
                  <Accordion.ItemTrigger>
                    <Group justify={"space-between"} w="full">
                      <Group>
                        <Icon fontSize="lg" color="fg.subtle">
                          {item.icon}
                        </Icon>
                        <Text>{item.title}</Text>
                      </Group>

                      <Group></Group>
                    </Group>
                  </Accordion.ItemTrigger>
                  <Accordion.ItemContent>
                    <Accordion.ItemBody>
                      <MarkdownProse noMarginCode>
                        {`\`\`\`${item.language}\n${item.script}\n\`\`\``}
                      </MarkdownProse>
                    </Accordion.ItemBody>
                  </Accordion.ItemContent>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}

function Toolbar() {
  const {
    chat,
    erase,
    thread,
    screen,
    setScreen,
    overallScore,
    scrape,
    admin,
    fullscreen,
    close,
  } = useChatBoxContext();
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  function handleShare() {
    navigator.clipboard.writeText(`${window.location.origin}/s/${thread?.id}`);
    toaster.create({
      title: "Copied!",
      description: "Share link copied to clipboard",
    });
  }

  function handleMenuSelect(value: string) {
    if (value === "clear") {
      return erase();
    }
    if (value === "share") {
      return handleShare();
    }
    if (value === "mcp") {
      return setScreen("mcp");
    }
  }

  return (
    <Group
      h="60px"
      borderBottom={"1px solid"}
      borderColor={"brand.outline/50"}
      p={4}
      w={"full"}
      justify={"space-between"}
      bg="brand.gray.50/50"
    >
      <Group flex="1">
        <Group w="full">
          {fullscreen && (
            <IconButton size={"xs"} variant={"subtle"} onClick={() => close()}>
              <TbX />
            </IconButton>
          )}
          {scrape.widgetConfig?.logoUrl && (
            <img
              src={scrape.widgetConfig.logoUrl}
              alt="Logo"
              style={{ maxWidth: "24px", maxHeight: "24px" }}
            />
          )}
          <Stack gap={0.6}>
            <Text fontWeight={"bold"} lineHeight={1} fontSize={"xl"}>
              {screen === "ticket-create"
                ? "Create support ticket"
                : scrape.title ?? "Ask AI"}
            </Text>
          </Stack>
          {admin &&
            overallScore !== undefined &&
            Number.isFinite(overallScore) && (
              <Tooltip content="Avg score of all messages" showArrow>
                <Badge
                  colorPalette={getScoreColor(overallScore)}
                  variant={"surface"}
                >
                  {overallScore.toFixed(2)}
                </Badge>
              </Tooltip>
            )}
        </Group>
      </Group>
      <Group>
        {screen === "mcp" && (
          <Button
            size={"xs"}
            variant={"subtle"}
            onClick={() => setScreen("chat")}
          >
            Switch to chat
            <TbMessage />
          </Button>
        )}

        {chat.allMessages.length > 0 && (
          <Tooltip content="Clear & start new conversation" showArrow>
            <IconButton size={"xs"} variant={"ghost"} onClick={() => erase()}>
              <TbTrash />
            </IconButton>
          </Tooltip>
        )}

        <MenuRoot
          positioning={{ placement: "bottom-end" }}
          onSelect={(e) => handleMenuSelect(e.value)}
        >
          <MenuTrigger asChild>
            <IconButton size={"xs"} variant={"subtle"}>
              <TbMenu />
            </IconButton>
          </MenuTrigger>
          <MenuContent>
            <MenuItem value={"share"}>
              <TbShare2 />
              Share chat
            </MenuItem>

            {(scrape.widgetConfig?.showMcpSetup ?? true) && (
              <MenuItem value={"mcp"}>
                <TbRobotFace />
                As MCP
              </MenuItem>
            )}
          </MenuContent>
        </MenuRoot>
      </Group>
    </Group>
  );
}

function TicketCreate() {
  const {
    cancelTicketCreate,
    createTicket,
    ticketCreateFetcher,
    customerEmail,
  } = useChatBoxContext();
  const [email, setEmail] = useState(customerEmail ?? "");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");

  function handleSubmit() {
    createTicket(email, title, message);
  }

  const loading = ticketCreateFetcher.state !== "idle";

  return (
    <Stack p={4} flex="1">
      <Stack flex="1">
        <Text opacity={0.5} mb={4}>
          Our team will work on the issue and get back with a resolution. We'll
          send you an email with a link to the ticket.
        </Text>
        <Field label="Email">
          <Input
            type="email"
            placeholder="youremail@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || !!customerEmail}
          />
        </Field>
        <Field label="Title">
          <Input
            type="text"
            placeholder="Title of your issue"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </Field>
        <Field label="Message">
          <Textarea
            placeholder="Explain your issue in detail"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
          />
        </Field>
        <Text opacity={0.5} mb={4}>
          This chat will be turned into a ticket and you cannot continue the AI
          help on the same thread. A new thread will be created for you.
        </Text>
      </Stack>
      <Group justify={"flex-end"}>
        <Button
          variant={"subtle"}
          onClick={cancelTicketCreate}
          disabled={loading}
        >
          Cancel
          <TbX />
        </Button>
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!email || !title || !message}
        >
          Create ticket
          <TbTicket />
        </Button>
      </Group>
    </Stack>
  );
}

function PoweredBy() {
  const { titleSlug } = useChatBoxContext();

  return (
    <Text fontSize={"xs"}>
      <Text as="span" opacity={0.4}>
        Powered by{" "}
      </Text>
      <Link
        href={`https://crawlchat.app?ref=powered-by-${titleSlug}`}
        target="_blank"
        color={"brand.fg"}
      >
        CrawlChat
      </Link>
    </Text>
  );
}

export function ChatboxContainer({
  children,
  width,
  height,
}: {
  children: React.ReactNode;
  width?: string | null;
  height?: string | null;
}) {
  const { close, scrape } = useChatBoxContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const boxDimensions = useChatBoxDimensions(
    scrape.widgetConfig?.size ?? null,
    containerRef
  );

  function handleBgClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  const cover = width || height;

  return (
    <Flex
      w="full"
      h="full"
      onClick={handleBgClick}
      ref={containerRef}
      justify={cover ? "flex-start" : "center"}
      align={cover ? "flex-start" : "center"}
    >
      <Stack
        border={cover ? "none" : "1px solid"}
        borderWidth={[0, cover ? 0 : 1]}
        borderColor={"brand.outline"}
        rounded={["none", cover ? "none" : "xl"]}
        boxShadow={cover ? "none" : "rgba(100, 100, 111, 0.2) 0px 7px 29px 0px"}
        bg="brand.white"
        gap={0}
        position={"relative"}
        overflow={"hidden"}
        w={["full", "full", boxDimensions.width]}
        h={["full", "full", "auto"]}
        maxH={["full", "full", boxDimensions.height]}
      >
        {children}
      </Stack>
    </Flex>
  );
}

export default function ScrapeWidget() {
  const { screen, chat } = useChatBoxContext();

  return (
    <>
      <Toolbar />
      <Stack flex="1" overflow={"auto"} gap={0}>
        {screen === "chat" && (
          <>
            {chat.allMessages.length === 0 && <NoMessages />}
            {chat.allMessages.map((message, index) => (
              <Stack
                key={index}
                id={`message-${message.id}`}
                borderTop={message.role === "user" ? "1px solid" : "none"}
                borderColor={"brand.outline"}
                _first={{
                  borderTop: "none",
                }}
                p={4}
                className="message"
              >
                {message.role === "user" ? (
                  <UserMessage content={message.content} />
                ) : (
                  <AssistantMessage
                    id={message.id}
                    questionId={chat.allMessages[index - 1]?.id}
                    content={message.content}
                    links={message.links}
                    rating={message.rating}
                    last={index === chat.allMessages.length - 1}
                    pullUp={chat.allMessages[index - 1]?.role === "user"}
                  />
                )}
                {(chat.askStage === "asked" ||
                  chat.askStage === "searching" ||
                  chat.askStage === "action-call") &&
                  index === chat.allMessages.length - 1 && <LoadingMessage />}
                {chat.askStage !== "idle" &&
                  index === chat.allMessages.length - 1 && (
                    <Box h={"2000px"} w="full" />
                  )}
              </Stack>
            ))}
          </>
        )}
        {screen === "mcp" && <MCPSetup />}
        {screen === "ticket-create" && <TicketCreate />}
      </Stack>
      {screen === "chat" && <ChatInput />}
      <Group
        px={4}
        py={2}
        bg="brand.gray.50/50"
        borderTop={"1px solid"}
        borderColor={"brand.outline/50"}
      >
        <PoweredBy />
      </Group>
    </>
  );
}
