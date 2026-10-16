import { it, expect, vi, afterEach } from 'vitest';
vi.mock('server-only', () => ({}));
const { create, moderate } = vi.hoisted(() => ({
  create: vi.fn(),
  moderate: vi.fn(),
}));
vi.mock('openai', () => ({
  default: class {
    responses = { create };
    moderations = { create: moderate };
  },
}));
import type { AiCall } from '../../lib/ai/provider';
import { openaiProvider } from '../../lib/ai/openai';
import { responseSchema } from '../../lib/agent/schemas';
import { toolDefinitions } from '../../lib/agent/tools';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it('uses stateless Responses, ASCII tool names, strict schema, environment model and cost log', async () => {
  vi.stubEnv('OPENAI_MODEL_DEFAULT', 'configured-model');
  create.mockResolvedValue({
    id: 'r',
    usage: { input_tokens: 100, output_tokens: 20 },
    output: [
      {
        type: 'function_call',
        call_id: 'c',
        name: 'foresla_mestring',
        arguments: '{}',
      },
    ],
    output_text: '',
  });
  const log = vi.fn(async (_call: AiCall) => {
      void _call;
    }),
    provider = openaiProvider(log, {
      reserve: async () => 'test',
      settle: async () => {},
    });
  const reply = await provider.respond({
    purpose: 'tutor',
    instructions: 'Bokmål',
    input: '{}',
    schema: responseSchema,
    tools: toolDefinitions,
  });
  const call = create.mock.calls[0][0];
  expect(call.model).toBe('configured-model');
  expect(call.store).toBe(false);
  expect(
    call.tools.every(
      (t: { name: string; strict: boolean }) =>
        /^[a-zA-Z0-9_-]+$/.test(t.name) && t.strict,
    ),
  ).toBe(true);
  expect(reply.calls[0].name).toBe('foreslå_mestring');
  expect(log.mock.calls[0][0]).toMatchObject({
    ok: true,
    input_tokens: 100,
    output_tokens: 20,
  });
  await provider.respond({
    purpose: 'tutor',
    instructions: '',
    input: '{}',
    schema: responseSchema,
    conversation: reply.conversation,
    results: [{ call_id: 'c', output: '{}' }],
  });
  expect(create.mock.calls[1][0].input).toContainEqual({
    type: 'function_call_output',
    call_id: 'c',
    output: '{}',
  });
});
it('logs failures and fails closed on flagged moderation', async () => {
  vi.stubEnv('OPENAI_MODEL_DEFAULT', 'configured-fast');
  create.mockRejectedValue(new Error('unavailable'));
  const log = vi.fn(async (_call: AiCall) => {
      void _call;
    }),
    provider = openaiProvider(log, {
      reserve: async () => 'test',
      settle: async () => {},
    });
  await expect(
    provider.respond({
      purpose: 'fast',
      instructions: '',
      input: '',
      schema: responseSchema,
    }),
  ).rejects.toThrow();
  expect(log.mock.calls[0][0]).toMatchObject({ ok: false });
  moderate.mockResolvedValue({ results: [{ flagged: true }] });
  expect(await provider.moderate('tekst')).toBe(false);
});
it('reserves before paid calls, refuses exhausted budget and keeps failed-call ceiling', async () => {
  vi.stubEnv('OPENAI_MODEL_DEFAULT', 'mock-fast');
  const guard = {
    reserve: vi.fn().mockResolvedValue(null),
    settle: vi.fn().mockResolvedValue(undefined),
  };
  const provider = openaiProvider(vi.fn(), guard);
  const request = {
    purpose: 'fast' as const,
    instructions: '',
    input: '{}',
    schema: responseSchema,
  };
  await expect(provider.respond(request)).rejects.toThrow('budsjettet');
  expect(create).not.toHaveBeenCalled();
  expect(guard.settle).not.toHaveBeenCalled();
  guard.reserve.mockResolvedValue('reservation');
  create.mockRejectedValue(new Error('timeout'));
  await expect(provider.respond(request)).rejects.toThrow('timeout');
  expect(guard.settle).toHaveBeenCalledWith(
    'reservation',
    expect.any(Number),
    expect.objectContaining({ ok: false }),
  );
  create.mockResolvedValue({
    usage: { input_tokens: 5, output_tokens: 5 },
    output: [],
    output_text: '{}',
  });
  await provider.respond(request);
  expect(guard.settle).toHaveBeenLastCalledWith(
    'reservation',
    expect.any(Number),
    expect.objectContaining({ ok: true, input_tokens: 5, output_tokens: 5 }),
  );
});
