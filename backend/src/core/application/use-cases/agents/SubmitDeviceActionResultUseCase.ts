import { AgentExecutor, AgentStep, PendingAction } from '../../../infrastructure/agents/AgentExecutor.js';
import { prisma } from '../../../infrastructure/database/prisma/client.js';
import { Prisma } from '@prisma/client';
import { ForbiddenError } from '../../../../shared/errors/AppError.js';

export interface SubmitDeviceActionResultInput {
  userId: string;
  runId: string;
  resultData: unknown;
}

export class SubmitDeviceActionResultUseCase {
  constructor(private executor: AgentExecutor) {}

  async execute(input: SubmitDeviceActionResultInput) {
    const run = await prisma.agentRun.findUnique({ where: { id: input.runId } });
    if (!run || run.userId !== input.userId) {
      throw new ForbiddenError('Execucao de agente nao encontrada.');
    }
    if (run.status !== 'AWAITING_DEVICE_ACTION' || !run.pendingAction) {
      throw new ForbiddenError('Esta execucao nao esta aguardando uma acao do dispositivo.');
    }

    try {
      const result = await this.executor.continueWithDeviceResult(
        run.goal,
        [],
        run.steps as unknown as AgentStep[],
        run.pendingAction as unknown as PendingAction,
        input.resultData,
      );

      if (result.status === 'awaiting_device_action') {
        await prisma.agentRun.update({
          where: { id: run.id },
          data: { steps: result.steps as any, status: 'AWAITING_DEVICE_ACTION', pendingAction: result.pendingAction as any },
        });
      } else if (result.status === 'awaiting_authorization') {
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
