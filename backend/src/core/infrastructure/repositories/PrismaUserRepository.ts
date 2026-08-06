import { prisma } from '../database/prisma/client.js';
import { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { User } from '../../domain/entities/User.js';

export class PrismaUserRepository implements IUserRepository {
  async create(user: User): Promise<User> {
    const record = await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
      },
    });
    return this.toEntity(record);
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await prisma.user.findUnique({ where: { email } });
    return record ? this.toEntity(record) : null;
  }

  async findById(id: string): Promise<User | null> {
    const record = await prisma.user.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async list(page: number, pageSize: number) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.user.count(),
    ]);
    return { users: users.map(this.toEntity), total };
  }

  private toEntity(record: any): User {
    return User.create({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      role: record.role,
      createdAt: record.createdAt,
    });
  }
}
