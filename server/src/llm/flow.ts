import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { FlowMessage, LlmMessage, State } from "./agentic";
import { Agent } from "./agentic";
import { handleStream, HandleStreamOptions } from "./stream";

type FlowState<CustomState, CustomMessage> = {
  state: State<CustomState, CustomMessage>;
  startedAt?: number;
  nextAgentIds: string[];
};

export class Flow<CustomState, CustomMessage> {
  private agents: Agent<CustomState, CustomMessage>[];
  public flowState: FlowState<CustomState, CustomMessage>;
  private repeatToolAgent: boolean;

  constructor(
    agents: Agent<CustomState, CustomMessage>[],
    state: State<CustomState, CustomMessage>,
    options?: { repeatToolAgent?: boolean }
  ) {
    this.agents = agents;
    this.flowState = {
      state,
      nextAgentIds: [],
    };
    this.repeatToolAgent = options?.repeatToolAgent ?? true;
  }

  getAgent(id: string) {
    return this.agents.find((agent) => agent.id === id);
  }

  getLastMessage() {
    return this.flowState.state.messages[
      this.flowState.state.messages.length - 1
    ];
  }

  async runTool(id: string, toolId: string, args: Record<string, any>) {
    for (const [agentId, agent] of Object.entries(this.agents)) {
      const tools = agent.getTools();
      if (!tools) {
        continue;
      }
      for (const tool of tools) {
        if (tool.id === toolId) {
          const { content, customMessage } = await tool.execute(args);
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
          return message;
        }
      }
    }
    throw new Error(`Tool ${toolId} not found`);
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

  async stream(options?: HandleStreamOptions): Promise<null | {
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
      await this.getAgent(agentId)!.stream(this.flowState.state),
      options
    );

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
    // TODO: Not optimal. Traverse from the end and if you find a non tool message break.
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
