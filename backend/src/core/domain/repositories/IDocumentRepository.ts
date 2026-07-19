import { DocumentEntity } from '../entities/Document.js';

export interface DocumentChunkRecord {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
}

export interface IDocumentRepository {
  create(document: DocumentEntity): Promise<DocumentEntity>;
  updateStatus(id: string, status: DocumentEntity['status']): Promise<void>;
  findById(id: string): Promise<DocumentEntity | null>;
  listByUser(userId: string): Promise<DocumentEntity[]>;
  saveChunks(documentId: string, chunks: { content: string; embedding: number[]; index: number }[]): Promise<void>;
  searchSimilarChunks(userId: string, embedding: number[], topK: number): Promise<DocumentChunkRecord[]>;
}
