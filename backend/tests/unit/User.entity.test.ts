import { describe, it, expect } from 'vitest';
import { User } from '../../src/core/domain/entities/User.js';

describe('User entity', () => {
  it('cria um usuario valido', () => {
    const user = User.create({
      id: '1',
      name: 'Aotoedts',
      email: 'aotoedts@example.com',
      passwordHash: 'hash',
      role: 'USER',
      createdAt: new Date(),
    });
    expect(user.email).toBe('aotoedts@example.com');
    expect(user.isAdmin).toBe(false);
  });

  it('rejeita email invalido', () => {
    expect(() =>
      User.create({
        id: '1',
        name: 'X',
        email: 'email-invalido',
        passwordHash: 'hash',
        role: 'USER',
        createdAt: new Date(),
      }),
    ).toThrow();
  });
});
