import type { Route } from "./+types/share";
import type { Scrape, Message, MessageSourceLink } from "libs/prisma";
import { prisma } from "libs/prisma";
import { useMemo } from "react";
import { extractCitations } from "libs/citation";
import { MarkdownProse } from "./markdown-prose";
import { RiChatVoiceAiFill } from "react-icons/ri";
import { MessageCopyButton, Sources } from "~/widget/chat-box";
import { TbAlertCircle } from "react-icons/tb";
import cn from "@meltdownjs/cn";

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
    <nav className="flex items-center justify-between p-4 gap-2">
      <div className="flex items-center gap-2">
        {scrape.logoUrl && (
          <img
            src={scrape.logoUrl}
            alt={scrape.title ?? ""}
            className="h-[18px]"
          />
        )}
        <p className="text-lg font-medium">{scrape.title}</p>
      </div>
      <p className="text-sm flex items-center gap-2">
        <span className="text-base-content/50">Powered by</span>{" "}
        <a
          className="link link-hover link-primary flex items-center gap-2"
          href="https://crawlchat.app"
        >
          <RiChatVoiceAiFill />
          CrawlChat
        </a>
      </p>
    </nav>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div
      className={cn(
        "user-message text-xl font-bold opacity-80 whitespace-pre-wrap"
      )}
    >
      {content}
    </div>
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
    <div className="flex flex-col gap-2">
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
      <div>
        <MessageCopyButton content={content} />
      </div>
    </div>
  );
}

function Message({ message, pullUp }: { message: Message; pullUp?: boolean }) {
  const llmMessage = useMemo(() => {
    return {
      role: (message.llmMessage as any).role as string,
      content: (message.llmMessage as any).content as string,
    };
  }, [message]);

  return (
    <div
      className={cn(
        "p-4",
        pullUp && "-mt-6",
        llmMessage.role === "user" && "border-t border-base-300 first:border-0"
      )}
    >
      {llmMessage.role === "user" ? (
        <UserMessage content={llmMessage.content} />
      ) : (
        <AssistantMessage content={llmMessage.content} links={message.links} />
      )}
    </div>
  );
}

export default function Share({ loaderData }: Route.ComponentProps) {
  if (!loaderData.thread) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full">
        <TbAlertCircle size={48} />
        <p>Conversation not found</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="max-w-prose w-full">
        <Nav scrape={loaderData.thread.scrape} />
        <div className="flex flex-col">
          {loaderData.thread.messages.map((message, idx) => (
            <Message
              key={message.id}
              message={message}
              pullUp={
                (loaderData.thread?.messages[idx - 1]?.llmMessage as any)
                  ?.role === "user"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
