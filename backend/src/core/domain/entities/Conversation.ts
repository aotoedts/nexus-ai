export interface ConversationProps {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Conversation {
  private constructor(private props: ConversationProps) {}

  static create(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  get id() { return this.props.id; }
  get title() { return this.props.title; }
  get userId() { return this.props.userId; }

  renameFrom(firstMessage: string): string {
    const clean = firstMessage.trim().slice(0, 60);
    return clean.length > 0 ? clean : this.props.title;
  }
}
