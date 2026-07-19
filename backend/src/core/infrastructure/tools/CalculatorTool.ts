import { ITool, ToolResult } from './ITool.js';

/** Ferramenta simples de calculo matematico, util para tarefas do agente. */
export class CalculatorTool implements ITool {
  readonly name = 'calculator';
  readonly description = 'Avalia uma expressao matematica simples (ex: "2 + 2 * 10").';
  readonly parametersSchema = {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Expressao matematica a ser calculada' },
    },
    required: ['expression'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const expression = String(args.expression ?? '');
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      return { success: false, error: 'Expressao contem caracteres nao permitidos' };
    }
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expression})`)();
      return { success: true, data: { result } };
    } catch {
      return { success: false, error: 'Nao foi possivel avaliar a expressao' };
    }
  }
}
