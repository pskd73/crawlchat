import OpenAI from "openai";
import { z, ZodSchema } from "zod";
import { Stream } from "openai/streaming";
import { ChatCompletionMessageParam } from "openai/resources";
import { zodResponseFormat } from "openai/helpers/zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export type LlmMessage = ChatCompletionMessageParam;
export type LlmTool<T extends ZodSchema<any>, CustomMessage> = {
  id: string;
  description: string;
  schema: T;
  execute: (
    input: z.infer<T>
  ) => Promise<{ content: string; customMessage?: CustomMessage }>;
};
export type LlmRole = "developer" | "system" | "user" | "assistant" | "tool";
export type FlowMessage<CustomMessage> = {
  llmMessage: LlmMessage;
  agentId?: string;
  custom?: CustomMessage;
};

export type State<CustomState, CustomMessage> = CustomState & {
  messages: FlowMessage<CustomMessage>[];
};

export function multiLinePrompt(prompt: string[]) {
  return prompt.join("\n");
}

export function logMessage(message: any) {
  console.log(JSON.stringify(message, null, 2));
}

export class Agent<CustomState = {}, CustomMessage = {}> {
  public id: string;
  private openai: OpenAI;
  private model: string;

  constructor(
    id: string,
    options?: { model?: string; baseURL?: string; apiKey?: string }
  ) {
    this.openai = new OpenAI({
      apiKey: options?.apiKey ?? process.env.OPENAI_API_KEY,
      baseURL: options?.baseURL,
    });
    this.model = options?.model ?? "gpt-4o-mini";
    this.id = id;

    console.log("Created agent", this.id, this.model);
  }

  async stream(
    state: State<CustomState, CustomMessage>
  ): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const systemPromptMessage: ChatCompletionMessageParam = {
      role: "system",
      content: await this.getSystemPrompt(state),
    };

    let developerMessages: ChatCompletionMessageParam[] = [];

    if (this.model === "o1-mini") {
      developerMessages = [
        {
          role: "developer",
          content: "Formatting re-enabled",
        } as ChatCompletionMessageParam,
      ];
    }

    const messages = [
      ...developerMessages,
      ...state.messages.map((m) => m.llmMessage),
      systemPromptMessage,
    ];

    const tools = this.getTools()?.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.id,
        description: tool.description,
        parameters: zodToJsonSchema(tool.schema),
      },
    }));

    return this.openai.chat.completions.create({
      messages,
      model: this.model,
      stream: true,
      response_format: this.getResponseSchema()
        ? zodResponseFormat(this.getResponseSchema()!, "json_object")
        : undefined,
      tools,
    });
  }

  getTools(): LlmTool<any, CustomMessage>[] | null {
    return null;
  }

  async getSystemPrompt(
    state: State<CustomState, CustomMessage>
  ): Promise<string> {
    return "You are a helpful assistant.";
  }

  getResponseSchema(): ZodSchema<any> | null {
    return null;
  }
}

export class SimpleAgent<CustomMessage> extends Agent<{}, CustomMessage> {
  private prompt: string;
  private schema?: ZodSchema<any>;
  private tools?: LlmTool<any, CustomMessage>[];

  constructor({
    id,
    prompt,
    schema,
    tools,
    model,
    baseURL,
    apiKey,
  }: {
    id: string;
    prompt: string;
    schema?: ZodSchema<any>;
    tools?: LlmTool<any, CustomMessage>[];
    model?: string;
    baseURL?: string;
    apiKey?: string;
  }) {
    super(id, { model, baseURL, apiKey });
    this.prompt = prompt;
    this.schema = schema;
    this.tools = tools;
  }

  async getSystemPrompt(): Promise<string> {
    return this.prompt;
  }

  getResponseSchema(): ZodSchema<any> | null {
    return this.schema ?? null;
  }

  getTools(): LlmTool<any, CustomMessage>[] | null {
    return this.tools ?? null;
  }
}

export class SimpleTool<CustomMessage> {
  private id: string;
  private description: string;
  private schema: ZodSchema<any>;
  private execute: (
    input: z.infer<ZodSchema<any>>
  ) => Promise<{ content: string; customMessage?: CustomMessage }>;

  constructor({
    id,
    description,
    schema,
    execute,
  }: {
    id: string;
    description: string;
    schema: ZodSchema<any>;
    execute: (
      input: z.infer<ZodSchema<any>>
    ) => Promise<{ content: string; customMessage?: CustomMessage }>;
  }) {
    this.id = id;
    this.description = description;
    this.schema = schema;
    this.execute = execute;
  }

  make(): LlmTool<ZodSchema<any>, CustomMessage> {
    return {
      id: this.id,
      description: this.description,
      schema: this.schema,
      execute: this.execute,
    };
  }
}
