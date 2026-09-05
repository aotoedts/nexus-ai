import { IModelAdapter, StreamOptions, ToolDefinition } from './IModelAdapter';

interface OpenRouterMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export class OpenRouterAdapter implements IModelAdapter {
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
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: StreamOptions
  ): Promise<string> {
    try {
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
          messages,
          max_tokens: options?.maxTokens || 1024,
          temperature: options?.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`OpenRouterAdapter: ${errorMessage}`);
    }
  }

  async *streamComplete(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: StreamOptions
  ): AsyncGenerator<string> {
    try {
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
          messages,
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
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content || '';
            if (content) yield content;
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      throw new Error(
        `OpenRouterAdapter streaming: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async embedText(text: string): Promise<number[]> {
    // OpenRouter não tem embeddings nativos, delegar pra outro adapter
    throw new Error('OpenRouter does not support embeddings. Use a dedicated embedding model.');
  }

  async callTool(
    toolName: string,
    params: Record<string, any>
  ): Promise<string> {
    throw new Error('Tool calling not yet implemented for OpenRouter');
  }

  supportsStreaming(): boolean {
    return true;
  }

  supportsToolCalling(): boolean {
    return false;
  }

  supportsEmbeddings(): boolean {
    return false;
  }

  getName(): string {
    return `OpenRouter (${this.modelName})`;
  }
}
