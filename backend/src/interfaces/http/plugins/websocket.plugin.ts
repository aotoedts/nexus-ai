import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import { FastifyInstance } from 'fastify';

/** Habilita suporte a WebSocket para o chat em tempo real. */
export const websocketPlugin = fp(async (app: FastifyInstance) => {
  await app.register(websocket);
});
