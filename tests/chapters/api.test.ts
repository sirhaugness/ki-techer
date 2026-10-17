import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  start: vi.fn(),
  active: vi.fn(),
  job: vi.fn(),
  play: vi.fn(),
  startClock: vi.fn(),
  allow: vi.fn(),
}));
vi.mock('../../lib/learning/access', () => ({ leoAccess: mocks.access }));
vi.mock('workflow/api', () => ({ start: mocks.start }));
vi.mock('../../workflows/chapter-preparation', () => ({
  prepareChapter: () => {},
}));
vi.mock('../../lib/chapters/store', () => ({
  activeJob: mocks.active,
  jobById: mocks.job,
  chapterDb: vi.fn(),
}));
vi.mock('../../lib/chapters/clock', () => ({
  mayPlayChapter: () => true,
  startChapterPlay: mocks.startClock,
  pauseChapter: vi.fn(),
}));
vi.mock('../../lib/security/limits', () => ({ allowDevice: mocks.allow }));
import { POST } from '../../app/api/chapters/route';
import { productionFixture } from './fixtures/production';
const profile = {
  id: '00000000-0000-4000-8000-000000000004',
  householdId: '00000000-0000-4000-8000-000000000003',
  settings: {},
};
function request(body: unknown) {
  return new Request('https://test.example/api/chapters', {
    method: 'POST',
    headers: {
      host: 'test.example',
      origin: 'https://test.example',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  const { job } = productionFixture();
  mocks.access.mockResolvedValue({
    profile,
    device: { id: 'test' },
    client: {
      auth: {
        getUser: async () => ({
          data: { user: { email: 'synthetic@example.invalid' } },
        }),
      },
    },
  });
  mocks.allow.mockResolvedValue(true);
  mocks.active.mockResolvedValue(null);
  mocks.job.mockResolvedValue(job);
  mocks.start.mockResolvedValue({
    runId: 'run-test',
    getReadable: () =>
      new ReadableStream({
        start(c) {
          c.enqueue({ jobId: job.id });
          c.close();
        },
      }),
  });
});
describe('R3 actual JSON and authorized API boundary', () => {
  it('unwraps boundedJson and dispatches a durable run before job creation', async () => {
    const r = await POST(request({ command: 'prepare', interest: 'Dyr' }));
    expect(r.status).toBe(200);
    expect(mocks.start).toHaveBeenCalledWith(
      expect.anything(),
      [
        expect.objectContaining({
          learnerId: profile.id,
          mode: 'model',
          interest: { key: 'dyr', label: 'Dyr' },
        }),
      ],
      { region: 'arn1' },
    );
    const b = await r.json();
    expect(b.view.jobId).toBe(productionFixture().job.id);
    expect(b.view.outcome).toBeNull();
  });
  it('rejects oversized input and untrusted origins before dispatch', async () => {
    expect(
      (await POST(request({ command: 'prepare', interest: 'x'.repeat(7000) })))
        .status,
    ).toBe(413);
    expect(mocks.start).not.toHaveBeenCalled();
    const r = new Request(request({ command: 'prepare', interest: 'Dyr' }), {
      headers: { host: 'test.example', origin: 'https://other.example' },
    });
    expect((await POST(r)).status).toBe(403);
  });
  it('cannot start another household packet by knowing its ID', async () => {
    const { job } = productionFixture();
    mocks.job.mockResolvedValue({ ...job, household_id: 'another' });
    const r = await POST(request({ command: 'start', jobId: job.id }));
    expect(r.status).toBe(400);
    expect(mocks.startClock).not.toHaveBeenCalled();
  });
  it('does not permit the free infrastructure probe in ordinary environments', async () => {
    const r = await POST(request({ command: 'probe', interest: 'Probe' }));
    expect(r.status).toBe(400);
    expect(mocks.start).not.toHaveBeenCalled();
  });
});
