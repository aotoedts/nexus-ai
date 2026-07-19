import { FastifyInstance } from 'fastify';
import { prisma } from '../../../core/infrastructure/database/prisma/client.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  app.get('/health/deep', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch {
      return reply.status(503).send({ status: 'degraded', database: 'disconnected' });
    }
  });
}
