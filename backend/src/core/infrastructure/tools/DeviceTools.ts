import { ITool, ToolResult } from './ITool.js';

/**
 * Estas ferramentas nunca sao executadas no servidor. O AgentExecutor
 * intercepta chamadas a elas antes de invocar execute() e pausa a execucao,
 * aguardando o app mobile realizar a acao no dispositivo do usuario e
 * reportar o resultado de volta. O execute() aqui e so uma rede de
 * seguranca (nunca deveria ser chamado de fato).
 */
function deviceOnlyResult(): ToolResult {
  return {
    success: false,
    error: 'Esta ferramenta so pode ser executada no dispositivo do usuario.',
  };
}

export class DeviceDumpScreenTool implements ITool {
  readonly name = 'device_dump_screen';
  readonly description =
    'Le o conteudo atual da tela do celular do usuario (textos, botoes clicaveis e suas posicoes). ' +
    'Use antes de tocar em qualquer elemento para saber onde ele esta.';
  readonly parametersSchema = { type: 'object', properties: {} };
  async execute(): Promise<ToolResult> {
    return deviceOnlyResult();
  }
}

export class DeviceTapTool implements ITool {
  readonly name = 'device_tap';
  readonly description =
    'Toca em uma coordenada X,Y da tela do celular do usuario. Use device_dump_screen antes para saber as coordenadas certas.';
  readonly parametersSchema = {
    type: 'object',
    properties: {
      x: { type: 'number', description: 'Coordenada X do toque' },
      y: { type: 'number', description: 'Coordenada Y do toque' },
    },
    required: ['x', 'y'],
  };
  async execute(): Promise<ToolResult> {
    return deviceOnlyResult();
  }
}

export class DeviceGoHomeTool implements ITool {
  readonly name = 'device_go_home';
  readonly description = 'Volta para a tela inicial (home) do celular do usuario.';
  readonly parametersSchema = { type: 'object', properties: {} };
  async execute(): Promise<ToolResult> {
    return deviceOnlyResult();
  }
}

export class DeviceGoBackTool implements ITool {
  readonly name = 'device_go_back';
  readonly description = 'Aciona o botao "voltar" do celular do usuario.';
  readonly parametersSchema = { type: 'object', properties: {} };
  async execute(): Promise<ToolResult> {
    return deviceOnlyResult();
  }
}

export class AskUserQuestionTool implements ITool {
  readonly name = 'ask_user_question';
  readonly description =
    'Faz uma pergunta ao usuario e aguarda a resposta antes de continuar a tarefa. ' +
    'Use quando precisar de uma confirmacao ou informacao que so o usuario sabe (ex: qual video escolher, qual valor digitar).';
  readonly parametersSchema = {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'A pergunta a ser exibida ao usuario' },
    },
    required: ['question'],
  };
  async execute(): Promise<ToolResult> {
    return deviceOnlyResult();
  }
}
