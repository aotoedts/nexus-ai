import { AgentExecutor, AgentStep, PendingAction } from '../../../infrastructure/agents/AgentExecutor.js';
import { prisma } from '../../../infrastructure/database/prisma/client.js';
import { Prisma } from '@prisma/client';
import { ForbiddenError } from '../../../../shared/errors/AppError.js';

export interface AuthorizeAgentActionInput {
  userId: string;
  runId: string;
  approved: boolean;
}

export class AuthorizeAgentActionUseCase {
  constructor(private executor: AgentExecutor) {}

  async execute(input: AuthorizeAgentActionInput) {
    const run = await prisma.agentRun.findUnique({ where: { id: input.runId } });
    if (!run || run.userId !== input.userId) {
      throw new ForbiddenError('Execucao de agente nao encontrada.');
    }
    if (run.status !== 'AWAITING_AUTHORIZATION' || !run.pendingAction) {
      throw new ForbiddenError('Esta execucao nao esta aguardando autorizacao.');
    }

    try {
      const result = await this.executor.authorize(
        run.goal,
        [],
        run.steps as unknown as AgentStep[],
        run.pendingAction as unknown as PendingAction,
        input.approved,
      );

      if (result.status === 'awaiting_authorization') {
        await prisma.agentRun.update({
          where: { id: run.id },
          data: { steps: result.steps as any, status: 'AWAITING_AUTHORIZATION', pendingAction: result.pendingAction as any },
        });
      } else {
        await prisma.agentRun.update({
          where: { id: run.id },
          data: {
            steps: result.steps as any,
            status: result.status === 'completed' ? 'COMPLETED' : 'FAILED',
            finishedAt: new Date(),
            pendingAction: Prisma.JsonNull,
          },
        });
      }

      return { runId: run.id, ...result };
    } catch (err) {
      await prisma.agentRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', finishedAt: new Date() },
      });
      throw err;
    }
  }
}
