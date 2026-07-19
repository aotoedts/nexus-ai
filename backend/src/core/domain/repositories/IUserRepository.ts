import { User } from '../entities/User.js';

export interface IUserRepository {
  create(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  list(page: number, pageSize: number): Promise<{ users: User[]; total: number }>;
}
