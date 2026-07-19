import { prisma } from '../database/prisma/client.js';
import { IMemoryRepository } from '../../domain/repositories/IMemoryRepository.js';
import { Memory } from '../../domain/entities/Memory.js';

/**
 * Implementacao de memoria de longo prazo usando pgvector.
 * Prisma ainda nao possui suporte nativo de alto nivel para o tipo
 * `vector`, entao usamos SQL bruto ($queryRawUnsafe/$executeRawUnsafe)
 * para insercao e busca por similaridade de cosseno (operador `<=>`).
 */
export class PrismaMemoryRepository implements IMemoryRepository {
  async save(memory: Memory): Promise<Memory> {
    const vectorLiteral = `[${memory.embedding.join(',')}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO memories (id, "userId", content, embedding, kind, importance, "createdAt")
       VALUES ($1, $2, $3, $4::vector, $5, $6, now())`,
      memory.id,
      (memory as any).props?.userId ?? (memory as any).userId,
      memory.content,
      vectorLiteral,
      (memory as any).props?.kind ?? 'fact',
      memory.importance,
    );
    return memory;
  }

  async searchSimilar(userId: string, embedding: number[], topK: number): Promise<Memory[]> {
    const vectorLiteral = `[${embedding.join(',')}]`;
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, "userId", content, kind, importance, "createdAt"
       FROM memories
       WHERE "userId" = $1
       ORDER BY embedding <=> $2::vector
       LIMIT $3`,
      userId,
      vectorLiteral,
      topK,
    );
    return rows.map((row) =>
      Memory.create({
        id: row.id,
        userId: row.userId,
        content: row.content,
        embedding: [],
        kind: row.kind,
        importance: row.importance,
        createdAt: row.createdAt,
      }),
    );
  }

  async listByUser(userId: string): Promise<Memory[]> {
    const records = await prisma.memory.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return records.map((r) =>
      Memory.create({
        id: r.id,
        userId: r.userId,
        content: r.content,
        embedding: [],
        kind: r.kind as any,
        importance: r.importance,
        createdAt: r.createdAt,
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await prisma.memory.delete({ where: { id } });
  }
}
