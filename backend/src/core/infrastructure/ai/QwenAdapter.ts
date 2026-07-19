import {
  IModelAdapter,
  ChatMessageInput,
  CompletionOptions,
  CompletionResult,
} from './IModelAdapter.js';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';

/**
 * Adaptador para modelos Qwen expostos via um servidor compativel com a API
 * OpenAI (ex: vLLM, Ollama, LM Studio, Text Generation Inference, SGLang).
 *
 * Basta apontar AI_BASE_URL para o endpoint do servidor rodando o Qwen.
 * Nenhuma outra camada do sistema precisa saber que o modelo eh o Qwen -
 * o restante do app conversa apenas com a interface IModelAdapter.
 */
export class QwenAdapter implements IModelAdapter {
  readonly providerName = 'qwen';

  constructor(
    private baseUrl: string = env.AI_BASE_URL,
    private apiKey: string = env.AI_API_KEY,
    private modelName: string = env.AI_MODEL_NAME,
  ) {}

  async complete(
    messages: ChatMessageInput[],
    options: CompletionOptions = {},
  ): Promise<CompletionResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.modelName,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
        tools: options.tools?.map((t) => ({
          type: 'function',
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ errText }, 'Falha ao chamar o servidor Qwen');
      throw new Error(`QwenAdapter: falha na chamada (${response.status})`);
    }

    const data = (await response.json()) as any;
    const choice = data.choices?.[0];
    const toolCalls = choice?.message?.tool_calls?.map((tc: any) => ({
      toolName: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}'),
    }));

    return {
      content: choice?.message?.content ?? '',
      toolCalls,
      finishReason: toolCalls?.length ? 'tool_call' : (choice?.finish_reason ?? 'stop'),
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined,
    };
  }

  async stream(
    messages: ChatMessageInput[],
    onToken: (token: string) => void,
    options: CompletionOptions = {},
  ): Promise<CompletionResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.modelName,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`QwenAdapter: falha no streaming (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((l) => l.trim().startsWith('data:'));

      for (const line of lines) {
        const payload = line.replace('data:', '').trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const token = json.choices?.[0]?.delta?.content;
          if (token) {
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
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: env.AI_EMBEDDING_MODEL, input: text }),
    });

    if (!response.ok) {
      throw new Error(`QwenAdapter: falha ao gerar embedding (${response.status})`);
    }

    const data = (await response.json()) as any;
    return data.data?.[0]?.embedding ?? [];
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }
}
