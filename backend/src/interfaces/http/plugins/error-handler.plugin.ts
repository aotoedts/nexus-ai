import fp from 'fastify-plugin';
import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../../shared/errors/AppError.js';
import { logger } from '../../../config/logger.js';
import { ZodError } from 'zod';

/**
 * Handler global de erros. Centraliza o tratamento para que rotas nao
 * precisem de try/catch repetitivo: erros de negocio (AppError) viram
 * respostas HTTP previsiveis, e erros inesperados sao logados como 500
 * sem vazar detalhes internos para o cliente.
 */
export const errorHandlerPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error: FastifyError | AppError | ZodError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'Dados invalidos', details: error.flatten() },
      });
    }

    const fastifyErr = error as FastifyError;
    if (fastifyErr.statusCode && fastifyErr.statusCode < 500) {
      return reply.status(fastifyErr.statusCode).send({
        error: { code: fastifyErr.code ?? 'BAD_REQUEST', message: fastifyErr.message },
      });
    }

    logger.error({ err: error, url: request.url }, 'Erro interno nao tratado');
    return reply.status(500).send({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Ocorreu um erro interno. Tente novamente.' },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: { code: 'ROUTE_NOT_FOUND', message: `Rota ${request.url} nao encontrada` } });
  });
});
