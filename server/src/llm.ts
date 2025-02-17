import OpenAI from "openai";
import type { Message, ResponseType } from "@prisma/client";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function getSystemPrompt(responseType: ResponseType) {
  switch (responseType) {
    case "long":
      return "You are a helpful assistant that can answer questions about the context provided.";
    case "brief":
      return "You are a helpful assistant that can answer questions about the context provided. Keep your response brief and to the point.";
    case "short":
      return "You are a helpful assistant that can answer questions about the context provided. Keep your response super short and to the point.";
    case "points":
      return "You are a helpful assistant that can answer questions about the context provided. Response should be list of bullet points. Only include the most important points.";
  }
}

export async function askLLM(
  query: string,
  messages: Message[],
  options?: {
    url?: string;
    context?: string;
    systemPrompt?: string;
  }
) {
  return await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      ...messages.map((message) => message.llmMessage as any),
      {
        role: "system",
        content: options?.systemPrompt ?? "You are a helpful assistant.",
      },
      {
        role: "user",
        content: `${query}\n\nContext:\n${options?.context ?? ""}`,
      },
    ],
    stream: true,
  });
}
