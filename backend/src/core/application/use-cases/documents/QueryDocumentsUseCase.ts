import { IDocumentRepository } from '../../../domain/repositories/IDocumentRepository.js';
import { IModelAdapter } from '../../../infrastructure/ai/IModelAdapter.js';

/** Busca semantica (RAG) nos documentos ja processados do usuario. */
export class QueryDocumentsUseCase {
  constructor(private documentRepository: IDocumentRepository, private model: IModelAdapter) {}

  async execute(userId: string, query: string, topK = 5) {
    const embedding = await this.model.embed(query);
    return this.documentRepository.searchSimilarChunks(userId, embedding, topK);
  }
}
