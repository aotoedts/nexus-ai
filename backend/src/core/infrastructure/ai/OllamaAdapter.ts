import { QwenAdapter } from './QwenAdapter.js';
import { env } from '../../../config/env.js';

/**
 * Adaptador para o Ollama rodando um modelo Qwen open source localmente
 * (ex: `ollama run qwen3:4b`). O Ollama expoe uma API compativel com a
 * da OpenAI em `/v1`, entao reaproveitamos a mesma logica do
 * QwenAdapter (que ja fala esse protocolo) - a unica diferenca real e
 * o nome do provider e os valores padrao (sem necessidade de API key).
 *
 * Nenhum dado sai da sua maquina/rede quando esse adaptador e usado:
 * toda chamada vai direto para o Ollama, sem passar por nenhum servico
 * de terceiros.
 */
export class OllamaAdapter extends QwenAdapter {
  readonly providerName: string = 'ollama';

  constructor() {
    // Ollama nao exige API key; qualquer valor nao-vazio satisfaz o
    // header Authorization, que o Ollama simplesmente ignora.
    super(env.AI_BASE_URL, env.AI_API_KEY || 'ollama', env.AI_MODEL_NAME);
  }
}
