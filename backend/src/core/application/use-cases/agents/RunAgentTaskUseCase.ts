import { v4 as uuid } from 'uuid';
import { AgentExecutor } from '../../../infrastructure/agents/AgentExecutor.js';
import { prisma } from '../../../infrastructure/database/prisma/client.js';

export interface RunAgentTaskInput {
  conversationId: string;
  goal: string;
}

/**
 * Orquestra a execucao de uma tarefa em multiplas etapas pelo agente,
 * persistindo o plano de execucao (steps) para auditoria e exibicao
 * no painel administrativo.
 */
export class RunAgentTaskUseCase {
  constructor(private executor: AgentExecutor) {}

  async execute(input: RunAgentTaskInput) {
    const run = await prisma.agentRun.create({
      data: {
        id: uuid(),
        conversationId: input.conversationId,
        goal: input.goal,
        steps: [],
        status: 'running',
      },
    });

    try {
      const result = await this.executor.run(input.goal);
      await prisma.agentRun.update({
        where: { id: run.id },
        data: { steps: result.steps as any, status: result.status, finishedAt: new Date() },
      });
      return { runId: run.id, ...result };
    } catch (err) {
      await prisma.agentRun.update({
        where: { id: run.id },
        data: { status: 'failed', finishedAt: new Date() },
      });
      throw err;
    }
  }
}
