import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaMemoryRepository } from '../../../core/infrastructure/repositories/PrismaMemoryRepository.js';
import { SaveMemoryUseCase } from '../../../core/application/use-cases/memory/SaveMemoryUseCase.js';
import { RetrieveRelevantMemoriesUseCase } from '../../../core/application/use-cases/memory/RetrieveRelevantMemoriesUseCase.js';
import { IModelAdapter } from '../../../core/infrastructure/ai/IModelAdapter.js';

export async function memoryRoutes(app: FastifyInstance, opts: { model: IModelAdapter }) {
  const repository = new PrismaMemoryRepository();
  const saveMemory = new SaveMemoryUseCase(repository, opts.model);
  const retrieveMemories = new RetrieveRelevantMemoriesUseCase(repository, opts.model);

  app.get('/memory', { onRequest: [app.authenticate] }, async (request) => {
    const memories = await repository.listByUser(request.user.sub);
    return { memories };
  });

  app.post('/memory', { onRequest: [app.authenticate] }, async (request) => {
    const body = z
      .object({
        content: z.string().min(1),
        kind: z.enum(['fact', 'preference', 'event', 'summary']).optional(),
        importance: z.number().min(1).max(5).optional(),
      })
      .parse(request.body);

    const memory = await saveMemory.execute({ userId: request.user.sub, ...body });
    return { memory };
  });

  app.post('/memory/search', { onRequest: [app.authenticate] }, async (request) => {
    const body = z.object({ query: z.string().min(1), topK: z.number().optional() }).parse(request.body);
    const results = await retrieveMemories.execute(request.user.sub, body.query, body.topK ?? 5);
    return { results };
  });

  app.delete('/memory/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await repository.delete(id);
    return reply.status(204).send();
  });
}
