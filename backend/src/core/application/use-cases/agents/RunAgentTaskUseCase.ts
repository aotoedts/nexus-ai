import { v4 as uuid } from 'uuid';
import { AgentExecutor } from '../../../infrastructure/agents/AgentExecutor.js';
import { prisma } from '../../../infrastructure/database/prisma/client.js';
import { ForbiddenError } from '../../../../shared/errors/AppError.js';

export interface RunAgentTaskInput {
  userId: string;
  conversationId: string;
  goal: string;
}

export class RunAgentTaskUseCase {
  constructor(private executor: AgentExecutor) {}

  async execute(input: RunAgentTaskInput) {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user?.agentEnabled) {
      throw new ForbiddenError('O agente esta desativado. Ative-o nas configuracoes para permitir execucao autonoma.');
    }

    const run = await prisma.agentRun.create({
      data: {
        id: uuid(),
        userId: input.userId,
        conversationId: input.conversationId,
        goal: input.goal,
        steps: [],
        status: 'EXECUTING',
      },
    });

    try {
      const result = await this.executor.run(input.goal);
      await prisma.agentRun.update({
        where: { id: run.id },
        data: { steps: result.steps as any, status: result.status === 'completed' ? 'COMPLETED' : 'FAILED', finishedAt: new Date() },
      });
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
