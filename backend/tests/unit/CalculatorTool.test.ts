import { describe, it, expect } from 'vitest';
import { CalculatorTool } from '../../src/core/infrastructure/tools/CalculatorTool.js';

describe('CalculatorTool', () => {
  const tool = new CalculatorTool();

  it('calcula uma expressao valida corretamente', async () => {
    const result = await tool.execute({ expression: '2 + 2 * 10' });
    expect(result.success).toBe(true);
    expect((result.data as any).result).toBe(22);
  });

  it('rejeita expressoes com caracteres invalidos', async () => {
    const result = await tool.execute({ expression: '2 + require("fs")' });
    expect(result.success).toBe(false);
  });
});
