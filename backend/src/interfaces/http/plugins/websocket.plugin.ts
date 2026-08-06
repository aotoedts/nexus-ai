import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import { FastifyInstance } from 'fastify';

export const websocketPlugin = fp(async (app: FastifyInstance) => {
  await app.register(websocket);
});
