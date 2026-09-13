import { logger } from '../../../config/logger.js';
import {
  IModelAdapter,
  ChatMessageInput,
  CompletionOptions,
  CompletionResult,
} from './IModelAdapter.js';

interface OpenRouterToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OpenRouterResponse {
  choices: Array<{
    message?: { content: string | null; tool_calls?: OpenRouterToolCall[] };
    delta?: { content?: string; tool_calls?: unknown };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export class OpenRouterAdapter implements IModelAdapter {
  readonly providerName = 'OpenRouter';
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'openai/gpt-4-turbo') {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async complete(
    messages: ChatMessageInput[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    try {
      const formattedMessages = messages.map((msg) => {
        const base: Record<string, unknown> = {
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : msg.content[0]?.text || '',
        };
        if (msg.tool_calls) base.tool_calls = msg.tool_calls;
        if (msg.tool_call_id) base.tool_call_id = msg.tool_call_id;
        return base;
      });

      const body: Record<string, unknown> = {
        model: this.modelName,
        messages: formattedMessages,
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature ?? 0.7,
      };

      if (options?.tools && options.tools.length > 0) {
        body.tools = options.tools.map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        }));
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://nexus-ai.com',
          'X-Title': 'Nexus AI',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const message = data.choices[0]?.message;
      const content = message?.content || '';
      const rawToolCalls = message?.tool_calls || [];

      const toolCalls = rawToolCalls.map((tc) => {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments);
        } catch {
          logger.warn({ raw: tc.function.arguments }, 'Falha ao parsear argumentos da tool_call');
        }
        return { toolName: tc.function.name, arguments: parsedArgs, id: tc.id };
      });

      return {
        content,
        toolCalls,
        finishReason: toolCalls.length > 0 ? 'tool_call' : 'stop',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      throw new Error(
        `OpenRouterAdapter.complete: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async stream(
    messages: ChatMessageInput[],
    onToken: (token: string) => void,
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    try {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content[0]?.text || '',
      }));

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://nexus-ai.com',
          'X-Title': 'Nexus AI',
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: formattedMessages,
          stream: true,
          max_tokens: options?.maxTokens || 1024,
          temperature: options?.temperature ?? 0.7,
          ...(options?.tools && options.tools.length > 0
            ? {
                tools: options.tools.map((t) => ({
                  type: 'function',
                  function: { name: t.name, description: t.description, parameters: t.parameters },
                })),
              }
            : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter streaming error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let totalContent = '';
      let promptTokens = 0;
      let completionTokens = 0;
        const toolCallAcc: Record<number, { id: string; name: string; arguments: string }> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data) as OpenRouterResponse;
              const deltaToolCalls = json.choices[0]?.delta?.tool_calls as
                | Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>
                | undefined;
              if (deltaToolCalls) {
                for (const dtc of deltaToolCalls) {
                  if (!toolCallAcc[dtc.index]) {
                    toolCallAcc[dtc.index] = { id: dtc.id || '', name: '', arguments: '' };
                  }
                  if (dtc.id) toolCallAcc[dtc.index].id = dtc.id;
                  if (dtc.function?.name) toolCallAcc[dtc.index].name += dtc.function.name;
                  if (dtc.function?.arguments) toolCallAcc[dtc.index].arguments += dtc.function.arguments;
                }
              }
            const token = json.choices[0]?.delta?.content || '';
            if (token) {
              totalContent += token;
              onToken(token);
            }
            if (json.usage) {
              promptTokens = json.usage.prompt_tokens;
              completionTokens = json.usage.completion_tokens;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

        const toolCalls = Object.values(toolCallAcc)
          .filter((tc) => tc.name)
          .map((tc) => {
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = JSON.parse(tc.arguments);
            } catch {
              logger.warn({ raw: tc.arguments }, 'Falha ao parsear argumentos da tool_call (stream)');
            }
            return { toolName: tc.name, arguments: parsedArgs, id: tc.id };
          });

        return {
          content: totalContent,
          toolCalls,
          finishReason: toolCalls.length > 0 ? 'tool_call' : 'stop',
          usage: {
            promptTokens,
            completionTokens,
          },
        };
    } catch (error) {
      throw new Error(
        `OpenRouterAdapter.stream: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async embed(text: string): Promise<number[]> {
    throw new Error(
      'OpenRouter does not support embeddings natively. Use a dedicated embedding adapter.'
    );
  }
}
