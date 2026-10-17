import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('workflow', () => ({ FatalError: Error, getWritable: vi.fn() }));
const mocks = vi.hoisted(() => ({
  job: vi.fn(),
  calls: vi.fn(),
  rpc: vi.fn(),
  fail: vi.fn(),
}));
vi.mock('../../lib/chapters/store', () => ({
  chapterDb: () => ({
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ eq: mocks.calls }) }),
  }),
  jobById: mocks.job,
  checkpoint: vi.fn(),
  failJob: mocks.fail,
  CheckpointUnavailable: class extends Error {},
}));
import { recoverPreparation } from '../../workflows/chapter-steps';
beforeEach(() => {
  mocks.job.mockResolvedValue({
    id: 'job',
    owner: 'owner',
    state: 'running',
    phase: 'draft',
    error_code: null,
  });
  mocks.calls.mockResolvedValue({
    data: [{ state: 'completed' }],
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});
describe('Workflow recovery after a lost step result', () => {
  it('continues a checkpointed running phase without another browser request', async () => {
    expect(await recoverPreparation('job', 'owner', 'run')).toBe('retry');
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('claim_chapter', {
      target_job: 'job',
      claim_owner: 'owner',
      run_id: 'run',
    });
  });
  it('replays recovery when resume committed but its response was lost', async () => {
    mocks.job.mockResolvedValueOnce({
      owner: 'owner',
      state: 'failed',
      error_code: 'checkpoint_unavailable',
    });
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'connection lost after commit' },
    });
    await expect(recoverPreparation('job', 'owner', 'run')).rejects.toThrow(
      'Could not recover checkpoint',
    );
    mocks.job.mockResolvedValueOnce({
      owner: null,
      state: 'queued',
      error_code: null,
    });
    expect(await recoverPreparation('job', 'owner', 'run')).toBe('retry');
    expect(mocks.rpc).toHaveBeenLastCalledWith('claim_chapter', {
      target_job: 'job',
      claim_owner: 'owner',
      run_id: 'run',
    });
  });
  it.each(['pending', 'unknown'])(
    'never replays an uncertain %s provider call',
    async (state) => {
      mocks.calls.mockResolvedValue({ data: [{ state }], error: null });
      expect(await recoverPreparation('job', 'owner', 'run')).toBe('stopped');
      expect(mocks.fail).toHaveBeenCalledWith(
        'job',
        'owner',
        'unknown',
        'provider_outcome_unknown',
      );
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it('fences an obsolete worker before inspecting or changing its successor', async () => {
    mocks.job.mockResolvedValue({ owner: 'successor', state: 'running' });
    expect(await recoverPreparation('job', 'owner', 'run')).toBe('stopped');
    expect(mocks.calls).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('keeps explicit editorial/provider failures stopped', async () => {
    mocks.job.mockResolvedValue({
      owner: 'owner',
      state: 'failed',
      error_code: 'editorial_review_rejected',
    });
    expect(await recoverPreparation('job', 'owner', 'run')).toBe('stopped');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
