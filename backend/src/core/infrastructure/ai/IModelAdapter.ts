/**
 * Contrato que qualquer modelo de IA (Qwen, Llama, GPT, Mistral, etc.)
 * precisa implementar para ser plugado no Nexus AI.
 *
 * Isso permite trocar o "cerebro" do assistente sem alterar nenhuma
 * camada de aplicacao (use-cases) ou de interface (rotas HTTP).
 */

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
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
  /** Identificador do provider, ex: "qwen", "openai_compatible", "mock" */
  readonly providerName: string;

  /** Gera uma resposta de chat completa (nao-streaming). */
  complete(messages: ChatMessageInput[], options?: CompletionOptions): Promise<CompletionResult>;

  /** Gera uma resposta em streaming, chamando onToken a cada pedaco recebido. */
  stream(
    messages: ChatMessageInput[],
    onToken: (token: string) => void,
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Gera embeddings vetoriais para um texto (usado em memoria e RAG). */
  embed(text: string): Promise<number[]>;
}
