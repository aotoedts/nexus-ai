import { ITool } from './ITool.js';
import { ToolDefinition } from '../ai/IModelAdapter.js';

/**
 * Registro central de ferramentas disponiveis (sistema de plugins).
 * Novas ferramentas se registram aqui em src/server.ts e passam a
 * ficar automaticamente disponiveis para o AgentExecutor e para o
 * modelo de IA via function-calling.
 */
export class ToolRegistry {
  private tools = new Map<string, ITool>();

  register(tool: ITool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  list(): ITool[] {
    return [...this.tools.values()];
  }

  toModelDefinitions(): ToolDefinition[] {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parametersSchema,
    }));
  }
}

export const toolRegistry = new ToolRegistry();
