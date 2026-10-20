import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createChapterSource,
  productionChapterSource,
  productionSafetyCheck,
  type ChapterClient,
  type ChapterStream,
  type FreeStoryRpc,
} from '../../lib/free-story/provider';
import { estimateCost } from '../../lib/ai/pricing';

const sdk = vi.hoisted(() => ({
  construct: vi.fn(),
  stream: vi.fn(),
  moderate: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('../../lib/db/server', () => ({ adminDb: () => ({ rpc: sdk.rpc }) }));
vi.mock('openai', () => ({
  default: class {
    constructor(options: unknown) {
      sdk.construct(options);
    }
    responses = { stream: sdk.stream };
    moderations = { create: sdk.moderate };
  },
}));
afterEach(() => vi.unstubAllEnvs());

const signal = () => new AbortController().signal;
const usage = { input_tokens: 450, output_tokens: 1200 };
const finalResponse = { status: 'completed', usage };
function stream(
  events: unknown[] = [
    { type: 'response.output_text.delta', delta: '{"title":' },
    { type: 'response.output_text.delta', delta: '"Leo"}' },
  ],
  final: object = finalResponse,
): ChapterStream {
  return {
    async *[Symbol.asyncIterator]() {
      yield* events as never[];
    },
    abort: vi.fn(),
    finalResponse: vi.fn().mockResolvedValue(final),
  };
}
function setup(customStream = stream()) {
  const rpc = vi.fn<FreeStoryRpc>().mockImplementation(async (name) => ({
    data: name === 'begin_free_story_call' ? 'call-id' : true,
    error: null,
  }));
  const startStream = vi
    .fn<ChapterClient['responses']['stream']>()
    .mockReturnValue(customStream);
  const options = {
    chapterId: 'chapter-id',
    owner: 'worker-id',
    client: { responses: { stream: startStream } },
    rpc,
    model: 'gpt-5-mini',
    monthlyLimitNok: 12,
  };
  const source = createChapterSource(options);
  return { source, rpc, startStream, customStream, options };
}
async function consume(iterable: AsyncIterable<string>) {
  const chunks: string[] = [];
  for await (const chunk of iterable) chunks.push(chunk);
  return chunks;
}
function settlement(rpc: ReturnType<typeof setup>['rpc']) {
  return rpc.mock.calls.find(([name]) => name === 'finish_free_story_call')![1];
}

describe('free-story streaming provider', () => {
  it('reserves before sending and streams the original deltas without paid retries', async () => {
    const { source, rpc, startStream } = setup();
    const abortSignal = signal();
    expect(
      await consume(source('generate', { interests: ['Dyr'] }, abortSignal)),
    ).toEqual(['{"title":', '"Leo"}']);
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(
      startStream.mock.invocationCallOrder[0],
    );
    const [body, options] = startStream.mock.calls[0];
    expect(body).toMatchObject({
      model: 'gpt-5-mini',
      store: false,
      reasoning: { effort: 'low' },
      max_output_tokens: 16000,
      text: { format: { type: 'json_schema', name: 'chapter', strict: true } },
    });
    expect(options).toEqual({ signal: abortSignal, maxRetries: 0 });
    expect(body).not.toHaveProperty('tools');
    expect(rpc.mock.calls[0]).toEqual([
      'begin_free_story_call',
      {
        target: 'chapter-id',
        claim_owner: 'worker-id',
        phase: 'generate',
        configured_limit: 12,
        ceiling: estimateCost(
          Buffer.byteLength(JSON.stringify(body)) + 2048,
          16000,
          'gpt-5-mini',
        ),
      },
    ]);
    expect(settlement(rpc)).toMatchObject({
      target: 'chapter-id',
      claim_owner: 'worker-id',
      phase: 'generate',
      call_id: 'call-id',
      usage: {
        ...usage,
        usage_known: true,
        ok: true,
        purpose: 'free-story-generate',
        cost_estimate: estimateCost(450, 1200, 'gpt-5-mini'),
      },
    });
    await expect(consume(source('generate', {}, abortSignal))).rejects.toThrow(
      'allerede forsøkt',
    );
    expect(startStream).toHaveBeenCalledTimes(1);
  });

  it('uses a bounded repair schema that permits zero missions, with the same header', async () => {
    const { source, startStream } = setup();
    await consume(source('generate', {}, signal()));
    await consume(source('repair', {}, signal()));
    const first = startStream.mock.calls[0][0];
    const repair = startStream.mock.calls[1][0];
    const schema = (body: typeof first) => {
      const format = body.text?.format;
      if (format?.type !== 'json_schema')
        throw new Error('Expected JSON schema');
      return format.schema.properties as Record<string, unknown>;
    };
    expect(schema(first).missions).toMatchObject({
      minItems: 20,
      maxItems: 25,
    });
    expect(schema(repair).missions).toMatchObject({
      minItems: 0,
      maxItems: 25,
    });
    expect(schema(repair).title).toEqual(schema(first).title);
    expect(repair.max_output_tokens).toBe(8000);
  });

  it.each([null, false])(
    'does not contact the model if chapter/month reservation is %s',
    async (data) => {
      const { source, rpc, startStream } = setup();
      rpc.mockResolvedValue({ data, error: null });
      await expect(consume(source('generate', {}, signal()))).rejects.toThrow(
        'budsjettet',
      );
      expect(startStream).not.toHaveBeenCalled();
      expect(rpc).toHaveBeenCalledTimes(1);
    },
  );

  it('fails closed when reservation RPC is unavailable', async () => {
    const { source, rpc, startStream } = setup();
    rpc.mockResolvedValue({ data: 'call-id', error: { message: 'offline' } });
    await expect(consume(source('generate', {}, signal()))).rejects.toThrow(
      'budsjettet',
    );
    expect(startStream).not.toHaveBeenCalled();
  });

  it('rejects an oversized conservative reservation before any database/model request', async () => {
    const { source, rpc, startStream } = setup();
    await expect(
      consume(source('generate', { text: 'ø'.repeat(300000) }, signal())),
    ).rejects.toThrow('én krone');
    expect(rpc).not.toHaveBeenCalled();
    expect(startStream).not.toHaveBeenCalled();
  });

  it('includes schema bytes in the ceiling and passes a disabled monthly budget as zero', async () => {
    const { options, rpc } = setup();
    const source = createChapterSource({ ...options, monthlyLimitNok: -1 });
    await consume(source('generate', { text: 'blå måne' }, signal()));
    expect(rpc.mock.calls[0][1]).toMatchObject({ configured_limit: 0 });
    expect(Number(rpc.mock.calls[0][1].ceiling)).toBeGreaterThan(
      estimateCost(
        Buffer.byteLength(JSON.stringify({ text: 'blå måne' })),
        16000,
        'gpt-5-mini',
      ),
    );
  });

  it('does not reserve or start if the absolute signal is already aborted', async () => {
    const { source, rpc, startStream } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(
      consume(source('generate', {}, controller.signal)),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
    expect(startStream).not.toHaveBeenCalled();
  });

  it('settles the full ceiling on a transport failure without token usage', async () => {
    const { source, rpc, startStream } = setup();
    startStream.mockImplementation(() => {
      throw new Error('transport');
    });
    await expect(consume(source('generate', {}, signal()))).rejects.toThrow(
      'transport',
    );
    expect(settlement(rpc)).toMatchObject({
      usage: {
        cost_estimate: rpc.mock.calls[0][1].ceiling,
        usage_known: false,
        ok: false,
      },
    });
    expect(startStream).toHaveBeenCalledTimes(1);
  });

  it('aborts a stalled stream and retains its full reservation', async () => {
    const stalled: ChapterStream = {
      [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
      finalResponse: () => new Promise(() => {}),
      abort: vi.fn(),
    };
    const { source, rpc, startStream } = setup(stalled);
    const controller = new AbortController();
    startStream.mockImplementation(() => {
      queueMicrotask(() => controller.abort(new Error('deadline')));
      return stalled;
    });
    await expect(
      consume(source('generate', {}, controller.signal)),
    ).rejects.toThrow('deadline');
    expect(stalled.abort).toHaveBeenCalledOnce();
    expect(settlement(rpc)).toMatchObject({
      usage: {
        usage_known: false,
        cost_estimate: rpc.mock.calls[0][1].ceiling,
      },
    });
  });

  it('settles when a consumer keeps a fragment and exits early', async () => {
    const partial = stream();
    partial.finalResponse = () => new Promise(() => {});
    const { source, rpc } = setup(partial);
    for await (const chunk of source('generate', {}, signal())) {
      expect(chunk).toBe('{"title":');
      break;
    }
    expect(partial.abort).toHaveBeenCalledOnce();
    expect(settlement(rpc)).toMatchObject({
      usage: { usage_known: false, ok: false },
    });
  });

  it('uses known terminal usage even when the model response is incomplete', async () => {
    const partial = stream(
      [
        {
          type: 'response.incomplete',
          response: {
            status: 'incomplete',
            usage,
          },
        },
      ],
      { status: 'incomplete', usage },
    );
    const { source, rpc } = setup(partial);
    await expect(consume(source('generate', {}, signal()))).rejects.toThrow(
      'ikke fullført',
    );
    expect(settlement(rpc)).toMatchObject({
      usage: {
        ...usage,
        usage_known: true,
        ok: false,
        cost_estimate: estimateCost(450, 1200, 'gpt-5-mini'),
      },
    });
  });

  it.each([
    undefined,
    { input_tokens: -1, output_tokens: 3 },
    { input_tokens: 1, output_tokens: NaN },
  ])('does not treat missing or malformed usage as free', async (badUsage) => {
    const { source, rpc } = setup(
      stream([], { status: 'completed', usage: badUsage }),
    );
    await expect(consume(source('generate', {}, signal()))).rejects.toThrow(
      'ufullstendig',
    );
    expect(settlement(rpc)).toMatchObject({
      usage: {
        usage_known: false,
        cost_estimate: rpc.mock.calls[0][1].ceiling,
      },
    });
  });

  it('reports a failed settlement rather than silently claiming success', async () => {
    const { source, rpc } = setup();
    rpc.mockImplementation(async (name) => ({
      data: name === 'begin_free_story_call' ? 'call-id' : false,
      error: null,
    }));
    await expect(consume(source('generate', {}, signal()))).rejects.toThrow(
      'kostnad',
    );
  });

  it('retains the ceiling if a stream ends with only intermediate usage counters', async () => {
    const intermediate = {
      status: 'in_progress',
      usage: { input_tokens: 0, output_tokens: 0 },
    };
    const { source, rpc } = setup(
      stream(
        [{ type: 'response.in_progress', response: intermediate }],
        intermediate,
      ),
    );
    await expect(consume(source('generate', {}, signal()))).rejects.toThrow(
      'ufullstendig',
    );
    expect(settlement(rpc)).toMatchObject({
      usage: {
        usage_known: false,
        cost_estimate: rpc.mock.calls[0][1].ceiling,
      },
    });
  });

  it('settles even if transport cleanup throws', async () => {
    const completed = stream();
    completed.abort = () => {
      throw new Error('cleanup failed');
    };
    const { source, rpc } = setup(completed);
    await consume(source('generate', {}, signal()));
    expect(settlement(rpc)).toMatchObject({
      usage: { usage_known: true, ok: true },
    });
  });

  it('allows a separate injected input safety gate to refuse before spending', async () => {
    const { options, rpc, startStream } = setup();
    const validateInput = vi.fn().mockResolvedValue(false);
    const source = createChapterSource({ ...options, validateInput });
    await expect(
      consume(source('generate', { interests: ['test'] }, signal())),
    ).rejects.toThrow('godkjennes');
    expect(validateInput).toHaveBeenCalledWith(
      JSON.stringify({ interests: ['test'] }),
      expect.any(AbortSignal),
    );
    expect(rpc).not.toHaveBeenCalled();
    expect(startStream).not.toHaveBeenCalled();
  });
});

describe('production wiring and independent safety gate (mock SDK)', () => {
  it('constructs the configured client without automatic retries', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'mock-only');
    sdk.rpc.mockImplementation(async (name: string) => ({
      data: name === 'begin_free_story_call' ? 'call-id' : true,
      error: null,
    }));
    sdk.stream.mockReturnValue(stream());
    await consume(
      productionChapterSource('chapter-id', 'worker-id')(
        'generate',
        {},
        signal(),
      ),
    );
    expect(sdk.construct).toHaveBeenCalledWith(
      expect.objectContaining({ maxRetries: 0 }),
    );
    expect(sdk.rpc).toHaveBeenCalledWith(
      'begin_free_story_call',
      expect.objectContaining({
        target: 'chapter-id',
        claim_owner: 'worker-id',
      }),
    );
  });

  it('rejects missing credentials without constructing a client', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(() => productionChapterSource('chapter-id', 'worker-id')).toThrow(
      'ikke konfigurert',
    );
    expect(await productionSafetyCheck('Leo ser en måne.', signal())).toBe(
      false,
    );
    expect(sdk.construct).not.toHaveBeenCalled();
  });

  it('rejects private text before any moderator call', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'mock-only');
    expect(
      await productionSafetyCheck('Send til leo@example.com', signal()),
    ).toBe(false);
    expect(sdk.moderate).not.toHaveBeenCalled();
  });

  it.each([
    { results: [{ flagged: false }], approved: true },
    { results: [{ flagged: true }], approved: false },
    { results: [], approved: false },
  ])(
    'requires a positive moderation result: $approved',
    async ({ results, approved }) => {
      vi.stubEnv('OPENAI_API_KEY', 'mock-only');
      sdk.moderate.mockResolvedValue({ results });
      const abortSignal = signal();
      expect(await productionSafetyCheck('Leo ser en måne.', abortSignal)).toBe(
        approved,
      );
      expect(sdk.moderate).toHaveBeenCalledWith(
        { model: 'omni-moderation-latest', input: 'Leo ser en måne.' },
        { signal: abortSignal, maxRetries: 0 },
      );
    },
  );

  it('fails closed on moderator failure and cancellation', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'mock-only');
    sdk.moderate.mockRejectedValue(new Error('offline'));
    expect(await productionSafetyCheck('Leo ser en måne.', signal())).toBe(
      false,
    );
    const controller = new AbortController();
    sdk.moderate.mockImplementation(() => {
      queueMicrotask(() => controller.abort());
      return new Promise(() => {});
    });
    expect(
      await productionSafetyCheck('Leo ser en måne.', controller.signal),
    ).toBe(false);
  });
});
