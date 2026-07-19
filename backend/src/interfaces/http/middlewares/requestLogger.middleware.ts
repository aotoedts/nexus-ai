import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../config/logger.js';

/** Loga cada requisicao HTTP finalizada, com metodo, rota, status e duracao. */
export async function registerRequestLogger(app: FastifyInstance) {
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTimeMs: reply.elapsedTime,
      },
      'request finalizada',
    );
  });
}
