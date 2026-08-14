import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AgentExecutor } from '../../../core/infrastructure/agents/AgentExecutor.js';
import { RunAgentTaskUseCase } from '../../../core/application/use-cases/agents/RunAgentTaskUseCase.js';
import { IModelAdapter } from '../../../core/infrastructure/ai/IModelAdapter.js';
import { ToolRegistry } from '../../../core/infrastructure/tools/ToolRegistry.js';
import { prisma } from '../../../core/infrastructure/database/prisma/client.js';

const runSchema = z.object({ conversationId: z.string().uuid(), goal: z.string().min(1) });

export async function agentsRoutes(app: FastifyInstance, opts: { model: IModelAdapter; tools: ToolRegistry }) {
  const executor = new AgentExecutor(opts.model, opts.tools);
  const runAgentTask = new RunAgentTaskUseCase(executor);

  app.post('/agents/run', { onRequest: [app.authenticate] }, async (request) => {
    const body = runSchema.parse(request.body);
    return runAgentTask.execute({ userId: request.user.sub, ...body });
  });

  app.get('/agents/tools', { onRequest: [app.authenticate] }, async () => ({
    tools: opts.tools.list().map((t) => ({ name: t.name, description: t.description })),
  }));

  app.get('/agents/status', { onRequest: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    return { agentEnabled: user?.agentEnabled ?? false };
  });

  app.patch('/agents/status', { onRequest: [app.authenticate] }, async (request) => {
    const body = z.object({ agentEnabled: z.boolean() }).parse(request.body);
    await prisma.user.update({
      where: { id: request.user.sub },
      data: { agentEnabled: body.agentEnabled },
    });
    return { agentEnabled: body.agentEnabled };
  });
}
