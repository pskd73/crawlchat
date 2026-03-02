import OpenAI from "openai";
import { Stream } from "openai/streaming";
import { ChatCompletionAssistantMessageParam } from "openai/resources";
import { Message, Role } from "./agent";

export type OnDelta = (options: {
  content: string;
  role: Role;
  delta?: string;
}) => void;

export type Usage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
};

export async function handleStream(
  stream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>,
  onDelta?: OnDelta
) {
  let toolCall: ChatCompletionAssistantMessageParam | null = null;
  let content = "";
  let role: Role = "user";
  const messages: Message[] = [];
  let usage: Usage | null = null;

  for await (const chunk of stream) {
    const chunkUsage = (chunk as any).usage;
    if (chunkUsage) {
      usage = {
        promptTokens: chunkUsage.prompt_tokens ?? 0,
        completionTokens: chunkUsage.completion_tokens ?? 0,
        totalTokens: chunkUsage.total_tokens ?? 0,
        cost: chunkUsage.cost ?? 0,
      };
    }
    if (chunk.choices && chunk.choices[0]?.delta?.role) {
      role = chunk.choices[0].delta.role;
    }

    if (chunk.choices && chunk.choices[0]?.delta?.content) {
      content += chunk.choices[0].delta.content;
    }

    if (chunk.choices && chunk.choices[0]?.delta?.tool_calls) {
      if (!toolCall) {
        toolCall = chunk.choices[0].delta as any;
        if (toolCall?.tool_calls) {
          for (let i = 0; i < toolCall.tool_calls.length; i++) {
            if (!toolCall.tool_calls[i].function.arguments) {
              toolCall.tool_calls[i].function.arguments = "";
            }
          }
        }
      }
      for (let i = 0; i < chunk.choices[0].delta.tool_calls.length; i++) {
        if (!chunk.choices[0].delta.tool_calls[i].function) {
          continue;
        }
        if (!toolCall || !toolCall.tool_calls) {
          continue;
        }

        const argChunk =
          chunk.choices[0].delta.tool_calls[i].function!.arguments;
        const index = chunk.choices[0].delta.tool_calls[i].index;

        if (!toolCall.tool_calls[index]) {
          toolCall.tool_calls[index] = chunk.choices[0].delta.tool_calls[
            i
          ] as any;
          toolCall.tool_calls[index].function.arguments = "";
        }
        if (
          typeof argChunk === "string" &&
          argChunk !== toolCall.tool_calls[index].function.arguments
        ) {
          toolCall.tool_calls[index].function.arguments += argChunk;
        }
      }
    }

    if (!toolCall) {
      onDelta?.({
        content,
        role,
        delta: chunk.choices?.[0].delta.content ?? undefined,
      });
    }
  }

  if (toolCall) {
    messages.push({ ...toolCall, role: "assistant" });
  } else {
    messages.push({
      role,
      content,
    } as ChatCompletionAssistantMessageParam);
  }

  return { content, messages, usage };
}
