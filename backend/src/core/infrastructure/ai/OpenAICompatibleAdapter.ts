import { QwenAdapter } from './QwenAdapter.js';

/**
 * Qualquer servidor de inferencia compativel com a API da OpenAI
 * (vLLM, Ollama, LocalAI, Together AI, Groq, etc.) pode reaproveitar
 * exatamente a mesma implementacao usada pelo QwenAdapter, mudando
 * apenas baseUrl/model. Mantido como classe propria para deixar
 * explicita a possibilidade de customizar comportamento no futuro
 * sem quebrar o adaptador do Qwen.
 */
export class OpenAICompatibleAdapter extends QwenAdapter {
  readonly providerName = 'openai_compatible';
}
