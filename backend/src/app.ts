import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import path from 'node:path';

import { env } from './config/env.js';
import { logger } from './config/logger.js';

import { errorHandlerPlugin } from './interfaces/http/plugins/error-handler.plugin.js';
import { authPlugin } from './interfaces/http/plugins/auth.plugin.js';
import { websocketPlugin } from './interfaces/http/plugins/websocket.plugin.js';
import { registerRequestLogger } from './interfaces/http/middlewares/requestLogger.middleware.js';

import { healthRoutes } from './interfaces/http/routes/health.routes.js';
import { authRoutes } from './interfaces/http/routes/auth.routes.js';
import { conversationsRoutes } from './interfaces/http/routes/conversations.routes.js';
import { chatRoutes } from './interfaces/http/routes/chat.routes.js';
import { memoryRoutes } from './interfaces/http/routes/memory.routes.js';
import { documentsRoutes } from './interfaces/http/routes/documents.routes.js';
import { agentsRoutes } from './interfaces/http/routes/agents.routes.js';
import { adminRoutes } from './interfaces/http/routes/admin.routes.js';

import { createModelAdapter } from './core/infrastructure/ai/ModelAdapterFactory.js';
import { toolRegistry } from './core/infrastructure/tools/ToolRegistry.js';
import { CalculatorTool } from './core/infrastructure/tools/CalculatorTool.js';
import { WebSearchTool } from './core/infrastructure/tools/WebSearchTool.js';
import { PdfReaderTool } from './core/infrastructure/tools/PdfReaderTool.js';

/**
 * Monta e configura a instancia principal do Fastify: plugins de
 * infraestrutura (CORS, JWT, WebSocket, upload, arquivos estaticos),
 * tratamento global de erros, registro de ferramentas (sistema de
 * plugins) e todas as rotas da API REST, sob o prefixo API_PREFIX.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, trustProxy: true });

  // --- Infraestrutura basica ---
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(multipart, { limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 } });
  await app.register(staticPlugin, { root: path.resolve(env.UPLOAD_DIR), prefix: '/files/' });
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);
  await app.register(websocketPlugin);
  await registerRequestLogger(app);

  // --- Modelo de IA (adaptador plugavel) e ferramentas (sistema de plugins) ---
  const model = createModelAdapter();
  toolRegistry.register(new CalculatorTool());
  toolRegistry.register(new WebSearchTool());
  toolRegistry.register(new PdfReaderTool());
  logger.info({ provider: model.providerName }, 'Adaptador de IA inicializado');

  // --- Rotas da API REST, sob o prefixo configurado (ex: /api/v1) ---
  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
      await api.register(conversationsRoutes);
      await api.register(chatRoutes, { model });
      await api.register(memoryRoutes, { model });
      await api.register(documentsRoutes, { model });
      await api.register(agentsRoutes, { model, tools: toolRegistry });
      await api.register(adminRoutes);
    },
    { prefix: env.API_PREFIX },
  );

  return app;
}
