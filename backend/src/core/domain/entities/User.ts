export type UserRole = 'USER' | 'ADMIN';

export interface UserProps {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

/** Entidade de dominio pura - sem dependencia de framework ou ORM. */
export class User {
  private constructor(private props: UserProps) {}

  static create(props: UserProps): User {
    if (!props.email.includes('@')) {
      throw new Error('Email invalido');
    }
    return new User(props);
  }

  get id() { return this.props.id; }
  get name() { return this.props.name; }
  get email() { return this.props.email; }
  get passwordHash() { return this.props.passwordHash; }
  get role() { return this.props.role; }
  get isAdmin() { return this.props.role === 'ADMIN'; }
}
