import 'dotenv/config';
import { z } from 'zod';

/**
 * Schema unico e validado de todas as variaveis de ambiente do backend.
 * Se algo essencial faltar, a aplicacao falha rapido (fail-fast) na
 * inicializacao, com uma mensagem clara, em vez de quebrar em runtime.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL e obrigatoria'),

  JWT_SECRET: z.string().min(8, 'JWT_SECRET deve ter pelo menos 8 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: z.string().min(8),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  AI_PROVIDER: z.enum(['qwen', 'openai_compatible', 'mock']).default('mock'),
  AI_MODEL_NAME: z.string().default('qwen2.5-14b-instruct'),
  AI_BASE_URL: z.string().default('http://localhost:11434/v1'),
  AI_API_KEY: z.string().default(''),
  AI_EMBEDDING_MODEL: z.string().default('text-embedding-nexus'),
  AI_EMBEDDING_DIM: z.coerce.number().default(1536),

  WEB_SEARCH_PROVIDER: z.enum(['mock', 'tavily', 'serpapi']).default('mock'),
  WEB_SEARCH_API_KEY: z.string().default(''),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(25),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variaveis de ambiente invalidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
