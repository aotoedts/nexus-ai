import { ITool, ToolResult } from './ITool.js';
import fs from 'node:fs/promises';
// @ts-ignore - pdf-parse nao possui tipos completos para import default em ESM
import pdfParse from 'pdf-parse';

/** Ferramenta que le e extrai o texto de um arquivo PDF ja enviado (upload). */
export class PdfReaderTool implements ITool {
  readonly name = 'pdf_reader';
  readonly description = 'Le e extrai o texto de um arquivo PDF a partir do caminho no servidor.';
  readonly parametersSchema = {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: 'Caminho do arquivo PDF no servidor' },
    },
    required: ['filePath'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const filePath = String(args.filePath ?? '');
    try {
      const buffer = await fs.readFile(filePath);
      const parsed = await pdfParse(buffer);
      return {
        success: true,
        data: { text: parsed.text, pages: parsed.numpages },
      };
    } catch (err) {
      return { success: false, error: `Falha ao ler PDF: ${(err as Error).message}` };
    }
  }
}
