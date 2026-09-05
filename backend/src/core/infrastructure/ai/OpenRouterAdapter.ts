import {
  IModelAdapter,
  ChatMessageInput,
  CompletionOptions,
  CompletionResult,
} from './IModelAdapter.js';

interface OpenRouterResponse {
  choices: Array<{
    message?: { content: string };
    delta?: { content?: string };
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
          max_tokens: options?.maxTokens || 1024,
          temperature: options?.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const content = data.choices[0]?.message?.content || '';

      return {
        content,
        toolCalls: [],
        finishReason: 'stop',
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

      return {
        content: totalContent,
        toolCalls: [],
        finishReason: 'stop',
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
