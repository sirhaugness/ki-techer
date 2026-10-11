import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  rpc: vi.fn(),
  clear: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/parent/repository', () => ({
  parentLearner: mocks.access,
  clearHousehold: mocks.clear,
}));
vi.mock('@/lib/db/server', () => ({ adminDb: () => ({ rpc: mocks.rpc }) }));
import { POST } from '../../app/api/parent/route';
import { GET } from '../../app/api/parent/export/route';
const learnerId = '00000000-0000-4000-8000-000000000099';
function request(body: unknown, origin = 'https://preview.example') {
  return new Request('https://preview.example/api/parent', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.stubEnv('APP_URL', '');
  vi.stubEnv('VERCEL_URL', '');
  mocks.access.mockReset();
  mocks.rpc.mockReset();
  mocks.clear.mockReset();
  mocks.access.mockResolvedValue({
    mock: false,
    householdId: 'own-household',
    learner: { settings: {} },
  });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});
it('rejects cross-origin mutations and malformed commands before privilege use', async () => {
  expect(
    (
      await POST(
        request(
          { action: 'resetDiagnostic', learnerId },
          'https://evil.example',
        ),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await POST(
        request({ action: 'clearData', learnerId, confirmation: 'yes' }),
      )
    ).status,
  ).toBe(400);
  expect(mocks.access).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('parent gate blocks locked, unauthenticated and foreign profiles before export or mutation', async () => {
  for (const error of ['locked', 'signed out', 'foreign']) {
    mocks.access.mockRejectedValue(new Error(error));
    expect(
      (await POST(request({ action: 'resetDiagnostic', learnerId }))).status,
    ).toBe(400);
    expect(
      (
        await GET(
          new Request(
            `https://preview.example/api/parent/export?learnerId=${learnerId}`,
          ),
        )
      ).status,
    ).toBe(403);
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('exports only the authorized household and forces a private download', async () => {
  mocks.rpc.mockResolvedValue({
    error: null,
    data: {
      sessions: Array.from({ length: 1001 }, (_, id) => ({ id })),
      messages: [{ text: 'Matte' }],
    },
  });
  const result = await GET(
    new Request(
      `https://preview.example/api/parent/export?learnerId=${learnerId}`,
    ),
  );
  expect(mocks.rpc).toHaveBeenCalledWith('export_household', {
    target_household: 'own-household',
  });
  expect(result.headers.get('content-disposition')).toContain('attachment');
  expect(result.headers.get('cache-control')).toContain('no-store');
  expect((await result.json()).sessions).toHaveLength(1001);
});
it('scopes profile writes and deletion to verified membership', async () => {
  const result = await POST(
    request({
      action: 'profile',
      learnerId,
      id: null,
      category: 'styrke',
      text: 'Prøver med tegning',
      status: 'låst',
    }),
  );
  expect(result.status).toBe(200);
  expect(mocks.rpc.mock.calls[0][1].target_learner).toBe(learnerId);
  await POST(
    request({ action: 'clearData', learnerId, confirmation: 'SLETT' }),
  );
  expect(mocks.clear).toHaveBeenCalledWith('own-household');
});
