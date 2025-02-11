import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { prisma } from "../prisma";
import type { InputJsonObject } from "@prisma/client/runtime/library";

export async function addMessage(
  threadId: string,
  message: ChatCompletionMessageParam
) {
  return await prisma.thread.update({
    where: { id: threadId },
    data: { messages: { push: message as unknown as InputJsonObject } },
  });
}
