import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { UnauthorizedError } from '../../../../shared/errors/AppError.js';

export interface LoginInput {
  email: string;
  password: string;
}

export class LoginUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(input: LoginInput): Promise<User> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Credenciais invalidas');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Credenciais invalidas');
    }

    return user;
  }
}
