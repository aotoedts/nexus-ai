import { QwenAdapter } from './QwenAdapter.js';

export class OpenAICompatibleAdapter extends QwenAdapter {
  readonly providerName: string = 'openai_compatible';
}
