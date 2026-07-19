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

/** Plugin de autenticacao JWT + decorators de autorizacao (guards). */
export const authPlugin = fp(async (app: FastifyInstance) => {
  app.register(jwt, { secret: env.JWT_SECRET });

  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      // WebSocket connections (usadas pelo chat em tempo real) nao conseguem
      // enviar headers customizados no handshake feito pelo browser, entao
      // aceitamos o token tambem via query string (?token=...) como fallback.
      const queryToken = (request.query as Record<string, string> | undefined)?.token;
      if (queryToken && !request.headers.authorization) {
        request.headers.authorization = `Bearer ${queryToken}`;
      }
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
