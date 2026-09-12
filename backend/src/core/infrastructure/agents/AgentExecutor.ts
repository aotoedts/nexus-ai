import { IModelAdapter, ChatMessageInput } from '../ai/IModelAdapter.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { logger } from '../../../config/logger.js';

export interface AgentStep {
  type: 'thought' | 'tool_call' | 'tool_result' | 'final_answer';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

export interface PendingAction {
  toolName: string;
  arguments: Record<string, unknown>;
  description: string;
}

export interface AgentRunResult {
  steps: AgentStep[];
  finalAnswer: string;
  status: 'completed' | 'failed' | 'awaiting_authorization' | 'awaiting_device_action';
  pendingAction?: PendingAction;
}

// Ferramentas que exigem autorizacao explicita do usuario antes de executar,
// por poderem alterar estado externo (repositorio, arquivos, etc).
const TOOLS_REQUIRING_AUTHORIZATION = new Set(['run_terminal_command']);

// Ferramentas que so podem ser executadas no dispositivo do usuario (nunca
// no servidor). O agente pausa e aguarda o app mobile reportar o resultado.
const DEVICE_TOOLS = new Set([
  'device_dump_screen',
  'device_tap',
  'device_go_home',
  'device_go_back',
  'ask_user_question',
]);

export class AgentExecutor {
  constructor(
    private model: IModelAdapter,
    private tools: ToolRegistry,
    private maxIterations = 6,
  ) {}

  private buildMessages(goal: string, conversationHistory: ChatMessageInput[], steps: AgentStep[]): ChatMessageInput[] {
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

    for (const step of steps) {
      if (step.type === 'tool_call') {
        messages.push({
          role: 'assistant',
          content: `Chamei a ferramenta ${step.toolName} com argumentos ${JSON.stringify(step.toolArgs)}`,
        });
      } else if (step.type === 'tool_result') {
        messages.push({ role: 'tool', content: step.content });
      }
    }

    return messages;
  }

  async run(
    goal: string,
    conversationHistory: ChatMessageInput[] = [],
    previousSteps: AgentStep[] = [],
  ): Promise<AgentRunResult> {
    const steps: AgentStep[] = [...previousSteps];
    const messages = this.buildMessages(goal, conversationHistory, previousSteps);
    const iterationsUsed = previousSteps.filter((s) => s.type === 'tool_call').length;

    for (let i = iterationsUsed; i < this.maxIterations; i++) {
      const result = await this.model.complete(messages, {
        tools: this.tools.toModelDefinitions(),
      });

      if (result.finishReason === 'tool_call' && result.toolCalls?.length) {
        for (const call of result.toolCalls) {
          const tool = this.tools.get(call.toolName);

          if (!tool) {
            steps.push({ type: 'tool_result', content: `Ferramenta ${call.toolName} nao encontrada` });
            continue;
          }

          if (DEVICE_TOOLS.has(call.toolName)) {
            steps.push({
              type: 'tool_call',
              content: `Aguardando execucao no dispositivo: ${call.toolName}`,
              toolName: call.toolName,
              toolArgs: call.arguments,
            });
            return {
              steps,
              finalAnswer: '',
              status: 'awaiting_device_action',
              pendingAction: {
                toolName: call.toolName,
                arguments: call.arguments,
                description: tool.description,
              },
            };
          }

          if (TOOLS_REQUIRING_AUTHORIZATION.has(call.toolName)) {
            steps.push({
              type: 'tool_call',
              content: `Aguardando autorizacao para ${call.toolName}`,
              toolName: call.toolName,
              toolArgs: call.arguments,
            });
            return {
              steps,
              finalAnswer: '',
              status: 'awaiting_authorization',
              pendingAction: {
                toolName: call.toolName,
                arguments: call.arguments,
                description: tool.description,
              },
            };
          }

          steps.push({ type: 'tool_call', content: `Chamando ${call.toolName}`, toolName: call.toolName, toolArgs: call.arguments });
          const toolResult = await tool.execute(call.arguments);
          steps.push({ type: 'tool_result', content: JSON.stringify(toolResult), toolName: call.toolName });

          messages.push({
            role: 'assistant',
            content: `Chamei a ferramenta ${call.toolName} com argumentos ${JSON.stringify(call.arguments)}`,
          });
          messages.push({ role: 'tool', content: JSON.stringify(toolResult) });
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

  async authorize(
    goal: string,
    conversationHistory: ChatMessageInput[],
    steps: AgentStep[],
    pendingAction: PendingAction,
    approved: boolean,
  ): Promise<AgentRunResult> {
    const updatedSteps = [...steps];
    const tool = this.tools.get(pendingAction.toolName);

    if (approved && tool) {
      const toolResult = await tool.execute(pendingAction.arguments);
      updatedSteps.push({ type: 'tool_result', content: JSON.stringify(toolResult), toolName: pendingAction.toolName });
    } else {
      updatedSteps.push({
        type: 'tool_result',
        content: 'Acao rejeitada pelo usuario.',
        toolName: pendingAction.toolName,
      });
    }

    return this.run(goal, conversationHistory, updatedSteps);
  }

  /**
   * Continua a execucao apos o app mobile ter realizado a acao no
   * dispositivo e reportado o resultado de volta.
   */
  async continueWithDeviceResult(
    goal: string,
    conversationHistory: ChatMessageInput[],
    steps: AgentStep[],
    pendingAction: PendingAction,
    resultData: unknown,
  ): Promise<AgentRunResult> {
    const updatedSteps = [...steps];
    updatedSteps.push({
      type: 'tool_result',
      content: JSON.stringify({ success: true, data: resultData }),
      toolName: pendingAction.toolName,
    });

    return this.run(goal, conversationHistory, updatedSteps);
  }
}
