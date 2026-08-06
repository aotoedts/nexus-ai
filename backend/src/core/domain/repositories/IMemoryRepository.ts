import { Memory } from '../entities/Memory.js';

export interface IMemoryRepository {
  save(memory: Memory): Promise<Memory>;
  searchSimilar(userId: string, embedding: number[], topK: number): Promise<Memory[]>;
  listByUser(userId: string): Promise<Memory[]>;
  delete(id: string): Promise<void>;
}
