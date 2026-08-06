import { v4 as uuid } from 'uuid';
import { IMemoryRepository } from '../../../domain/repositories/IMemoryRepository.js';
import { IModelAdapter } from '../../../infrastructure/ai/IModelAdapter.js';
import { Memory, MemoryKind } from '../../../domain/entities/Memory.js';

export interface SaveMemoryInput {
  userId: string;
  content: string;
  kind?: MemoryKind;
  importance?: number;
}

export class SaveMemoryUseCase {
  constructor(private memoryRepository: IMemoryRepository, private model: IModelAdapter) {}

  async execute(input: SaveMemoryInput): Promise<Memory> {
    const embedding = await this.model.embed(input.content);
    const memory = Memory.create({
      id: uuid(),
      userId: input.userId,
      content: input.content,
      embedding,
      kind: input.kind ?? 'fact',
      importance: input.importance ?? 1,
      createdAt: new Date(),
    });
    return this.memoryRepository.save(memory);
  }
}
