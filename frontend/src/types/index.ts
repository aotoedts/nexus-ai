export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  updatedAt: string;
}
