/**
 * Tipos compartilhados entre frontend e backend do Nexus AI.
 * Mantidos em um pacote separado para evitar duplicacao e garantir
 * que o contrato da API REST seja consistente nos dois lados.
 */

export type UserRole = 'USER' | 'ADMIN';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';

export interface MessageDTO {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ConversationDTO {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryDTO {
  id: string;
  content: string;
  kind: 'fact' | 'preference' | 'event' | 'summary';
  importance: number;
  createdAt: string;
}

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface DocumentDTO {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  createdAt: string;
}

export interface AgentStepDTO {
  type: 'thought' | 'tool_call' | 'tool_result' | 'final_answer';
  content: string;
  toolName?: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthResponse {
  user: UserDTO;
  token: string;
  refreshToken?: string;
}

export interface WsTokenEvent {
  type: 'token';
  token: string;
}
export interface WsDoneEvent {
  type: 'done';
  conversationId: string;
  message: string;
}
export interface WsErrorEvent {
  type: 'error';
  message: string;
}
export type WsChatEvent = WsTokenEvent | WsDoneEvent | WsErrorEvent;
