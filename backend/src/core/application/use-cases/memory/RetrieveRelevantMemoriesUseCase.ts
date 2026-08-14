import { IMemoryRepository } from '../../../domain/repositories/IMemoryRepository.js';
import { IModelAdapter } from '../../../infrastructure/ai/IModelAdapter.js';
import { Memory } from '../../../domain/entities/Memory.js';
import { logger } from '../../../../config/logger.js';

export class RetrieveRelevantMemoriesUseCase {
  constructor(private memoryRepository: IMemoryRepository, private model: IModelAdapter) {}

  async execute(userId: string, query: string, topK = 5): Promise<Memory[]> {
    try {
      const embedding = await this.model.embed(query);
      return await this.memoryRepository.searchSimilar(userId, embedding, topK);
    } catch (err) {
      logger.warn({ err }, 'Falha ao buscar memorias relevantes, seguindo sem contexto de memoria');
      return [];
    }
  }
}
