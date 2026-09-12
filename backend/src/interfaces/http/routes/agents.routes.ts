import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AgentExecutor } from '../../../core/infrastructure/agents/AgentExecutor.js';
import { RunAgentTaskUseCase } from '../../../core/application/use-cases/agents/RunAgentTaskUseCase.js';
import { AuthorizeAgentActionUseCase } from '../../../core/application/use-cases/agents/AuthorizeAgentActionUseCase.js';
import { SubmitDeviceActionResultUseCase } from '../../../core/application/use-cases/agents/SubmitDeviceActionResultUseCase.js';
import { ForbiddenError } from '../../../shared/errors/AppError.js';
import { IModelAdapter } from '../../../core/infrastructure/ai/IModelAdapter.js';
import { ToolRegistry } from '../../../core/infrastructure/tools/ToolRegistry.js';
import { prisma } from '../../../core/infrastructure/database/prisma/client.js';

const runSchema = z.object({ conversationId: z.string().uuid(), goal: z.string().min(1) });
const authorizeSchema = z.object({ stepId: z.string().optional(), authorized: z.boolean() });
const cancelSchema = z.object({ action: z.literal('cancel') });
const deviceResultSchema = z.object({ resultData: z.unknown() });

const STATUS_MAP: Record<string, string> = {
  PLANNING: 'planning',
  EXECUTING: 'running',
  AWAITING_AUTHORIZATION: 'awaiting_authorization',
  AWAITING_DEVICE_ACTION: 'awaiting_device_action',
  COMPLETED: 'completed',
  FAILED: 'error',
  CANCELLED: 'cancelled',
};

interface RawStep {
  type: 'thought' | 'tool_call' | 'tool_result' | 'final_answer';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

interface MappedStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  result?: string;
  error?: string;
}

// Traduz o log de eventos internos do AgentExecutor (thought/tool_call/tool_result/final_answer)
// para o formato de "passos com status" que a UI do app mobile espera.
function mapSteps(rawSteps: RawStep[]): MappedStep[] {
  const mapped: MappedStep[] = [];
  let i = 0;

  while (i < rawSteps.length) {
    const step = rawSteps[i];

    if (step.type === 'thought') {
      mapped.push({ id: `step-${i}`, title: 'Pensando', description: step.content, status: 'completed' });
      i++;
      continue;
    }

    if (step.type === 'tool_call') {
      const next = rawSteps[i + 1];
      const hasResult = next?.type === 'tool_result' && next.toolName === step.toolName;

      if (!hasResult) {
        // Chamada sem resultado ainda registrado: aguardando autorizacao ou em andamento
        mapped.push({
          id: `step-${i}`,
          title: `Executar ${step.toolName}`,
          description: step.content,
          status: 'in_progress',
        });
        i++;
        continue;
      }

      let resultText = next!.content;
      let failed = false;
      try {
        const parsed = JSON.parse(next!.content);
        if (parsed.success === false) {
          failed = true;
          resultText = parsed.error ?? next!.content;
        } else if (parsed.data !== undefined) {
          resultText = JSON.stringify(parsed.data);
        }
      } catch {
        // conteudo nao era JSON, mantem como texto puro
      }

      mapped.push({
        id: `step-${i}`,
        title: `Executar ${step.toolName}`,
        description: step.content,
        status: failed ? 'error' : 'completed',
        result: failed ? undefined : resultText,
        error: failed ? resultText : undefined,
      });
      i += 2;
      continue;
    }

    if (step.type === 'tool_result') {
      // resultado orfao (nao deveria ocorrer no fluxo normal), registra mesmo assim
      mapped.push({ id: `step-${i}`, title: `Resultado de ${step.toolName ?? 'ferramenta'}`, status: 'completed', result: step.content });
      i++;
      continue;
    }

    if (step.type === 'final_answer') {
      mapped.push({ id: `step-${i}`, title: 'Resposta final', status: 'completed', result: step.content });
      i++;
      continue;
    }

    i++;
  }

  return mapped;
}

function mapAgentRun(run: {
  id: string;
  conversationId: string;
  status: string;
  goal: string;
  steps: unknown;
  pendingAction: unknown;
  createdAt: Date;
  finishedAt: Date | null;
}) {
  const rawSteps = (run.steps as RawStep[]) ?? [];
  const mappedSteps = mapSteps(rawSteps);
  const status = STATUS_MAP[run.status] ?? run.status.toLowerCase();

  const finalAnswerStep = mappedSteps.find((s) => s.title === 'Resposta final');
  const pending = run.pendingAction as { toolName: string; arguments: Record<string, unknown>; description: string } | null;

  return {
    id: run.id,
    conversationId: run.conversationId,
    status,
    objective: run.goal,
    startedAt: run.createdAt.toISOString(),
    updatedAt: (run.finishedAt ?? run.createdAt).toISOString(),
    completedAt: run.finishedAt ? run.finishedAt.toISOString() : undefined,
    steps: mappedSteps,
    currentStepIndex: mappedSteps.length > 0 ? mappedSteps.length - 1 : 0,
    pendingAuthorization: pending
      ? {
          stepId: mappedSteps.length > 0 ? mappedSteps[mappedSteps.length - 1].id : `step-${rawSteps.length - 1}`,
          prompt: pending.description,
          action: pending.toolName,
          details: pending.arguments,
        }
      : undefined,
    result: status === 'completed' ? finalAnswerStep?.result : undefined,
    error: status === 'error' ? { code: 'AGENT_RUN_FAILED', message: 'A execucao do agente falhou.' } : undefined,
  };
}

export async function agentsRoutes(app: FastifyInstance, opts: { model: IModelAdapter; tools: ToolRegistry }) {
  const executor = new AgentExecutor(opts.model, opts.tools);
  const runAgentTask = new RunAgentTaskUseCase(executor);
  const authorizeAgentAction = new AuthorizeAgentActionUseCase(executor);
  const submitDeviceActionResult = new SubmitDeviceActionResultUseCase(executor);

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

  app.post('/agents/run/:id/device-result', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = deviceResultSchema.parse(request.body);
    await submitDeviceActionResult.execute({ userId: request.user.sub, runId: id, resultData: body.resultData });
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
