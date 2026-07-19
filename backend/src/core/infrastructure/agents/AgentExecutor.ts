import { IModelAdapter, ChatMessageInput } from '../ai/IModelAdapter.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { logger } from '../../../config/logger.js';

export interface AgentStep {
  type: 'thought' | 'tool_call' | 'tool_result' | 'final_answer';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

export interface AgentRunResult {
  steps: AgentStep[];
  finalAnswer: string;
  status: 'completed' | 'failed';
}

/**
 * Executor de agentes: implementa um loop ReAct simplificado
 * (Reason -> Act -> Observe) que permite ao modelo de IA executar
 * tarefas em multiplas etapas, usando ferramentas do ToolRegistry,
 * ate chegar a uma resposta final ou atingir o limite de iteracoes.
 */
export class AgentExecutor {
  constructor(
    private model: IModelAdapter,
    private tools: ToolRegistry,
    private maxIterations = 6,
  ) {}

  async run(goal: string, conversationHistory: ChatMessageInput[] = []): Promise<AgentRunResult> {
    const steps: AgentStep[] = [];
    const messages: ChatMessageInput[] = [
      {
        role: 'system',
        content:
          'Voce e o Nexus AI, um agente que resolve tarefas passo a passo. ' +
          'Use ferramentas quando necessario. Quando tiver certeza da resposta final, responda diretamente.',
      },
      ...conversationHistory,
      { role: 'user', content: goal },
    ];

    for (let i = 0; i < this.maxIterations; i++) {
      const result = await this.model.complete(messages, {
        tools: this.tools.toModelDefinitions(),
      });

      if (result.finishReason === 'tool_call' && result.toolCalls?.length) {
        for (const call of result.toolCalls) {
          steps.push({ type: 'tool_call', content: `Chamando ${call.toolName}`, toolName: call.toolName, toolArgs: call.arguments });

          const tool = this.tools.get(call.toolName);
          if (!tool) {
            steps.push({ type: 'tool_result', content: `Ferramenta ${call.toolName} nao encontrada` });
            continue;
          }

          const toolResult = await tool.execute(call.arguments);
          steps.push({
            type: 'tool_result',
            content: JSON.stringify(toolResult),
            toolName: call.toolName,
          });

          messages.push({
            role: 'assistant',
            content: `Chamei a ferramenta ${call.toolName} com argumentos ${JSON.stringify(call.arguments)}`,
          });
          messages.push({
            role: 'tool',
            content: JSON.stringify(toolResult),
          });
        }
        continue;
      }

      steps.push({ type: 'final_answer', content: result.content });
      return { steps, finalAnswer: result.content, status: 'completed' };
    }

    logger.warn({ goal }, 'AgentExecutor atingiu o limite de iteracoes sem resposta final');
    return {
      steps,
      finalAnswer: 'Nao foi possivel concluir a tarefa dentro do limite de etapas permitido.',
      status: 'failed',
    };
  }
}
