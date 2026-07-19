import { describe, it, expect } from 'vitest';
import { MockAdapter } from '../../src/core/infrastructure/ai/MockAdapter.js';

describe('MockAdapter', () => {
  const adapter = new MockAdapter();

  it('gera uma resposta de completion', async () => {
    const result = await adapter.complete([{ role: 'user', content: 'ola' }]);
    expect(result.content).toContain('ola');
    expect(result.finishReason).toBe('stop');
  });

  it('gera embeddings com o tamanho esperado', async () => {
    const embedding = await adapter.embed('texto de teste');
    expect(embedding).toHaveLength(1536);
  });
});
