import { QwenAdapter } from './QwenAdapter.js';
import { env } from '../../../config/env.js';

/**
 * Adaptador para o Ollama rodando um modelo Qwen open source localmente
 * (ex: `ollama run qwen3:8b`). O Ollama expoe uma API compativel com a
 * da OpenAI em `/v1`, entao reaproveitamos a mesma logica do
 * QwenAdapter - a unica diferenca real e o nome do provider e os
 * valores padrao (sem necessidade de API key).
 *
 * Nenhum dado sai da sua maquina/rede quando esse adaptador e usado.
 */
export class OllamaAdapter extends QwenAdapter {
  readonly providerName: string = 'ollama';

  constructor() {
    super(env.AI_BASE_URL, env.AI_API_KEY || 'ollama', env.AI_MODEL_NAME);
  }
}
