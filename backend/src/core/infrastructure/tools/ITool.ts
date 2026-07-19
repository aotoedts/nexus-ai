/**
 * Contrato que toda ferramenta (tool) do Nexus AI deve implementar.
 * Ferramentas sao capacidades que o agente/modelo pode invocar durante
 * a execucao de uma tarefa (ex: pesquisar na internet, ler um PDF,
 * fazer contas). Novas tools podem ser adicionadas sem alterar o
 * executor de agentes (sistema de plugins).
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ITool {
  readonly name: string;
  readonly description: string;
  readonly parametersSchema: Record<string, unknown>; // JSON Schema para o modelo
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}
