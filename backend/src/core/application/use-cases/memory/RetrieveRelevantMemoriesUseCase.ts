import { IMemoryRepository } from '../../../domain/repositories/IMemoryRepository.js';
import { IModelAdapter } from '../../../infrastructure/ai/IModelAdapter.js';
import { Memory } from '../../../domain/entities/Memory.js';

export class RetrieveRelevantMemoriesUseCase {
  constructor(private memoryRepository: IMemoryRepository, private model: IModelAdapter) {}

  async execute(userId: string, query: string, topK = 5): Promise<Memory[]> {
    const embedding = await this.model.embed(query);
    return this.memoryRepository.searchSimilar(userId, embedding, topK);
  }
}
