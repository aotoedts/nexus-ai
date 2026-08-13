export interface ChatMessageContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ChatMessageContentPart[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ModelToolCall {
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface CompletionResult {
  content: string;
  toolCalls?: ModelToolCall[];
  finishReason: 'stop' | 'tool_call' | 'length' | 'error';
  usage?: { promptTokens: number; completionTokens: number };
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
}

export interface IModelAdapter {
  readonly providerName: string;
  complete(messages: ChatMessageInput[], options?: CompletionOptions): Promise<CompletionResult>;
  stream(
    messages: ChatMessageInput[],
    onToken: (token: string) => void,
    options?: CompletionOptions,
  ): Promise<CompletionResult>;
  embed(text: string): Promise<number[]>;
}
