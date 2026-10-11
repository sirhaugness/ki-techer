import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  parent: vi.fn(),
  clear: vi.fn(),
  signout: vi.fn(),
  remove: vi.fn(),
  drop: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/session', () => ({ parentOnly: m.parent }));
vi.mock('@/lib/parent/repository', () => ({ clearHousehold: m.clear }));
vi.mock('@/lib/db/server', () => ({
  adminDb: () => ({
    auth: { admin: { deleteUser: m.remove } },
    from: (table: string) =>
      table === 'parents'
        ? { select: () => ({ eq: async () => ({ data: [], error: null }) }) }
        : { delete: () => ({ eq: m.drop }) },
  }),
}));
import { POST } from '../../app/api/parent/account/route';
function request(confirmation = 'SLETT KONTO') {
  return new Request('https://preview.example/api/parent/account', {
    method: 'POST',
    headers: {
      origin: 'https://preview.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ confirmation }),
  });
}
beforeEach(() => {
  vi.stubEnv('APP_URL', '');
  vi.stubEnv('VERCEL_URL', '');
  m.parent.mockReset();
  m.clear.mockReset();
  m.signout.mockReset();
  m.remove.mockReset();
  m.drop.mockReset();
  m.parent.mockResolvedValue({
    user: { id: 'own-user' },
    client: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: { household_id: 'own-house' },
              error: null,
            }),
          }),
        }),
      }),
      auth: { signOut: m.signout },
    },
  });
  m.signout.mockResolvedValue({ error: null });
  m.remove.mockResolvedValue({ error: null });
  m.drop.mockResolvedValue({ error: null });
});
it('requires explicit confirmation and an unlocked parent before clearing or deleting accounts', async () => {
  expect((await POST(request('yes'))).status).toBe(400);
  expect(m.parent).not.toHaveBeenCalled();
  m.parent.mockRejectedValue(new Error('locked'));
  expect((await POST(request())).status).toBe(400);
  expect(m.clear).not.toHaveBeenCalled();
  expect(m.remove).not.toHaveBeenCalled();
});
it('clears own app data, revokes sessions and deletes only the current account', async () => {
  expect((await POST(request())).status).toBe(200);
  expect(m.clear).toHaveBeenCalledWith('own-house');
  expect(m.signout).toHaveBeenCalledWith({ scope: 'global' });
  expect(m.remove).toHaveBeenCalledWith('own-user');
  expect(m.drop).toHaveBeenCalledWith('id', 'own-house');
});
it('reports incomplete account removal honestly when Auth fails', async () => {
  m.remove.mockResolvedValue({ error: new Error('provider secret detail') });
  const response = await POST(request());
  expect(response.status).toBe(400);
  const message = (await response.json()).message;
  expect(message).toContain('innloggingskontoen kunne ikke slettes');
  expect(message).not.toContain('provider');
});
