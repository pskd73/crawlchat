import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { Agent, Message, multiLinePrompt } from "./agent";
import { handleStream, OnDelta, Usage } from "./stream";

export type FlowMessage<CustomMessage> = {
  llmMessage: Message;
  agentId?: string;
  custom?: CustomMessage;
};

export type State<CustomState, CustomMessage> = CustomState & {
  messages: FlowMessage<CustomMessage>[];
};

export type AgentToolCall = {
  toolName: string;
  params: Record<string, any>;
  result: any;
};

type FlowState<CustomState, CustomMessage> = {
  state: State<CustomState, CustomMessage>;
  startedAt?: number;
  nextAgentIds: string[];
  usage: Usage;
  toolCalls: AgentToolCall[];
};

export class Flow<CustomState, CustomMessage> {
  private agents: Agent<CustomMessage>[];
  public flowState: FlowState<CustomState, CustomMessage>;
  private repeatToolAgent: boolean;
  private maxToolCalls?: number;
  private maxCost?: number;

  constructor(
    agents: Agent<CustomMessage>[],
    state: State<CustomState, CustomMessage>,
    options?: {
      repeatToolAgent?: boolean;
      maxToolCalls?: number;
      maxCost?: number;
    }
  ) {
    this.agents = agents;
    this.flowState = {
      state,
      nextAgentIds: [],
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: 0,
      },
      toolCalls: [],
    };
    this.repeatToolAgent = options?.repeatToolAgent ?? true;
    this.maxToolCalls = options?.maxToolCalls;
    this.maxCost = options?.maxCost;
  }

  getAgent(id: string) {
    return this.agents.find((agent) => agent.id === id);
  }

  getLastMessage() {
    return this.flowState.state.messages[
      this.flowState.state.messages.length - 1
    ];
  }

  getUsage(): Usage {
    return this.flowState.usage;
  }

  private addUsage(usage: Usage | null) {
    if (!usage) return;
    this.flowState.usage.promptTokens += usage.promptTokens;
    this.flowState.usage.completionTokens += usage.completionTokens;
    this.flowState.usage.totalTokens += usage.totalTokens;
    this.flowState.usage.cost += usage.cost;
  }

  async runTool(id: string, toolId: string, args: Record<string, any>) {
    const normalizedToolId = toolId.trim();
    for (const [agentId, agent] of Object.entries(this.agents)) {
      const tools = agent.tools;
      if (!tools) {
        continue;
      }
      for (const tool of tools) {
        if (tool.id === normalizedToolId) {
          let content: string;
          let customMessage: CustomMessage | undefined;

          try {
            const result = await tool.execute(args);
            content = result.content;
            customMessage = result.customMessage;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(`Tool ${normalizedToolId} failed:`, errorMessage);
            content = `Tool encountered an error: ${errorMessage}. Please proceed without this tool's result.`;
          }

          const message: FlowMessage<CustomMessage> = {
            llmMessage: {
              role: "tool",
              content,
              tool_call_id: id,
            },
            agentId,
            custom: customMessage,
          };
          this.flowState.state.messages.push(message);
          this.flowState.toolCalls.push({
            toolName: normalizedToolId,
            params: args,
            result: content,
          });
          return message;
        }
      }
    }
    throw new Error(`Tool ${normalizedToolId} not found`);
  }

  isToolPending() {
    const lastMessage = this.getLastMessage();
    if (
      lastMessage &&
      lastMessage.llmMessage &&
      ("tool_calls" in lastMessage.llmMessage ||
        lastMessage.llmMessage.role === "tool")
    ) {
      return true;
    }
    return false;
  }

  hasStarted() {
    return this.flowState.startedAt !== undefined;
  }

  isToolCall(message: FlowMessage<CustomMessage>) {
    return message.llmMessage && "tool_calls" in message.llmMessage;
  }

  async stream(onDelta?: OnDelta): Promise<null | {
    messages: FlowMessage<CustomMessage>[];
    agentId: string;
  }> {
    const agentId = this.popNextAgent();

    if (!agentId) {
      return null;
    }

    if (!this.hasStarted()) {
      this.flowState.startedAt = Date.now();
    }

    const pendingToolCalls = this.getPendingToolCalls();
    if (pendingToolCalls.length > 0) {
      const call = pendingToolCalls[0];

      if (
        (this.maxToolCalls &&
          this.flowState.toolCalls.length >= this.maxToolCalls) ||
        (this.maxCost !== undefined &&
          this.flowState.usage.cost >= this.maxCost)
      ) {
        console.log("Tool call limit reached", {
          cost: this.flowState.usage.cost,
          maxCost: this.maxCost,
          toolCalls: this.flowState.toolCalls.length,
          maxToolCalls: this.maxToolCalls,
        });
        const message: FlowMessage<CustomMessage> = {
          llmMessage: {
            role: "tool",
            content: multiLinePrompt([
              "Tool call limit reached",
              "You cannot call any more tools.",
              "Please provide your final answer based on the information you have gathered so far.",
            ]),
            tool_call_id: call.toolCall.id,
          },
          agentId,
        };
        this.flowState.state.messages.push(message);
        if (pendingToolCalls.length > 1) {
          this.flowState.nextAgentIds = [
            agentId,
            ...this.flowState.nextAgentIds,
          ];
        }
        return {
          messages: [message],
          agentId,
        };
      }

      const message = await this.runTool(
        call.toolCall.id,
        call.toolCall.function.name,
        JSON.parse(call.toolCall.function.arguments || "{}")
      );
      if (pendingToolCalls.length > 1) {
        this.flowState.nextAgentIds = [agentId, ...this.flowState.nextAgentIds];
      }
      return {
        messages: [message],
        agentId,
      };
    }

    const result = await handleStream(
      await this.getAgent(agentId)!.stream(
        this.flowState.state.messages.map((m) => m.llmMessage)
      ),
      onDelta
    );

    this.addUsage(result.usage);

    const newMessages = result.messages.map((message) => ({
      llmMessage: message,
      agentId,
    }));
    this.flowState.state.messages = [
      ...this.flowState.state.messages,
      ...newMessages,
    ];

    if (this.isToolCall(this.getLastMessage())) {
      const newNextAgentIds = [agentId];
      if (this.repeatToolAgent) {
        newNextAgentIds.push(agentId);
      }
      this.flowState.nextAgentIds = [
        ...newNextAgentIds,
        ...this.flowState.nextAgentIds,
      ];
    }

    return { messages: newMessages, agentId };
  }

  addMessage(message: FlowMessage<CustomMessage>) {
    this.flowState.state.messages.push(message);
  }

  addNextAgents(agentIds: string[]) {
    if (this.isToolPending() || this.getPendingToolCalls().length !== 0) {
      throw new Error("Cannot add next agents while tool is pending");
    }
    this.flowState.nextAgentIds = [...this.flowState.nextAgentIds, ...agentIds];
  }

  popNextAgent() {
    return this.flowState.nextAgentIds.shift();
  }

  getPendingToolCalls() {
    const toolCalls: Record<
      string,
      { toolCall: ChatCompletionMessageToolCall; agentId?: string }
    > = {};
    for (const message of this.flowState.state.messages) {
      if (this.isToolCall(message)) {
        const llmMessage =
          message.llmMessage as ChatCompletionAssistantMessageParam;
        for (const toolCall of llmMessage.tool_calls!) {
          toolCalls[toolCall.id] = { toolCall, agentId: message.agentId };
        }
      }
      if (message.llmMessage.role === "tool") {
        const toolCall = message.llmMessage as ChatCompletionToolMessageParam;
        delete toolCalls[toolCall.tool_call_id];
      }
    }
    return Object.values(toolCalls);
  }
}
