import { Group, Image, Link, Separator, Stack, Text } from "@chakra-ui/react";
import type { Route } from "./+types/share";
import { prisma } from "libs/prisma";
import type { Scrape, Message, MessageSourceLink } from "libs/prisma";
import { useMemo } from "react";
import { extractCitations } from "libs/citation";
import { MarkdownProse } from "./markdown-prose";
import { RiChatVoiceAiFill } from "react-icons/ri";
import { MessageCopyButton, SourceLink, Sources } from "~/widget/chat-box";
import { TbAlertCircle } from "react-icons/tb";

export async function loader({ params }: Route.LoaderArgs) {
  const { id } = params;
  const thread = await prisma.thread.findFirst({
    where: {
      id,
    },
    include: {
      messages: true,
      scrape: true,
    },
  });
  return { thread };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data.thread) {
    return [
      {
        title: "CrawlChat",
      },
    ];
  }

  let title = data.thread.scrape.title ?? data.thread.scrape.url;
  let description = "AI Chatbot for your knowledge base and documentation";
  if (
    data.thread.messages.length > 0 &&
    (data.thread.messages[0].llmMessage as any).role === "user"
  ) {
    const question = (
      data.thread.messages[0].llmMessage as any
    ).content.substring(0, 100);
    title = `${question} - ${title} - CrawlChat`;
  }
  if (
    data.thread.messages.length > 1 &&
    (data.thread.messages[1].llmMessage as any).role === "assistant"
  ) {
    const question = (
      data.thread.messages[1].llmMessage as any
    ).content.substring(0, 200);
    description = question;
  }
  return [
    {
      title,
    },
    {
      description,
    },
    {
      property: "og:title",
      content: title,
    },
    {
      property: "og:description",
      content: description,
    },
  ];
}

function Nav({ scrape }: { scrape: Scrape }) {
  return (
    <Stack as="nav" p={4}>
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
          <Link href="https://crawlchat.app" fontWeight={"bold"}>
            <RiChatVoiceAiFill />
            CrawlChat
          </Link>
        </Text>
      </Group>
    </Stack>
  );
}

function UserMessage({ content }: { content: string }) {
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

function AssistantMessage({
  content,
  links,
}: {
  content: string;
  links: MessageSourceLink[];
}) {
  const citation = useMemo(() => {
    return extractCitations(content, links);
  }, [links]);

  return (
    <Stack>
      <Sources citation={citation} />
      <MarkdownProse
        size={"md"}
        sources={Object.values(citation.citedLinks).map((link) => ({
          title: link?.title ?? link?.url ?? "Source",
          url: link?.url ?? undefined,
        }))}
      >
        {citation.content}
      </MarkdownProse>
      <Group>
        <MessageCopyButton content={content} />
      </Group>
    </Stack>
  );
}

function Message({
  message,
  last,
  pullUp,
}: {
  message: Message;
  last: boolean;
  pullUp?: boolean;
}) {
  const llmMessage = useMemo(() => {
    return {
      role: (message.llmMessage as any).role as string,
      content: (message.llmMessage as any).content as string,
    };
  }, [message]);

  return (
    <Stack p={4} mt={pullUp ? -6 : 0}>
      {llmMessage.role === "user" ? (
        <UserMessage content={llmMessage.content} />
      ) : (
        <AssistantMessage content={llmMessage.content} links={message.links} />
      )}
    </Stack>
  );
}

export default function Share({ loaderData }: Route.ComponentProps) {
  if (!loaderData.thread) {
    return (
      <Stack alignItems={"center"} justifyContent={"center"} h="100vh" w="full">
        <TbAlertCircle size={48} />
        <Text>Conversation not found</Text>
      </Stack>
    );
  }
  return (
    <Stack alignItems={"center"}>
      <Stack maxW={800} w="full">
        <Nav scrape={loaderData.thread.scrape} />
        <Stack gap={0}>
          {loaderData.thread.messages.map((message, idx) => (
            <Message
              key={message.id}
              message={message}
              last={idx === loaderData.thread!.messages.length - 1}
              pullUp={
                (loaderData.thread?.messages[idx - 1]?.llmMessage as any)
                  ?.role === "user"
              }
            />
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
