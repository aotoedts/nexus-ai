import { v4 as uuid } from 'uuid';
import { IDocumentRepository } from '../../../domain/repositories/IDocumentRepository.js';
import { IModelAdapter } from '../../../infrastructure/ai/IModelAdapter.js';
import { DocumentEntity } from '../../../domain/entities/Document.js';
import { PdfReaderTool } from '../../../infrastructure/tools/PdfReaderTool.js';
import { logger } from '../../../../config/logger.js';

export interface UploadDocumentInput {
  userId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
}

/** Divide um texto grande em blocos menores para gerar embeddings (RAG). */
function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.trim().length > 0);
}

/**
 * Faz o upload logico do documento, extrai o texto (PDF ou texto puro),
 * divide em chunks e gera embeddings para permitir buscas semanticas
 * (RAG) posteriormente, tanto em chat quanto em ferramentas do agente.
 */
export class UploadDocumentUseCase {
  private pdfReader = new PdfReaderTool();

  constructor(private documentRepository: IDocumentRepository, private model: IModelAdapter) {}

  async execute(input: UploadDocumentInput): Promise<DocumentEntity> {
    const document = DocumentEntity.create({
      id: uuid(),
      userId: input.userId,
      fileName: input.fileName,
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      status: 'PENDING',
      createdAt: new Date(),
    });

    const created = await this.documentRepository.create(document);

    // Processamento assincrono (nao bloqueia a resposta do upload).
    this.processDocument(created).catch((err) => {
      logger.error({ err, documentId: created.id }, 'Falha ao processar documento');
    });

    return created;
  }

  private async processDocument(document: DocumentEntity): Promise<void> {
    await this.documentRepository.updateStatus(document.id, 'PROCESSING');

    let text = '';
    if ((document as any).props.mimeType === 'application/pdf') {
      const result = await this.pdfReader.execute({ filePath: (document as any).props.filePath });
      if (!result.success) {
        await this.documentRepository.updateStatus(document.id, 'FAILED');
        return;
      }
      text = (result.data as any).text;
    } else {
      const fs = await import('node:fs/promises');
      text = await fs.readFile((document as any).props.filePath, 'utf-8');
    }

    const chunks = chunkText(text);
    const embeddedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.model.embed(chunks[i]);
      embeddedChunks.push({ content: chunks[i], embedding, index: i });
    }

    await this.documentRepository.saveChunks(document.id, embeddedChunks);
    await this.documentRepository.updateStatus(document.id, 'READY');
  }
}
