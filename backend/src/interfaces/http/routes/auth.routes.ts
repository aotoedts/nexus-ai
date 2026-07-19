import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { PrismaUserRepository } from '../../../core/infrastructure/repositories/PrismaUserRepository.js';
import { RegisterUserUseCase } from '../../../core/application/use-cases/auth/RegisterUserUseCase.js';
import { LoginUseCase } from '../../../core/application/use-cases/auth/LoginUseCase.js';
import { prisma } from '../../../core/infrastructure/database/prisma/client.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function authRoutes(app: FastifyInstance) {
  const userRepository = new PrismaUserRepository();
  const registerUseCase = new RegisterUserUseCase(userRepository);
  const loginUseCase = new LoginUseCase(userRepository);

  app.post('/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const user = await registerUseCase.execute(body);
    const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return reply.status(201).send({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  });

  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await loginUseCase.execute(body);
    const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role });

    const refreshToken = uuid();
    await prisma.refreshToken.create({
      data: {
        id: uuid(),
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return reply.send({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
      refreshToken,
    });
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = z.object({ refreshToken: z.string() }).parse(request.body);
    const stored = await prisma.refreshToken.findUnique({ where: { token: body.refreshToken } });

    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalido ou expirado' } });
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      return reply.status(401).send({ error: { code: 'USER_NOT_FOUND', message: 'Usuario nao encontrado' } });
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return reply.send({ token });
  });

  app.get('/auth/me', { onRequest: [app.authenticate] }, async (request) => {
    const user = await userRepository.findById(request.user.sub);
    return { user: user && { id: user.id, name: user.name, email: user.email, role: user.role } };
  });
}
