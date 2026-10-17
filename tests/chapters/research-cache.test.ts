import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('workflow', () => ({ FatalError: Error, getWritable: vi.fn() }));
const mocks = vi.hoisted(() => ({
  job: vi.fn(),
  rpc: vi.fn(),
  cache: vi.fn(),
  checkpoint: vi.fn(),
  paid: vi.fn(),
  menu: vi.fn(),
  filters: vi.fn(),
}));
vi.mock('../../lib/chapters/store', () => ({
  jobById: mocks.job,
  checkpoint: mocks.checkpoint,
  failJob: vi.fn(),
  CheckpointUnavailable: class extends Error {},
  chapterDb: () => {
    const query = {
      select: () => query,
      eq: () => query,
      neq: () => query,
      not: () => query,
      in: (...args: unknown[]) => {
        mocks.filters(...args);
        return query;
      },
      order: () => query,
      limit: () => query,
      maybeSingle: mocks.cache,
    };
    return { rpc: mocks.rpc, from: () => query };
  },
}));
vi.mock('../../lib/chapters/paid-phase', async (original) => ({
  ...(await original<object>()),
  paidPhase: mocks.paid,
}));
vi.mock('../../lib/chapters/production', async (original) => ({
  ...(await original<object>()),
  problemMenu: mocks.menu,
}));
import { researchChapter } from '../../workflows/chapter-steps';
import { productionFixture } from './fixtures/production';
beforeEach(() => {
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});
it('reuses checkpointed research from an unknown draft without another paid research call', async () => {
  const { job, packet } = productionFixture();
  const research = {
    interest: packet.interest.label,
    brief: 'Bekreftet research fra tidligere ferdig fase.',
    sources: [
      { title: 'Kilde A', url: 'https://example.org/a' },
      { title: 'Kilde B', url: 'https://example.org/b' },
    ],
    researchedAt: '2026-10-17T09:00:00.000Z',
  };
  mocks.job.mockResolvedValue({
    ...job,
    state: 'running',
    phase: 'research',
    owner: 'owner',
  });
  // This source is unknown/draft; only its research checkpoint is confirmed.
  mocks.cache.mockResolvedValue({ data: { data: { research } }, error: null });
  mocks.menu.mockResolvedValue([{}, {}, {}]);
  await researchChapter(job.id, 'owner');
  expect(mocks.filters).toHaveBeenCalledWith('phase', [
    'draft',
    'review',
    'assets',
    'ready',
  ]);
  expect(mocks.paid).not.toHaveBeenCalled();
  expect(mocks.checkpoint).toHaveBeenCalledWith(
    expect.anything(),
    'owner',
    'draft',
    expect.objectContaining({ research }),
  );
});
