import { IModelAdapter } from './IModelAdapter.js';
import { QwenAdapter } from './QwenAdapter.js';
import { OpenAICompatibleAdapter } from './OpenAICompatibleAdapter.js';
import { MockAdapter } from './MockAdapter.js';
import { env } from '../../../config/env.js';

/**
 * Factory central que decide, com base em AI_PROVIDER, qual implementacao
 * de IModelAdapter injetar no restante da aplicacao. Trocar de modelo de
 * IA no futuro (Qwen -> Llama -> modelo proprietario) significa apenas
 * adicionar uma nova classe aqui, sem tocar em use-cases ou rotas.
 */
export function createModelAdapter(): IModelAdapter {
  switch (env.AI_PROVIDER) {
    case 'qwen':
      return new QwenAdapter();
    case 'openai_compatible':
      return new OpenAICompatibleAdapter();
    case 'mock':
    default:
      return new MockAdapter();
  }
}
