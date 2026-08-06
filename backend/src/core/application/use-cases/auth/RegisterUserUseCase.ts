import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { ConflictError } from '../../../../shared/errors/AppError.js';

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export class RegisterUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Ja existe um usuario com esse email');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = User.create({
      id: uuid(),
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'USER',
      createdAt: new Date(),
    });

    return this.userRepository.create(user);
  }
}
