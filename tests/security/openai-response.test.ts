import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { openaiProvider } from '../../lib/ai/openai';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('openai', () => ({
  default: class {
    responses = { create };
  },
}));
afterEach(() => vi.unstubAllEnvs());

describe('OpenAI response accounting', () => {
  it.each([
    {
      status: 'incomplete',
      output_text: '{"valid":',
      code: 'model_response_incomplete',
    },
    { status: 'completed', output_text: '{"valid":', code: undefined },
  ])(
    'records unusable $status output as a failed call with its token cost',
    async (response) => {
      vi.stubEnv('OPENAI_MODEL_FAST', 'gpt-5-mini');
      create.mockResolvedValue({
        ...response,
        output: [],
        usage: { input_tokens: 3968, output_tokens: 1800 },
      });
      const log = vi.fn();
      const budget = {
        reserve: vi.fn().mockResolvedValue('reservation'),
        settle: vi.fn(),
      };
      const call = openaiProvider(log, budget).respond({
        purpose: 'fast',
        instructions: 'Review the chapter.',
        input: '{}',
        schema: z.object({ valid: z.boolean() }),
      });
      if (response.code)
        await expect(call).rejects.toMatchObject({ code: response.code });
      else await expect(call).rejects.toBeInstanceOf(SyntaxError);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          input_tokens: 3968,
          output_tokens: 1800,
        }),
      );
      expect(budget.settle).toHaveBeenCalledWith(
        'reservation',
        expect.any(Number),
        expect.objectContaining({ ok: false }),
      );
    },
  );
});
