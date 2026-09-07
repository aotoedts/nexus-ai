import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AgentExecutor } from '../../../core/infrastructure/agents/AgentExecutor.js';
import { RunAgentTaskUseCase } from '../../../core/application/use-cases/agents/RunAgentTaskUseCase.js';
import { AuthorizeAgentActionUseCase } from '../../../core/application/use-cases/agents/AuthorizeAgentActionUseCase.js';
import { ForbiddenError } from '../../../shared/errors/AppError.js';
import { IModelAdapter } from '../../../core/infrastructure/ai/IModelAdapter.js';
import { ToolRegistry } from '../../../core/infrastructure/tools/ToolRegistry.js';
import { prisma } from '../../../core/infrastructure/database/prisma/client.js';

const runSchema = z.object({ conversationId: z.string().uuid(), goal: z.string().min(1) });
const authorizeSchema = z.object({ stepId: z.string().optional(), authorized: z.boolean() });
const cancelSchema = z.object({ action: z.literal('cancel') });

// Traduz o enum interno (Prisma, maiusculo) para o formato que o app mobile espera
const STATUS_MAP: Record<string, string> = {
  PLANNING: 'planning',
  EXECUTING: 'running',
  AWAITING_AUTHORIZATION: 'awaiting_authorization',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

function mapAgentRun(run: {
  id: string;
  status: string;
  goal: string;
  steps: unknown;
  pendingAction: unknown;
  createdAt: Date;
  finishedAt: Date | null;
}) {
  return {
    id: run.id,
    status: STATUS_MAP[run.status] ?? run.status.toLowerCase(),
    goal: run.goal,
    steps: run.steps,
    pendingAction: run.pendingAction,
    createdAt: run.createdAt,
    finishedAt: run.finishedAt,
  };
}

export async function agentsRoutes(app: FastifyInstance, opts: { model: IModelAdapter; tools: ToolRegistry }) {
  const executor = new AgentExecutor(opts.model, opts.tools);
  const runAgentTask = new RunAgentTaskUseCase(executor);
  const authorizeAgentAction = new AuthorizeAgentActionUseCase(executor);

  app.post('/agents/run', { onRequest: [app.authenticate] }, async (request) => {
    const body = runSchema.parse(request.body);
    const result = await runAgentTask.execute({ userId: request.user.sub, ...body });
    const run = await prisma.agentRun.findUnique({ where: { id: result.runId } });
    if (!run) throw new ForbiddenError('Execucao de agente nao encontrada.');
    return { agentRun: mapAgentRun(run) };
  });

  app.get('/agents/run/:id', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const run = await prisma.agentRun.findUnique({ where: { id } });
    if (!run || run.userId !== request.user.sub) {
      throw new ForbiddenError('Execucao de agente nao encontrada.');
    }
    return { agentRun: mapAgentRun(run) };
  });

  app.post('/agents/run/:id/authorize', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = authorizeSchema.parse(request.body);
    await authorizeAgentAction.execute({ userId: request.user.sub, runId: id, approved: body.authorized });
    const run = await prisma.agentRun.findUnique({ where: { id } });
    if (!run) throw new ForbiddenError('Execucao de agente nao encontrada.');
    return { agentRun: mapAgentRun(run) };
  });

  app.put('/agents/run/:id', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    cancelSchema.parse(request.body);
    const run = await prisma.agentRun.findUnique({ where: { id } });
    if (!run || run.userId !== request.user.sub) {
      throw new ForbiddenError('Execucao de agente nao encontrada.');
    }
    const updated = await prisma.agentRun.update({
      where: { id },
      data: { status: 'CANCELLED', finishedAt: new Date(), pendingAction: Prisma.JsonNull },
    });
    return { agentRun: mapAgentRun(updated) };
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
