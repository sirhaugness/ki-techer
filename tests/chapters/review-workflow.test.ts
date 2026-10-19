import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type {
  ChapterJob,
  PreparationInput,
} from '../../lib/chapters/production-contracts';
vi.mock('server-only', () => ({}));
const testState = vi.hoisted(() => ({
  job: null as unknown as ChapterJob,
  journal: new Map<string, unknown>(),
  purchased: [] as string[],
  elapsed: [] as number[],
  verdicts: [] as boolean[],
}));
vi.mock('workflow', () => ({
  FatalError: Error,
  getWritable: vi.fn(),
  getWorkflowMetadata: () => ({ workflowRunId: 'run' }),
  sleep: vi.fn(),
}));
vi.mock('../../lib/chapters/store', () => ({
  jobById: async () => structuredClone(testState.job),
  chapterDb: () => ({
    rpc: async () => ({ data: true, error: null }),
    from: () => {
      let phase = '';
      const query = {
        select: () => query,
        eq: (key: string, value: string) => {
          if (key === 'phase') phase = value;
          return query;
        },
        maybeSingle: async () => ({
          data: testState.journal.has(phase)
            ? { state: 'completed', result: testState.journal.get(phase) }
            : null,
          error: null,
        }),
      };
      return query;
    },
  }),
  checkpoint: async (
    _job: unknown,
    _owner: string,
    phase: ChapterJob['phase'],
    data: object,
  ) => {
    testState.job.phase = phase;
    testState.job.data = {
      ...(testState.job.data as object),
      ...data,
    } as ChapterJob['data'];
  },
  failJob: vi.fn(),
  CheckpointUnavailable: class extends Error {},
}));
vi.mock('../../lib/chapters/paid-phase', () => ({
  PreparationError: class extends Error {},
  paidPhase: async (
    _job: unknown,
    _owner: string,
    phase: string,
    work: (provider: unknown) => Promise<unknown>,
  ) => {
    if (testState.journal.has(phase)) return testState.journal.get(phase);
    testState.purchased.push(phase);
    const began = Date.now();
    const result = await work({});
    testState.elapsed.push(Date.now() - began);
    testState.journal.set(phase, result);
    return result;
  },
}));
vi.mock('../../lib/chapters/production', async (original) => ({
  ...(await original<typeof import('../../lib/chapters/production')>()),
  productionDraft: (draft: unknown) => draft,
  critic: async () => {
    await new Promise((resolve) => setTimeout(resolve, 105000));
    return { approved: testState.verdicts.shift() };
  },
  author: async () => {
    await new Promise((resolve) => setTimeout(resolve, 105000));
    return { corrected: true };
  },
  reviewIssues: (review: { approved: boolean }) =>
    review.approved ? [] : ['Correct the physical rule.'],
}));
vi.mock('../../lib/ai/openai', () => ({
  openaiProvider: () => ({ moderate: async () => true }),
}));
vi.mock('../../workflows/chapter-steps', async (original) => ({
  ...(await original<typeof import('../../workflows/chapter-steps')>()),
  initializePreparation: async () => 'job',
  signalJob: async () => {},
  claimPreparation: async () => 'owner',
  researchChapter: async () => {},
  draftChapter: async () => {},
  prepareAssets: async () => {},
}));
import { prepareChapter } from '../../workflows/chapter-preparation';
const input = { mode: 'model' } as PreparationInput;
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  testState.job = {
    id: 'job',
    owner: 'owner',
    state: 'running',
    phase: 'review',
    workflow_run_id: 'run',
    data: { draft: {}, menu: [], facts: {}, research: {} },
  } as unknown as ChapterJob;
  testState.journal.clear();
  testState.purchased = [];
  testState.elapsed = [];
  testState.verdicts = [false, true];
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it('finishes a 315-second correction path using three separate bounded model steps', async () => {
  const began = Date.now(),
    run = prepareChapter(input);
  await vi.runAllTimersAsync();
  await expect(run).resolves.toMatchObject({ claimed: true, jobId: 'job' });
  expect(Date.now() - began).toBe(315000);
  expect(testState.elapsed).toEqual([105000, 105000, 105000]);
  expect(testState.purchased).toEqual([
    'review',
    'draft-revision',
    'review-revision',
  ]);
  expect(testState.job.phase).toBe('assets');
});
it('skips revision when the first critic accepts the chapter', async () => {
  testState.verdicts = [true];
  const run = prepareChapter(input);
  await vi.runAllTimersAsync();
  await run;
  expect(testState.purchased).toEqual(['review']);
  expect(testState.job.phase).toBe('assets');
});

it('replays completed criticism and correction without purchasing them again', async () => {
  testState.journal.set('review', { approved: false });
  testState.journal.set('draft-revision', { corrected: true });
  testState.verdicts = [true];
  const run = prepareChapter(input);
  await vi.runAllTimersAsync();
  await run;
  expect(testState.purchased).toEqual(['review-revision']);
  expect(testState.job.phase).toBe('assets');
});
