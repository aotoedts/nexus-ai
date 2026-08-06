import { prisma } from '../database/prisma/client.js';
import { IDocumentRepository, DocumentChunkRecord } from '../../domain/repositories/IDocumentRepository.js';
import { DocumentEntity } from '../../domain/entities/Document.js';
import { v4 as uuid } from 'uuid';

export class PrismaDocumentRepository implements IDocumentRepository {
  async create(document: DocumentEntity): Promise<DocumentEntity> {
    const record = await prisma.document.create({
      data: {
        id: document.id,
        userId: (document as any).props.userId,
        fileName: document.fileName,
        filePath: (document as any).props.filePath,
        mimeType: (document as any).props.mimeType,
        sizeBytes: (document as any).props.sizeBytes,
        status: document.status,
      },
    });
    return this.toEntity(record);
  }

  async updateStatus(id: string, status: DocumentEntity['status']): Promise<void> {
    await prisma.document.update({ where: { id }, data: { status } });
  }

  async findById(id: string): Promise<DocumentEntity | null> {
    const record = await prisma.document.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async listByUser(userId: string): Promise<DocumentEntity[]> {
    const records = await prisma.document.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return records.map(this.toEntity);
  }

  async saveChunks(
    documentId: string,
    chunks: { content: string; embedding: number[]; index: number }[],
  ): Promise<void> {
    for (const chunk of chunks) {
      const vectorLiteral = `[${chunk.embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO document_chunks (id, "documentId", content, embedding, "chunkIndex", "createdAt")
         VALUES ($1, $2, $3, $4::vector, $5, now())`,
        uuid(),
        documentId,
        chunk.content,
        vectorLiteral,
        chunk.index,
      );
    }
  }

  async searchSimilarChunks(userId: string, embedding: number[], topK: number): Promise<DocumentChunkRecord[]> {
    const vectorLiteral = `[${embedding.join(',')}]`;
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT dc.id, dc."documentId", dc.content, dc."chunkIndex"
       FROM document_chunks dc
       JOIN documents d ON d.id = dc."documentId"
       WHERE d."userId" = $1
       ORDER BY dc.embedding <=> $2::vector
       LIMIT $3`,
      userId,
      vectorLiteral,
      topK,
    );
    return rows.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      content: r.content,
      chunkIndex: r.chunkIndex,
    }));
  }

  private toEntity(record: any): DocumentEntity {
    return DocumentEntity.create({
      id: record.id,
      userId: record.userId,
      fileName: record.fileName,
      filePath: record.filePath,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      status: record.status,
      createdAt: record.createdAt,
    });
  }
}
