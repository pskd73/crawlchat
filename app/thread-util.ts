import type { Thread } from "@prisma/client";

export function getThreadName(thread: Thread, maxLength = 18) {
  const title =
    (thread.messages[0] as { content: string })?.content ?? "Untitled";
  if (title.length > maxLength) {
    return title.slice(0, maxLength) + "...";
  }
  return title;
}
