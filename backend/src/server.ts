import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { disconnectDatabase } from './core/infrastructure/database/prisma/client.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(`Nexus AI backend rodando em http://${env.HOST}:${env.PORT}${env.API_PREFIX}`);
  } catch (err) {
    logger.error({ err }, 'Falha ao iniciar o servidor');
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info(`Recebido ${signal}, encerrando graciosamente...`);
    await app.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

main();
