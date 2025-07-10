import {
  Accordion,
  Badge,
  Box,
  Center,
  Group,
  Heading,
  Icon,
  IconButton,
  Input,
  Link,
  Separator,
  Skeleton,
  Textarea,
} from "@chakra-ui/react";
import { Stack, Text } from "@chakra-ui/react";
import { useTheme } from "next-themes";
import type {
  Message,
  MessageSourceLink,
  MessageRating,
  Scrape,
  WidgetSize,
  ResolveBtnConfig,
} from "libs/prisma";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  TbArrowUp,
  TbChevronRight,
  TbEraser,
  TbHelp,
  TbMessage,
  TbPin,
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
import { extractCitations } from "libs/citation";
import { Button } from "~/components/ui/button";
import { makeCursorMcpJson, makeMcpCommand, makeMcpName } from "~/mcp/setup";
import { getScoreColor, getMessagesScore } from "~/score";
import { Field } from "~/components/ui/field";
import { toaster } from "~/components/ui/toaster";

function ChatInput({
  onAsk,
  stage,
  searchQuery,
  disabled,
  scrape,
  inputRef,
  embed,
}: {
  onAsk: (query: string) => void;
  stage: AskStage;
  searchQuery?: string;
  disabled?: boolean;
  scrape: Scrape;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  embed?: boolean;
}) {
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
    onAsk(query);
    setQuery("");
    track("chat_ask", { query });
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

  const isDisabled = disabled || stage !== "idle";

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
            overflow={"auto"}
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
      _last={{
        borderBottom: "none",
      }}
    >
      <Stack px={4} py={3} w="full">
        <Group justify={"space-between"} w="full">
          <Stack gap={0}>
            <Text fontSize={"xs"} lineClamp={1} data-score={link.score}>
              {link.title}
            </Text>
            <Text
              fontSize={"xs"}
              opacity={0.5}
              lineClamp={1}
              display={["none", "none", "block"]}
            >
              {link.url}
            </Text>
          </Stack>
          <Group>
            <Badge colorPalette={"brand"}>{index + 1}</Badge>
            <TbChevronRight />
          </Group>
        </Group>
      </Stack>
    </Link>
  );
}

export function Resolved({
  onNo,
  onYes,
  onCancel,
  resolveQuestion,
  resolveDescription,
  resolveYesConfig,
  resolveNoConfig,
}: {
  onNo: () => void;
  onYes: () => void;
  onCancel: () => void;
  resolveQuestion?: string;
  resolveDescription?: string;
  resolveYesConfig?: ResolveBtnConfig;
  resolveNoConfig?: ResolveBtnConfig;
}) {
  const [screen, setScreen] = useState<"default" | "yes" | "no">("default");

  function handleYes() {
    if (resolveYesConfig) {
      return setScreen("yes");
    }
    onYes();
  }

  function handleNo() {
    if (resolveNoConfig) {
      return setScreen("no");
    }
    onNo();
  }

  function handleCancel() {
    if (screen !== "default") {
      return setScreen("default");
    }
    onCancel();
  }

  function getTitleDescription() {
    if (screen === "yes") {
      return [resolveYesConfig?.title, resolveYesConfig?.description];
    }
    if (screen === "no") {
      return [resolveNoConfig?.title, resolveNoConfig?.description];
    }
    return [
      resolveQuestion || "Issue solved?",
      resolveDescription || "Confirm if your issue is solved.",
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
            {screen === "default" && (
              <Button size={"xs"} variant={"outline"} onClick={handleYes}>
                <TbThumbUp /> Yes
              </Button>
            )}
            {screen === "default" && (
              <Button size={"xs"} variant={"subtle"} onClick={handleNo}>
                <TbThumbDown /> No
              </Button>
            )}
            {screen === "yes" && (
              <Button size={"xs"} onClick={onYes} variant={"outline"}>
                {resolveYesConfig?.btnLabel || "Go"}
                <TbArrowRight />
              </Button>
            )}
            {screen === "no" && (
              <Button size={"xs"} onClick={onNo} variant={"outline"}>
                {resolveNoConfig?.btnLabel || "Go"}
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

function UserMessage({ content }: { content: string }) {
  return (
    <Stack className="user-message" p={4} pb={0}>
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

function AssistantMessage({
  id,
  content,
  links,
  pinned,
  rating,
  onPin,
  onUnpin,
  onDelete,
  onRefresh,
  onRate,
  size,
  disabled,
  showScore,
  onResolved,
  last,
  ticketingEnabled,
  resolveQuestion,
  resolveDescription,
  resolveYesConfig,
  resolveNoConfig,
  onTicketCreate,
  ticketCreateLoading,
  customerEmail,
}: {
  id: string;
  content: string;
  links: MessageSourceLink[];
  pinned: boolean;
  rating: MessageRating | null;
  onPin: () => void;
  onUnpin: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onRate: (rating: MessageRating) => void;
  size?: WidgetSize;
  disabled?: boolean;
  showScore?: boolean;
  onResolved: (messageId: string, resolved: boolean | null) => void;
  last: boolean;
  ticketingEnabled?: boolean;
  resolveQuestion?: string;
  resolveDescription?: string;
  resolveYesConfig?: ResolveBtnConfig;
  resolveNoConfig?: ResolveBtnConfig;
  onTicketCreate?: (title: string, description: string, email: string) => void;
  ticketCreateLoading?: boolean;
  customerEmail?: string;
}) {
  const [cleanedLinks, cleanedContent, score] = useMemo(() => {
    const citation = extractCitations(content, links, { cleanCitations: true });
    const score = Math.max(...links.map((l) => l.score ?? 0), 0);
    const uniqueLinks = links.filter(
      (link, index, self) => index === self.findIndex((t) => t.url === link.url)
    );
    const topLinks = uniqueLinks
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .splice(0, 4);
    return [topLinks, citation.content, score];
  }, [links]);
  const [currentRating, setCurrentRating] = useState<MessageRating | null>(
    rating
  );

  function handleRate(rating: MessageRating) {
    setCurrentRating(rating);
    if (rating !== currentRating) {
      track("chat_rate", { rating, messageId: id });
      onRate(rating);
    }
  }

  function handleResolved(resolved: boolean | null) {
    if (resolved === true) {
      handleRate("up");
    }
    if (resolved === false) {
      handleRate("down");
    }
    if (resolved === null) {
      handleRate("none");
    }
    onResolved(id, resolved);
  }

  return (
    <Stack>
      <Stack px={4} gap={0}>
        <MarkdownProse
          size={size === "large" ? "lg" : "md"}
          sources={Object.values(cleanedLinks).map((link) => ({
            title: link?.title ?? link?.url ?? "Source",
            url: link?.url ?? undefined,
          }))}
          options={{
            onTicketCreate,
            ticketCreateLoading,
            disabled,
            customerEmail,
          }}
        >
          {cleanedContent}
        </MarkdownProse>
        <Group pb={Object.keys(cleanedLinks).length === 0 ? 4 : 0}>
          <Tooltip content="Pin message" showArrow>
            <IconButton
              size={"xs"}
              rounded={"full"}
              variant={pinned ? "solid" : "subtle"}
              onClick={pinned ? onUnpin : onPin}
              disabled={disabled}
            >
              <TbPin />
            </IconButton>
          </Tooltip>
          {/* <Tooltip content="Delete message" showArrow>
            <IconButton
              size={"xs"}
              rounded={"full"}
              variant={"subtle"}
              onClick={onDelete}
              disabled={disabled}
            >
              <TbTrash />
            </IconButton>
          </Tooltip> */}
          <Tooltip content="Regenerate message" showArrow>
            <IconButton
              size={"xs"}
              rounded={"full"}
              variant={"subtle"}
              onClick={onRefresh}
              disabled={disabled}
            >
              <TbRefresh />
            </IconButton>
          </Tooltip>

          <Separator orientation="vertical" h="50%" mx={2} />

          <Tooltip content="Helpful" showArrow>
            <IconButton
              size={"xs"}
              rounded={"full"}
              variant={currentRating === "up" ? "solid" : "subtle"}
              onClick={() => handleRate("up")}
              disabled={disabled}
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
              disabled={disabled}
            >
              <TbThumbDown />
            </IconButton>
          </Tooltip>

          {showScore && (
            <Tooltip content="Score of this message" showArrow>
              <Badge colorPalette={getScoreColor(score)} variant={"surface"}>
                {score.toFixed(2)}
              </Badge>
            </Tooltip>
          )}
        </Group>
      </Stack>

      <Stack gap={0}>
        <Stack borderTop="1px solid" borderColor={"brand.outline"} gap={0}>
          {last && !disabled && ticketingEnabled && !currentRating && (
            <Resolved
              onNo={() => handleResolved(false)}
              onYes={() => handleResolved(true)}
              onCancel={() => handleResolved(null)}
              resolveQuestion={resolveQuestion}
              resolveDescription={resolveDescription}
              resolveYesConfig={resolveYesConfig}
              resolveNoConfig={resolveNoConfig}
            />
          )}
          {Object.entries(cleanedLinks)
            .filter(([_, link]) => link)
            .map(([index, link]) => (
              <SourceLink key={index} link={link} index={Number(index)} />
            ))}
        </Stack>
      </Stack>
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
    <Stack p={4} gap={4}>
      {shouldShowDefaultTitle && (
        <Stack align={"center"} my={20}>
          <Text opacity={0.5}>
            <TbMessage size={"60px"} />
          </Text>
          <Heading size={"2xl"} px={4} textAlign={"center"}>
            {scrape.title}
          </Heading>
        </Stack>
      )}

      {scrape.widgetConfig?.welcomeMessage && (
        <Stack w="full">
          <MarkdownProse>{scrape.widgetConfig?.welcomeMessage}</MarkdownProse>
        </Stack>
      )}

      {scrape.widgetConfig?.questions &&
        scrape.widgetConfig.questions.length > 0 && (
          <Stack w="full">
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

function MCPSetup({ scrape }: { scrape: Scrape }) {
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

function Toolbar({
  threadId,
  scrape,
  messages,
  onErase,
  onPinSelect,
  screen,
  onScreenChange,
  overallScore,
  ticketNumber,
}: {
  threadId?: string;
  scrape: Scrape;
  messages: Message[];
  onErase: () => void;
  onPinSelect: (id: string) => void;
  screen: "chat" | "mcp" | "ticket-create";
  onScreenChange: (screen: "chat" | "mcp" | "ticket-create") => void;
  overallScore?: number;
  ticketNumber?: number;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
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

  function handleShare() {
    navigator.clipboard.writeText(`${window.location.origin}/s/${threadId}`);
    setCopiedShareLink(true);
    toaster.create({
      title: "Copied!",
      description: "Share link copied to clipboard",
    });
  }

  function handleMenuSelect(value: string) {
    if (value === "clear") {
      return onErase();
    }
    if (value === "share") {
      return handleShare();
    }
    if (value === "mcp") {
      return onScreenChange("mcp");
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
      <Group>
        <Group>
          {scrape.logoUrl && (
            <img
              src={scrape.logoUrl}
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
          {overallScore !== undefined && (
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
        {ticketNumber && (
          <Tooltip content="Go to ticket" showArrow>
            <IconButton
              size={"xs"}
              variant={"subtle"}
              position={"relative"}
              colorPalette={"brand"}
              asChild
            >
              <a href={`/ticket/${ticketNumber}`} target="_blank">
                <TbTicket />
              </a>
            </IconButton>
          </Tooltip>
        )}

        {pinnedCount > 0 && (
          <MenuRoot
            positioning={{ placement: "bottom-end" }}
            onSelect={(e) => handlePinSelect(e.value)}
          >
            <MenuTrigger asChild>
              <IconButton size={"xs"} variant={"subtle"} position={"relative"}>
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
                    <MenuItem key={message.id} value={message.id}>
                      {(message.llmMessage as any)?.content}
                    </MenuItem>
                  ))}
              </MenuItemGroup>
            </MenuContent>
          </MenuRoot>
        )}

        {screen === "mcp" && (
          <Button
            size={"xs"}
            variant={"subtle"}
            onClick={() => onScreenChange("chat")}
          >
            Switch to chat
            <TbMessage />
          </Button>
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
            <MenuItem value={"clear"} disabled={!threadId}>
              <TbEraser />
              Clear chat
            </MenuItem>
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

function useChatBoxDimensions(
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
      // case "full_screen":
      //   return { width: width, height: height };
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

function TicketCreate({
  onCancel,
  onSubmit,
  loading,
  customerEmail,
}: {
  onCancel: () => void;
  onSubmit: (email: string, title: string, message: string) => void;
  loading?: boolean;
  customerEmail?: string;
}) {
  const [email, setEmail] = useState(customerEmail ?? "");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");

  function handleSubmit() {
    onSubmit(email, title, message);
  }

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
        <Button variant={"subtle"} onClick={onCancel} disabled={loading}>
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

export default function ScrapeWidget({
  threadId,
  messages,
  scrape,
  userToken,
  onBgClick,
  onPin,
  onUnpin,
  onErase,
  onDelete,
  onRate,
  showScore,
  embed,
  onTicketCreate,
  ticketCreationLoading,
  ticketingEnabled,
  resolveQuestion,
  resolveDescription,
  resolveYesConfig,
  resolveNoConfig,
  ticketNumber,
  customerEmail,
  makeThreadId,
  eraseAt,
}: {
  threadId?: string;
  messages: Message[];
  scrape: Scrape;
  userToken?: string;
  onBgClick?: () => void;
  onPin?: (id: string) => void;
  onUnpin?: (id: string) => void;
  onErase?: () => void;
  onDelete?: (ids: string[]) => void;
  onRate?: (id: string, rating: MessageRating) => void;
  showScore?: boolean;
  embed?: boolean;
  onTicketCreate?: (email: string, title: string, message: string) => void;
  ticketCreationLoading?: boolean;
  ticketingEnabled?: boolean;
  resolveQuestion?: string;
  resolveDescription?: string;
  resolveYesConfig?: ResolveBtnConfig;
  resolveNoConfig?: ResolveBtnConfig;
  ticketNumber?: number;
  customerEmail?: string;
  makeThreadId?: () => Promise<void>;
  eraseAt?: number;
}) {
  const chat = useScrapeChat({
    token: userToken,
    scrapeId: scrape.id,
    defaultMessages: messages,
    threadId,
  });
  const [screen, setScreen] = useState<"chat" | "mcp" | "ticket-create">(
    "chat"
  );
  const overallScore = useMemo(() => getMessagesScore(messages), [messages]);
  const containerRef = useRef<HTMLDivElement>(null);
  const boxDimensions = useChatBoxDimensions(
    scrape.widgetConfig?.size ?? null,
    containerRef
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const readOnly = useMemo(() => !onTicketCreate, []);
  const [pendingQuery, setPendingQuery] = useState<string>();

  useEffect(() => {
    if (userToken) {
      chat.connect();
      return () => chat.disconnect();
    }
  }, [userToken]);

  useEffect(function () {
    scroll();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { setTheme } = useTheme();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "focus") {
        scroll();
        document.querySelector("html")?.style.setProperty("color-scheme", "");
      }

      if (event.data === "dark-mode") {
        setTheme("dark");
      }

      if (event.data === "light-mode") {
        setTheme("light");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (chat.connected && threadId && pendingQuery) {
      handleAsk(pendingQuery);
      setPendingQuery(undefined);
    }
  }, [chat.connected]);

  useEffect(() => {
    if (eraseAt) {
      chat.erase();
      setScreen("chat");
    }
  }, [eraseAt]);

  async function handleAsk(query: string) {
    if (!threadId) {
      chat.setMakingThreadId();
      makeThreadId?.();
      setPendingQuery(query);
      return;
    }
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
      handleClose();
    }
  }

  function handleClose() {
    onBgClick?.();
    inputRef.current?.blur();
  }

  function handlePin(id: string) {
    onPin?.(id);
    chat.pinMessage(id);
  }

  function handleUnpin(id: string) {
    onUnpin?.(id);
    chat.unpinMessage(id);
  }

  function handleErase() {
    onErase?.();
    chat.erase();
  }

  function handlePinSelect(id: string) {
    scroll(`#message-${id}`);
  }

  function handleDelete(ids: string[]) {
    onDelete?.(ids);
    chat.deleteMessage(ids);
  }

  async function handleRefresh(questionId: string, answerId: string) {
    const message = chat.getMessage(questionId);
    if (!message) return;

    onDelete?.([questionId, answerId]);
    chat.deleteMessage([questionId, answerId]);
    chat.ask((message.llmMessage as any).content as string);
    await scroll();
  }

  function handleResolved(messageId: string, resolved: boolean | null) {
    if (resolved === false) {
      if (resolveNoConfig?.link) {
        window.open(resolveNoConfig.link, "_blank");
      } else {
        setScreen("ticket-create");
      }
    }
    if (resolved === true) {
      if (resolveYesConfig?.link) {
        window.open(resolveYesConfig.link, "_blank");
      }
    }
  }

  function handleTicketCreateCancel() {
    setScreen("chat");
    scroll();
  }

  function handleTicketCreate(email: string, title: string, message: string) {
    onTicketCreate?.(email, title, message);
  }

  return (
    <Center w="full" h="full" onClick={handleBgClick} ref={containerRef}>
      <Stack
        border="1px solid"
        borderColor={"brand.outline"}
        rounded={"xl"}
        boxShadow={"rgba(100, 100, 111, 0.2) 0px 7px 29px 0px"}
        bg="brand.white"
        w={boxDimensions.width}
        maxH={boxDimensions.height}
        gap={0}
        position={"relative"}
        overflow={"hidden"}
      >
        <Toolbar
          threadId={threadId}
          messages={chat.messages}
          onErase={handleErase}
          onPinSelect={handlePinSelect}
          screen={screen}
          onScreenChange={setScreen}
          scrape={scrape}
          overallScore={showScore ? overallScore : undefined}
          ticketNumber={ticketNumber}
        />
        <Stack flex="1" overflow={"auto"} gap={0}>
          {screen === "chat" && (
            <>
              {chat.allMessages.length === 0 && (
                <NoMessages scrape={scrape} onQuestionClick={handleAsk} />
              )}
              {chat.allMessages.map((message, index) => (
                <Stack
                  key={index}
                  id={`message-${message.id}`}
                  borderTop={message.role === "user" ? "1px solid" : "none"}
                  borderColor={"brand.outline"}
                  _first={{
                    borderTop: "none",
                  }}
                >
                  {message.role === "user" ? (
                    <UserMessage content={message.content} />
                  ) : (
                    <AssistantMessage
                      id={message.id}
                      size={scrape.widgetConfig?.size}
                      content={message.content}
                      links={message.links}
                      pinned={chat.allMessages[index - 1]?.pinned}
                      rating={message.rating}
                      onPin={() => handlePin(chat.allMessages[index - 1]?.id)}
                      disabled={readOnly}
                      showScore={showScore}
                      onUnpin={() =>
                        handleUnpin(chat.allMessages[index - 1]?.id)
                      }
                      onDelete={() =>
                        handleDelete([
                          chat.allMessages[index - 1]?.id,
                          message.id,
                        ])
                      }
                      onRefresh={() =>
                        handleRefresh(
                          chat.allMessages[index - 1]?.id,
                          message.id
                        )
                      }
                      onRate={(rating) => onRate?.(message.id, rating)}
                      onResolved={handleResolved}
                      last={index === chat.allMessages.length - 1}
                      ticketingEnabled={ticketingEnabled}
                      resolveQuestion={resolveQuestion}
                      resolveDescription={resolveDescription}
                      resolveYesConfig={resolveYesConfig}
                      resolveNoConfig={resolveNoConfig}
                      onTicketCreate={handleTicketCreate}
                      ticketCreateLoading={ticketCreationLoading}
                      customerEmail={customerEmail}
                    />
                  )}
                  {(chat.askStage === "asked" ||
                    chat.askStage === "searching") &&
                    index === chat.allMessages.length - 1 && <LoadingMessage />}
                  {chat.askStage !== "idle" &&
                    index === chat.allMessages.length - 1 && (
                      <Box h={"2000px"} w="full" />
                    )}
                </Stack>
              ))}
            </>
          )}
          {screen === "mcp" && <MCPSetup scrape={scrape} />}
          {screen === "ticket-create" && (
            <TicketCreate
              onCancel={handleTicketCreateCancel}
              onSubmit={handleTicketCreate}
              loading={ticketCreationLoading}
              customerEmail={customerEmail}
            />
          )}
        </Stack>
        {screen === "chat" && (
          <ChatInput
            inputRef={inputRef}
            onAsk={handleAsk}
            stage={chat.askStage}
            searchQuery={chat.searchQuery}
            disabled={screen !== "chat" || readOnly}
            scrape={scrape}
            embed={embed}
          />
        )}
        <Group
          px={4}
          py={2}
          bg="brand.gray.50/50"
          borderTop={"1px solid"}
          borderColor={"brand.outline/50"}
        >
          <Text fontSize={"xs"} opacity={0.4}>
            Powered by{" "}
            <Link href="https://crawlchat.app" target="_blank">
              CrawlChat
            </Link>
          </Text>
        </Group>
      </Stack>
    </Center>
  );
}
