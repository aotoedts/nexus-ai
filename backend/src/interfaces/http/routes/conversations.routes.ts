import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaConversationRepository } from '../../../core/infrastructure/repositories/PrismaConversationRepository.js';
import { NotFoundError, ForbiddenError } from '../../../shared/errors/AppError.js';

export async function conversationsRoutes(app: FastifyInstance) {
  const repository = new PrismaConversationRepository();

  app.get('/conversations', { onRequest: [app.authenticate] }, async (request) => {
    const conversations = await repository.listByUser(request.user.sub);
    return { conversations };
  });

  app.get('/conversations/:id/messages', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const conversation = await repository.findById(id);
    if (!conversation) throw new NotFoundError('Conversa');
    if (conversation.userId !== request.user.sub) throw new ForbiddenError();

    const messages = await repository.listMessages(id, 200);
    return { messages };
  });

  app.patch('/conversations/:id', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { title } = z.object({ title: z.string().min(1).max(100) }).parse(request.body);

    const conversation = await repository.findById(id);
    if (!conversation) throw new NotFoundError('Conversa');
    if (conversation.userId !== request.user.sub) throw new ForbiddenError();

    await repository.updateTitle(id, title);
    return { success: true };
  });

  app.delete('/conversations/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const conversation = await repository.findById(id);
    if (!conversation) throw new NotFoundError('Conversa');
    if (conversation.userId !== request.user.sub) throw new ForbiddenError();

    await repository.delete(id);
    return reply.status(204).send();
  });
}
