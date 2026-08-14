import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { ITool, ToolResult } from './ITool.js';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';

const execAsync = promisify(exec);

const ALLOWED_PREFIXES = [
  'git ', 'npm ', 'npx ', 'node ', 'ls', 'cat ', 'echo ',
  'mkdir ', 'grep ', 'find ', 'pwd', 'cd ', 'cp ', 'touch ',
];

const DENIED_PATTERNS: RegExp[] = [
  /rm\s+-rf/i,
  /sudo/i,
  /:\(\)\s*\{.*:\|:.*\};:/,        // fork bomb
  />\s*\/dev\/(sd|nvme)/i,          // escrever direto em disco
  /push[^\n]*(--force|-f\b)/i,      // force push
  /curl[^\n]*\|\s*sh/i,             // pipe pra shell
  /--\s*eval/i,
];

/**
 * Ferramenta de terminal sandboxada para o agente. Opera sempre dentro de
 * um workspace isolado (clone do repositorio), nunca no filesystem real do
 * usuario. Comandos fora da allowlist ou que batam num padrao perigoso sao
 * rejeitados antes de rodar.
 */
export class TerminalTool implements ITool {
  readonly name = 'run_terminal_command';
  readonly description =
    'Executa um comando de terminal dentro do workspace sandboxado do agente (clone isolado do repositorio). ' +
    'So aceita comandos de git, npm, node e utilitarios basicos de arquivo. Comandos destrutivos sao bloqueados.';
  readonly parametersSchema = {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'O comando de shell a executar' },
    },
    required: ['command'],
  };

  private workspaceDir = env.AGENT_WORKSPACE_DIR;

  private async ensureWorkspace(): Promise<void> {
    try {
      await fs.access(this.workspaceDir);
      await execAsync('git pull', { cwd: this.workspaceDir, timeout: 30_000 });
    } catch {
      await fs.mkdir(this.workspaceDir, { recursive: true });
      await execAsync(`git clone ${env.AGENT_REPO_URL} .`, {
        cwd: this.workspaceDir,
        timeout: 60_000,
      });
    }
  }

  private validate(command: string): string | null {
    const trimmed = command.trim();
    const startsAllowed = ALLOWED_PREFIXES.some((p) => trimmed.startsWith(p));
    if (!startsAllowed) {
      return `Comando nao permitido. Prefixos aceitos: ${ALLOWED_PREFIXES.join(', ')}`;
    }
    const deniedHit = DENIED_PATTERNS.find((re) => re.test(trimmed));
    if (deniedHit) {
      return 'Comando bloqueado por seguranca (padrao destrutivo detectado).';
    }
    return null;
  }

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const command = String(args.command ?? '');
    const validationError = this.validate(command);
    if (validationError) {
      return { success: false, error: validationError };
    }

    try {
      await this.ensureWorkspace();
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workspaceDir,
        timeout: 45_000,
        maxBuffer: 1024 * 512, // 512kb
      });
      return {
        success: true,
        data: { stdout: stdout.slice(0, 8000), stderr: stderr.slice(0, 2000) },
      };
    } catch (err) {
      logger.warn({ err, command }, 'TerminalTool: comando falhou');
      return { success: false, error: (err as Error).message.slice(0, 2000) };
    }
  }
}
