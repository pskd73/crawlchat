import { prisma } from "libs/prisma";
import type { Prisma, Scrape, TicketAuthorRole } from "libs/prisma";
import type { Route } from "./+types/ticket";
import {
  Badge,
  Box,
  Group,
  Heading,
  Image,
  Link,
  Separator,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import {
  TbAlertCircle,
  TbArrowRight,
  TbCheck,
  TbMessage,
  TbUser,
} from "react-icons/tb";
import { RiChatVoiceAiFill } from "react-icons/ri";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import moment from "moment";
import { getAuthUser } from "~/auth/middleware";
import { MarkdownProse } from "./markdown-prose";
import { sendReactEmail } from "~/email";
import TicketUserMessageEmail from "emails/ticket-user-message";
import TicketAdminMessageEmail from "emails/ticket-admin-message";

export async function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  let key = url.searchParams.get("key");
  let ticketNumber = parseInt(params.number);

  let thread = await prisma.thread.findFirst({
    where: {
      ticketNumber,
    },
    include: {
      messages: true,
      scrape: true,
    },
  });

  const loggedInUser = await getAuthUser(request, { dontRedirect: true });
  if (loggedInUser && loggedInUser.id === thread?.scrape.userId) {
    key = thread.ticketKey;
  }
  if (key !== thread?.ticketKey) {
    thread = null;
  }

  const role =
    thread && loggedInUser?.id === thread.scrape.userId ? "agent" : "user";

  return { thread, passedKey: key, ticketNumber, role };
}

export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: data.thread?.title ?? "CrawlChat",
    },
  ];
}

export async function action({ params, request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const key = formData.get("key") as string;

  const thread = await prisma.thread.findFirst({
    where: {
      ticketNumber: parseInt(params.number),
      ticketKey: key,
    },
    include: {
      scrape: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }

  const loggedInUser = await getAuthUser(request, { dontRedirect: true });

  if (intent === "comment") {
    const content = formData.get("content") as string;
    const role = loggedInUser?.id === thread.scrape.userId ? "agent" : "user";
    const resolve = formData.get("resolve") === "true";

    const message = await prisma.message.create({
      data: {
        ownerUserId: thread.scrape.userId,
        threadId: thread.id,
        scrapeId: thread.scrape.id,
        llmMessage: {
          role: "user",
          content,
        },
        ticketMessage: {
          role,
          event: "message",
        },
      },
    });

    const threadUpdate: Prisma.ThreadUpdateInput = {
      lastMessageAt: new Date(),
    };

    if (resolve) {
      threadUpdate.ticketStatus = "closed";
      threadUpdate.ticketClosedAt = new Date();
    }

    await prisma.thread.update({
      where: { id: thread.id },
      data: threadUpdate,
    });

    if (
      role === "agent" &&
      thread.ticketUserEmail &&
      thread.ticketNumber !== null &&
      thread.ticketNumber !== undefined &&
      thread.ticketKey &&
      thread.title
    ) {
      await sendReactEmail(
        thread.ticketUserEmail,
        `New message on ticket (#${thread.ticketNumber})`,
        <TicketUserMessageEmail
          scrapeTitle={thread.scrape.title ?? "CrawlChat"}
          ticketNumber={thread.ticketNumber}
          ticketKey={thread.ticketKey}
          title={thread.title}
          message={content}
        />
      );
    }

    if (
      role === "user" &&
      thread.ticketUserEmail &&
      thread.ticketNumber !== null &&
      thread.ticketNumber !== undefined &&
      thread.ticketKey &&
      thread.title &&
      (thread.scrape.user.settings?.ticketEmailUpdates ?? true)
    ) {
      await sendReactEmail(
        thread.scrape.user.email,
        `New message on ticket (#${thread.ticketNumber})`,
        <TicketAdminMessageEmail
          scrapeTitle={thread.scrape.title ?? "CrawlChat"}
          ticketNumber={thread.ticketNumber}
          title={thread.title}
          message={content}
          email={thread.ticketUserEmail}
        />
      );
    }

    return { message };
  }
}

function Nav({ scrape }: { scrape: Scrape }) {
  return (
    <Stack as="nav" pt={4}>
      <Group justifyContent={"space-between"}>
        <Group>
          {scrape.logoUrl && (
            <Image
              src={scrape.logoUrl}
              alt={scrape.title ?? ""}
              maxH={"18px"}
            />
          )}
          <Text fontSize={"lg"} fontWeight={"bold"}>
            {scrape.title}
          </Text>
        </Group>
        <Text
          fontSize={"sm"}
          opacity={0.5}
          display={"flex"}
          alignItems={"center"}
          gap={2}
        >
          Powered by{" "}
          <Link href="https://crawlchat.com" fontWeight={"bold"}>
            <RiChatVoiceAiFill />
            CrawlChat
          </Link>
        </Text>
      </Group>
    </Stack>
  );
}

type TicketMessage = {
  id: string;
  role: TicketAuthorRole;
  content: string;
  createdAt: Date;
};

function Message({
  scrape,
  message,
}: {
  scrape: Scrape;
  message: TicketMessage;
}) {
  return (
    <Stack
      border={"2px solid"}
      borderColor={
        message.role === "user" ? "brand.outline" : "brand.emphasized"
      }
      rounded={"md"}
      gap={0}
    >
      <Group
        px={4}
        py={2}
        borderBottom={"1px solid"}
        borderColor={"brand.outline"}
        bg="brand.gray"
      >
        {message.role === "agent" && (
          <Image
            src={scrape.logoUrl ?? "/logo.png"}
            alt={scrape.title ?? ""}
            maxH={"18px"}
          />
        )}
        {message.role === "user" && <TbUser />}
        <Text fontWeight={"bold"}>
          {message.role === "user" ? "You" : scrape.title}
        </Text>
        <Text opacity={0.5} fontSize={"sm"}>
          {moment(message.createdAt).fromNow()}
        </Text>
      </Group>
      <Stack px={4}>
        <MarkdownProse>{message.content}</MarkdownProse>
      </Stack>
    </Stack>
  );
}

export default function Ticket({ loaderData }: Route.ComponentProps) {
  const commentFetcher = useFetcher();
  const [resolve, setResolve] = useState(false);
  const commentSubmitRef = useRef<HTMLButtonElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const ticketMessages = useMemo<TicketMessage[]>(() => {
    if (!loaderData.thread) return [];
    return loaderData.thread.messages
      .filter((message) => message.ticketMessage)
      .map((message) => ({
        id: message.id,
        role: message.ticketMessage!.role,
        content: (message.llmMessage as any).content,
        createdAt: message.createdAt,
      }));
  }, [loaderData.thread]);

  const openedAt = useMemo(() => {
    if (ticketMessages.length === 0) return null;
    return ticketMessages[0].createdAt;
  }, [ticketMessages]);

  useEffect(() => {
    if (resolve && commentSubmitRef.current) {
      commentSubmitRef.current.click();
    }
  }, [resolve]);

  useEffect(() => {
    if (commentRef.current) {
      commentRef.current.value = "";
      setResolve(false);
    }
  }, [commentFetcher.data]);

  function handleResolve() {
    setResolve(true);
  }

  if (!loaderData.thread) {
    return (
      <Stack alignItems={"center"} justifyContent={"center"} h="100vh" w="full">
        <TbAlertCircle size={48} />
        <Text>Ticket not found</Text>
      </Stack>
    );
  }

  return (
    <Stack alignItems={"center"}>
      <Stack maxW={800} w="full" gap={8} p={4}>
        <Nav scrape={loaderData.thread.scrape} />
        {loaderData.thread.title && (
          <Stack>
            <Heading size={"2xl"} as="h1">
              <Text as="span" opacity={0.2}>
                #{loaderData.thread.ticketNumber}
              </Text>{" "}
              {loaderData.thread.title}
            </Heading>
            <Group>
              <Badge
                colorPalette={
                  loaderData.thread.ticketStatus === "open"
                    ? "green"
                    : undefined
                }
                variant={"surface"}
              >
                {loaderData.thread.ticketStatus!.toUpperCase()}
              </Badge>
              <Separator h="4" orientation="vertical" />
              <Text opacity={0.5}>Opened {moment(openedAt).fromNow()}</Text>
              {loaderData.role === "agent" && (
                <>
                  <Separator h="4" orientation="vertical" />
                  <Text opacity={0.5}>{loaderData.thread.ticketUserEmail}</Text>
                </>
              )}
            </Group>
          </Stack>
        )}
        <Stack gap={4}>
          {ticketMessages.map((message, idx) => (
            <Message
              key={message.id}
              message={message}
              scrape={loaderData.thread!.scrape}
            />
          ))}
          {loaderData.thread.ticketStatus === "closed" && (
            <Stack gap={4}>
              {loaderData.thread.scrape.resolveYesConfig && (
                <Stack
                  border={"2px solid"}
                  borderColor={"brand.outline"}
                  rounded={"md"}
                  p={4}
                >
                  <Text fontWeight={"bold"}>
                    {loaderData.thread.scrape.resolveYesConfig.title}
                  </Text>
                  <Text>
                    {loaderData.thread.scrape.resolveYesConfig.description}
                  </Text>
                  <Box>
                    <Button asChild>
                      <a
                        href={loaderData.thread.scrape.resolveYesConfig.link}
                        target="_blank"
                      >
                        {loaderData.thread.scrape.resolveYesConfig.btnLabel}
                        <TbArrowRight />
                      </a>
                    </Button>
                  </Box>
                </Stack>
              )}
              <Group px={[0, 10]} opacity={0.5}>
                <TbCheck />
                <Text fontSize={"sm"}>
                  This ticket has been resolved and closed{" "}
                  <Text as="span" fontWeight={"medium"}>
                    {moment(loaderData.thread.ticketClosedAt).fromNow()}
                  </Text>
                </Text>
              </Group>
            </Stack>
          )}
        </Stack>

        {loaderData.thread.ticketStatus !== "closed" && (
          <commentFetcher.Form method="post">
            <Stack>
              <input type="hidden" name="intent" value={"comment"} />
              <input type="hidden" name="resolve" value={resolve.toString()} />
              <input
                type="hidden"
                name="key"
                value={loaderData.passedKey ?? ""}
              />
              <Text fontWeight={"medium"}>Add a message</Text>
              <Textarea
                ref={commentRef}
                name="content"
                placeholder="Type your message here..."
                rows={3}
                required
              />
              <Group justifyContent={"flex-end"}>
                <Button
                  loading={commentFetcher.state !== "idle" && resolve}
                  variant={"subtle"}
                  onClick={handleResolve}
                  disabled={commentFetcher.state !== "idle"}
                >
                  Resolve & Close
                  <TbCheck />
                </Button>
                <Button
                  ref={commentSubmitRef}
                  type="submit"
                  loading={commentFetcher.state !== "idle" && !resolve}
                  disabled={commentFetcher.state !== "idle"}
                >
                  Comment
                  <TbMessage />
                </Button>
              </Group>
            </Stack>
          </commentFetcher.Form>
        )}
      </Stack>
    </Stack>
  );
}
