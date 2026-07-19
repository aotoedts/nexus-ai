import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

/**
 * Teste de integracao basico da rota de health check.
 * Requer DATABASE_URL valida no ambiente de teste para o health/deep,
 * mas /health simples nao depende do banco.
 */
describe('Health routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health retorna status ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).status).toBe('ok');
  });
});
