export type MemoryKind = 'fact' | 'preference' | 'event' | 'summary';

export interface MemoryProps {
  id: string;
  userId: string;
  content: string;
  embedding: number[];
  kind: MemoryKind;
  importance: number;
  createdAt: Date;
}

/** Representa um fragmento de memoria de longo prazo do usuario. */
export class Memory {
  private constructor(private props: MemoryProps) {}

  static create(props: MemoryProps): Memory {
    return new Memory(props);
  }

  get id() { return this.props.id; }
  get content() { return this.props.content; }
  get embedding() { return this.props.embedding; }
  get importance() { return this.props.importance; }
}
