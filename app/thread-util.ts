import type { Message, ScrapeLink } from "@prisma/client";

export function getThreadName(messages: Message[], maxLength = 500) {
  const title =
    (messages[0]?.llmMessage as { content: string })?.content ?? "Untitled";
  if (title.length > maxLength) {
    return title.slice(0, maxLength) + "...";
  }
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function getLinkTitle(link: ScrapeLink) {
  return link.title ?? link.url;
}
