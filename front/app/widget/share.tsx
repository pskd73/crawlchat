import { Group, Image, Link, Separator, Stack, Text } from "@chakra-ui/react";
import type { Route } from "./+types/share";
import { prisma } from "libs/prisma";
import type { Scrape, Message, MessageSourceLink } from "libs/prisma";
import { useMemo } from "react";
import { extractCitations } from "libs/citation";
import { MarkdownProse } from "./markdown-prose";
import { RiChatVoiceAiFill } from "react-icons/ri";
import { SourceLink } from "~/dashboard/chat-box";
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
    <Stack
      as="nav"
      p={4}
      borderBottom={"1px solid"}
      borderColor={"brand.outline"}
    >
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

function UserMessage({ content }: { content: string }) {
  return (
    <Stack className="user-message" px={4}>
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
  last,
}: {
  content: string;
  links: MessageSourceLink[];
  last: boolean;
}) {
  const [cleanedLinks, cleanedContent, score] = useMemo(() => {
    const citation = extractCitations(content, links);
    const score = Math.max(...links.map((l) => l.score ?? 0), 0);
    return [citation.citedLinks, citation.content, score];
  }, [links]);

  return (
    <Stack mb={last ? 0 : 4}>
      <Group px={4}>
        <MarkdownProse
          size={"md"}
          sources={Object.values(cleanedLinks).map((link) => ({
            title: link?.title ?? link?.url ?? "Source",
            url: link?.url ?? undefined,
          }))}
        >
          {cleanedContent}
        </MarkdownProse>
      </Group>
      {Object.keys(cleanedLinks).length > 0 && (
        <Stack gap={0}>
          <Stack borderTop="1px solid" borderColor={"brand.outline"} gap={0}>
            {Object.entries(cleanedLinks)
              .filter(([_, link]) => link)
              .map(([index, link]) => (
                <SourceLink key={index} link={link} index={Number(index)} />
              ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}

function Message({ message, last }: { message: Message; last: boolean }) {
  const llmMessage = useMemo(() => {
    return {
      role: (message.llmMessage as any).role as string,
      content: (message.llmMessage as any).content as string,
    };
  }, [message]);

  return (
    <Stack>
      {llmMessage.role === "user" ? (
        <UserMessage content={llmMessage.content} />
      ) : (
        <AssistantMessage
          content={llmMessage.content}
          links={message.links}
          last={last}
        />
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
      <Stack
        maxW={800}
        w="full"
        borderLeft={["none", "none", "1px solid"]}
        borderRight={["none", "none", "1px solid"]}
        borderColor={["none", "none", "brand.outline"]}
      >
        <Nav scrape={loaderData.thread.scrape} />
        <Stack gap={0}>
          {loaderData.thread.messages.map((message, idx) => (
            <Message
              key={message.id}
              message={message}
              last={idx === loaderData.thread!.messages.length - 1}
            />
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
