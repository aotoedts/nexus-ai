import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../../../shared/errors/AppError.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.register(jwt, { secret: env.JWT_SECRET });

  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError('Token invalido ou expirado');
    }
  });

  app.decorate('requireAdmin', async (request: FastifyRequest, _reply: FastifyReply) => {
    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenError('Requer permissao de administrador');
    }
  });
});
