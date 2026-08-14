import {
  IModelAdapter,
  ChatMessageInput,
  ChatMessageContentPart,
  CompletionOptions,
  CompletionResult,
} from './IModelAdapter.js';
import { QwenAdapter } from './QwenAdapter.js';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';

/**
 * Adaptador para a API nativa da Anthropic (Claude), usado como "cerebro"
 * de raciocinio/agente. Embeddings continuam delegados ao QwenAdapter
 * (OpenRouter), pois a Anthropic nao expoe endpoint de embeddings.
 */
export class AnthropicAdapter implements IModelAdapter {
  readonly providerName: string = 'anthropic';
  private embeddingDelegate = new QwenAdapter();

  constructor(
    private apiKey: string = env.ANTHROPIC_API_KEY,
    private modelName: string = env.ANTHROPIC_MODEL_NAME,
  ) {}

  private headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  private splitSystem(messages: ChatMessageInput[]): { system: string; rest: ChatMessageInput[] } {
    const systemMsgs = messages.filter((m) => m.role === 'system');
    const rest = messages.filter((m) => m.role !== 'system');
    const system = systemMsgs
      .map((m) => (typeof m.content === 'string' ? m.content : ''))
      .join('\n');
    return { system, rest };
  }

  private toAnthropicContent(content: string | ChatMessageContentPart[]): any {
    if (typeof content === 'string') return content;
    return content.map((part) => {
      if (part.type === 'text') {
        return { type: 'text', text: part.text ?? '' };
      }
      const url = part.image_url?.url ?? '';
      const match = url.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        return {
          type: 'image',
          source: { type: 'base64', media_type: match[1], data: match[2] },
        };
      }
      return { type: 'text', text: '[imagem invalida]' };
    });
  }

  private toAnthropicMessages(messages: ChatMessageInput[]) {
    return messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: this.toAnthropicContent(m.content) }));
  }

  private mapFinishReason(stopReason: string | null): CompletionResult['finishReason'] {
    if (stopReason === 'tool_use') return 'tool_call';
    if (stopReason === 'max_tokens') return 'length';
    return 'stop';
  }

  async complete(
    messages: ChatMessageInput[],
    options: CompletionOptions = {},
  ): Promise<CompletionResult> {
    const { system, rest } = this.splitSystem(messages);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.modelName,
        system: system || undefined,
        messages: this.toAnthropicMessages(rest),
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        tools: options.tools?.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ errText }, 'Falha ao chamar a API da Anthropic');
      throw new Error(`AnthropicAdapter: falha na chamada (${response.status})`);
    }

    const data = (await response.json()) as any;
    const textBlocks = data.content?.filter((b: any) => b.type === 'text') ?? [];
    const toolBlocks = data.content?.filter((b: any) => b.type === 'tool_use') ?? [];

    return {
      content: textBlocks.map((b: any) => b.text).join(''),
      toolCalls: toolBlocks.length
        ? toolBlocks.map((b: any) => ({ toolName: b.name, arguments: b.input ?? {} }))
        : undefined,
      finishReason: this.mapFinishReason(data.stop_reason),
      usage: data.usage
        ? { promptTokens: data.usage.input_tokens, completionTokens: data.usage.output_tokens }
        : undefined,
    };
  }

  async stream(
    messages: ChatMessageInput[],
    onToken: (token: string) => void,
    options: CompletionOptions = {},
  ): Promise<CompletionResult> {
    const { system, rest } = this.splitSystem(messages);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.modelName,
        system: system || undefined,
        messages: this.toAnthropicMessages(rest),
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => '');
      logger.error({ errText }, 'Falha no streaming da Anthropic');
      throw new Error(`AnthropicAdapter: falha no streaming (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((l) => l.startsWith('data:'));

      for (const line of lines) {
        const payload = line.replace('data:', '').trim();
        if (!payload) continue;
        try {
          const json = JSON.parse(payload);
          if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
            const token = json.delta.text;
            fullContent += token;
            onToken(token);
          }
        } catch {
          // ignora linhas parciais/invalidas do stream SSE
        }
      }
    }

    return { content: fullContent, finishReason: 'stop' };
  }

  async embed(text: string): Promise<number[]> {
    return this.embeddingDelegate.embed(text);
  }
}
