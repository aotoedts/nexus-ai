import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AgentExecutor } from '../../../core/infrastructure/agents/AgentExecutor.js';
import { RunAgentTaskUseCase } from '../../../core/application/use-cases/agents/RunAgentTaskUseCase.js';
import { IModelAdapter } from '../../../core/infrastructure/ai/IModelAdapter.js';
import { ToolRegistry } from '../../../core/infrastructure/tools/ToolRegistry.js';

const runSchema = z.object({
  conversationId: z.string().uuid(),
  goal: z.string().min(1),
});

export async function agentsRoutes(app: FastifyInstance, opts: { model: IModelAdapter; tools: ToolRegistry }) {
  const executor = new AgentExecutor(opts.model, opts.tools);
  const runAgentTask = new RunAgentTaskUseCase(executor);

  app.post('/agents/run', { onRequest: [app.authenticate] }, async (request) => {
    const body = runSchema.parse(request.body);
    const result = await runAgentTask.execute(body);
    return result;
  });

  app.get('/agents/tools', { onRequest: [app.authenticate] }, async () => {
    return { tools: opts.tools.list().map((t) => ({ name: t.name, description: t.description })) };
  });
}
