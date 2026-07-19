import { Conversation } from '../entities/Conversation.js';
import { Message } from '../entities/Message.js';

export interface IConversationRepository {
  create(conversation: Conversation): Promise<Conversation>;
  findById(id: string): Promise<Conversation | null>;
  listByUser(userId: string): Promise<Conversation[]>;
  updateTitle(id: string, title: string): Promise<void>;
  delete(id: string): Promise<void>;

  addMessage(message: Message): Promise<Message>;
  listMessages(conversationId: string, limit?: number): Promise<Message[]>;
}
