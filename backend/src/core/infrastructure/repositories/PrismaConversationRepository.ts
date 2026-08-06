import { prisma } from '../database/prisma/client.js';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository.js';
import { Conversation } from '../../domain/entities/Conversation.js';
import { Message } from '../../domain/entities/Message.js';

export class PrismaConversationRepository implements IConversationRepository {
  async create(conversation: Conversation): Promise<Conversation> {
    const record = await prisma.conversation.create({
      data: { id: conversation.id, title: conversation.title, userId: conversation.userId },
    });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<Conversation | null> {
    const record = await prisma.conversation.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async listByUser(userId: string): Promise<Conversation[]> {
    const records = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return records.map(this.toEntity);
  }

  async updateTitle(id: string, title: string): Promise<void> {
    await prisma.conversation.update({ where: { id }, data: { title } });
  }

  async delete(id: string): Promise<void> {
    await prisma.conversation.delete({ where: { id } });
  }

  async addMessage(message: Message): Promise<Message> {
    const record = await prisma.message.create({
      data: {
        id: message.id,
        conversationId: message.conversationId,
        role: message.role,
        content: message.content,
      },
    });
    await prisma.conversation.update({
      where: { id: message.conversationId },
      data: { updatedAt: new Date() },
    });
    return this.toMessageEntity(record);
  }

  async listMessages(conversationId: string, limit = 50): Promise<Message[]> {
    const records = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return records.map(this.toMessageEntity);
  }

  private toEntity(record: any): Conversation {
    return Conversation.create({
      id: record.id,
      title: record.title,
      userId: record.userId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private toMessageEntity(record: any): Message {
    return Message.create({
      id: record.id,
      conversationId: record.conversationId,
      role: record.role,
      content: record.content,
      toolCalls: record.toolCalls,
      metadata: record.metadata,
      createdAt: record.createdAt,
    });
  }
}
