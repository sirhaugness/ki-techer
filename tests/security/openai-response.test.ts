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
  it('requires a budget guard and retains a reservation when usage is absent', async () => {
    expect(() => openaiProvider(vi.fn(), undefined!)).toThrow('budsjettvakt');
    const budget = { reserve: vi.fn().mockResolvedValue('r'), settle: vi.fn() };
    create.mockResolvedValue({
      status: 'completed',
      output_text: '{}',
      output: [],
    });
    const log = vi.fn();
    await expect(
      openaiProvider(log, budget).respond({
        purpose: 'fast',
        input: '{}',
        instructions: '',
        schema: z.object({}),
      }),
    ).rejects.toThrow('forbruk mangler');
    expect(budget.settle).toHaveBeenCalledWith(
      'r',
      expect.any(Number),
      expect.objectContaining({ ok: false, usage_known: false }),
    );
  });
  it('attributes generation and review separately to the actual session and chapter', async () => {
    vi.stubEnv('OPENAI_MODEL_DEFAULT', '');
    vi.stubEnv('OPENAI_MODEL_TUTOR', 'gpt-5.2');
    const log = vi.fn();
    const budget = { reserve: vi.fn().mockResolvedValue('r'), settle: vi.fn() };
    const usage = { sessionId: 'owned-session', chapterNumber: 4 };
    const provider = openaiProvider(log, budget, { usage });
    create.mockResolvedValue({
      status: 'completed',
      output_text: '{}',
      output: [],
      usage: { input_tokens: 2000, output_tokens: 500 },
    });
    for (const purpose of ['story-generate', 'story-review'] as const)
      await provider.respond({
        purpose,
        input: '{}',
        instructions: '',
        schema: z.object({}),
      });
    expect(create).toHaveBeenLastCalledWith(
      expect.objectContaining({ model: 'gpt-5-mini' }),
      expect.any(Object),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'story-generate',
        model: 'gpt-5-mini',
        session_id: 'owned-session',
        chapter_number: 4,
        usage_known: true,
        cost_estimate: 0.0165,
      }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'story-review', chapter_number: 4 }),
    );
  });
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
      vi.stubEnv('OPENAI_MODEL_DEFAULT', 'gpt-5-mini');
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
