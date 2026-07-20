export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';

export interface MessageProps {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: unknown;
  metadata?: unknown;
  createdAt: Date;
}

export class Message {
  private constructor(private props: MessageProps) {}

  static create(props: MessageProps): Message {
    if ((!props.content || props.content.trim().length === 0) && !props.toolCalls) {
      throw new Error('Mensagem vazia nao permitida');
    }
    return new Message(props);
  }

  get id() { return this.props.id; }
  get role() { return this.props.role; }
  get content() { return this.props.content; }
  get conversationId() { return this.props.conversationId; }
toJSON() {
  return {
    id: this.props.id,
    conversationId: this.props.conversationId,
    role: this.props.role,
    content: this.props.content,
    toolCalls: this.props.toolCalls,
    metadata: this.props.metadata,
    createdAt: this.props.createdAt,
  };
}}
