import { Memory } from '../entities/Memory.js';

export interface IMemoryRepository {
  save(memory: Memory): Promise<Memory>;
  /** Busca semantica por similaridade de cosseno usando pgvector. */
  searchSimilar(userId: string, embedding: number[], topK: number): Promise<Memory[]>;
  listByUser(userId: string): Promise<Memory[]>;
  delete(id: string): Promise<void>;
}
