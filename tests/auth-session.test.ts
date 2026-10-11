import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const context = vi.hoisted(() => ({
  configured: true,
  user: null as { id: string } | null,
  cookie: '00000000-0000-4000-8000-000000000001',
  locked: false,
  dbError: false,
  exchangeError: false,
  rpcError: false,
}));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: context.cookie }) }),
}));
vi.mock('@/lib/db/server', () => ({
  configured: () => context.configured,
  db: async () => ({
    auth: {
      getUser: async () => ({ data: { user: context.user }, error: null }),
      exchangeCodeForSession: async () => ({
        error: context.exchangeError ? new Error('expired') : null,
      }),
    },
    rpc: async () => ({
      error: context.rpcError ? new Error('db') : null,
      data: 'household',
    }),
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          error: context.dbError ? new Error('db') : null,
          data: {
            id: context.cookie,
            parent_id: context.user?.id,
            leo_mode_locked: context.locked,
          },
        }),
      };
      return query;
    },
  }),
}));
import { parentOnly, signedIn } from '@/lib/auth/session';
import { GET } from '@/app/auth/callback/route';
import { NextRequest } from 'next/server';
beforeEach(() => {
  vi.stubEnv('APP_URL', 'http://localhost:3000');
  Object.assign(context, {
    configured: true,
    user: { id: 'parent' },
    cookie: '00000000-0000-4000-8000-000000000001',
    locked: false,
    dbError: false,
    exchangeError: false,
    rpcError: false,
  });
});
afterEach(() => vi.unstubAllEnvs());
describe('server-side parent gates', () => {
  it('requires authentication even with a device cookie', async () => {
    context.user = null;
    await expect(signedIn()).rejects.toThrow('redirect:/login');
  });
  it('redirects to setup when Supabase is missing', async () => {
    context.configured = false;
    await expect(signedIn()).rejects.toThrow('redirect:/login');
  });
  it('blocks parent actions in Leo-mode and accepts an unlocked device', async () => {
    context.locked = true;
    await expect(parentOnly()).rejects.toThrow('redirect:/leo');
    context.locked = false;
    expect((await parentOnly()).user.id).toBe('parent');
  });
  it('fails closed if the persisted lock cannot be read', async () => {
    context.dbError = true;
    await expect(parentOnly()).rejects.toThrow('Leo-låsen');
  });
});
describe('PKCE callback', () => {
  it('keeps the configured cookie origin when Next uses an internal hostname', async () => {
    vi.stubEnv('APP_URL', 'http://127.0.0.1:3000');
    const response = await GET(
      new NextRequest('http://localhost:3000/auth/callback?code=test-code'),
    );
    expect(response.headers.get('location')).toBe(
      'http://127.0.0.1:3000/forelder',
    );
    vi.stubEnv('APP_URL', 'ftp://example.test');
    expect(
      (await GET(new NextRequest('http://localhost:3000/auth/callback')))
        .status,
    ).toBe(503);
  });
  it('exchanges the code and initializes the household before redirect', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3000/auth/callback?code=test-code'),
    );
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/forelder',
    );
  });
  it('rejects missing/expired codes and failed household setup', async () => {
    expect(
      (
        await GET(new NextRequest('http://localhost:3000/auth/callback'))
      ).headers.get('location'),
    ).toContain('/login?error=link');
    context.exchangeError = true;
    expect(
      (
        await GET(
          new NextRequest('http://localhost:3000/auth/callback?code=test-code'),
        )
      ).headers.get('location'),
    ).toContain('/login?error=link');
    context.exchangeError = false;
    context.rpcError = true;
    expect(
      (
        await GET(
          new NextRequest('http://localhost:3000/auth/callback?code=test-code'),
        )
      ).headers.get('location'),
    ).toContain('/login?error=link');
  });
});
