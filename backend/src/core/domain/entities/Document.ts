export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface DocumentProps {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  createdAt: Date;
}

export class DocumentEntity {
  private constructor(private props: DocumentProps) {}

  static create(props: DocumentProps): DocumentEntity {
    return new DocumentEntity(props);
  }

  get id() { return this.props.id; }
  get fileName() { return this.props.fileName; }
  get status() { return this.props.status; }
}
