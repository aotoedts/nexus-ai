export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ITool {
  readonly name: string;
  readonly description: string;
  readonly parametersSchema: Record<string, unknown>;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}
