import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../core/infrastructure/database/prisma/client.js';

/**
 * Rotas do painel administrativo: metricas gerais, gestao de usuarios
 * e visualizacao de logs de auditoria. Protegidas por autenticacao +
 * exigencia de role ADMIN.
 */
export async function adminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requireAdmin);

  app.get('/admin/stats', async () => {
    const [users, conversations, messages, documents, memories] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.document.count(),
      prisma.memory.count(),
    ]);
    return { users, conversations, messages, documents, memories };
  });

  app.get('/admin/users', async (request) => {
    const { page, pageSize } = z
      .object({ page: z.coerce.number().default(1), pageSize: z.coerce.number().default(20) })
      .parse(request.query);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.user.count(),
    ]);

    return { users, total, page, pageSize };
  });

  app.patch('/admin/users/:id/role', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { role } = z.object({ role: z.enum(['USER', 'ADMIN']) }).parse(request.body);
    const user = await prisma.user.update({ where: { id }, data: { role } });
    return { user: { id: user.id, role: user.role } };
  });

  app.get('/admin/logs', async (request) => {
    const { page, pageSize, level } = z
      .object({
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().default(50),
        level: z.enum(['info', 'warn', 'error']).optional(),
      })
      .parse(request.query);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: level ? { level } : undefined,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where: level ? { level } : undefined }),
    ]);

    return { logs, total, page, pageSize };
  });

  app.get('/admin/agent-runs', async () => {
    const runs = await prisma.agentRun.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    return { runs };
  });
}
