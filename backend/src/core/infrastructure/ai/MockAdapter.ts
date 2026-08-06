import { IModelAdapter, ChatMessageInput, CompletionResult } from './IModelAdapter.js';

export class MockAdapter implements IModelAdapter {
  readonly providerName = 'mock';

  async complete(messages: ChatMessageInput[]): Promise<CompletionResult> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    return {
      content: `[mock] Recebi: "${lastUserMessage?.content ?? ''}". Configure AI_PROVIDER=qwen|ollama e AI_BASE_URL para usar um modelo real.`,
      finishReason: 'stop',
    };
  }

  async stream(
    messages: ChatMessageInput[],
    onToken: (token: string) => void,
  ): Promise<CompletionResult> {
    const result = await this.complete(messages);
    for (const word of result.content.split(' ')) {
      onToken(word + ' ');
    }
    return result;
  }

  async embed(text: string): Promise<number[]> {
    const dim = 1536;
    const vector = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i++) {
      vector[i % dim] += text.charCodeAt(i) / 1000;
    }
    return vector;
  }
}
