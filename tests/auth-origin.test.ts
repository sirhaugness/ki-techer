import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const context = vi.hoisted(() => ({
  headers: new Headers(),
  send: vi.fn(async (): Promise<{ error: AuthApiError | null }> => ({
    error: null,
  })),
}));
vi.mock('next/headers', () => ({ headers: async () => context.headers }));
vi.mock('@/lib/db/server', () => ({
  configured: () => true,
  db: async () => ({
    auth: {
      signInWithOtp: context.send,
      exchangeCodeForSession: async () => ({ error: null }),
    },
    rpc: async () => ({ error: null }),
  }),
}));
import { authOrigin } from '@/lib/auth/origin';
import { sendLink } from '@/app/login/actions';
import { GET } from '@/app/auth/callback/route';
import { NextRequest } from 'next/server';
import { AuthApiError } from '@supabase/supabase-js';

beforeEach(() => {
  vi.stubEnv('APP_URL', '');
  vi.stubEnv('VERCEL_URL', '');
  vi.stubEnv('VERCEL', '');
  context.headers = new Headers();
  context.send.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('email sending failures', () => {
  it.each([
    ['email_address_not_authorized', 403, 'prosjektets medlemmer'],
    ['over_email_send_rate_limit', 429, 'innloggings-e-poster er nådd'],
    ['email_provider_disabled', 422, 'slått av'],
    ['otp_disabled', 422, 'slått av'],
    ['signup_disabled', 422, 'Nye kontoer'],
    ['captcha_failed', 422, 'sikkerhetskontroll'],
    ['email_address_invalid', 422, 'ekte e-postadresse'],
    ['bad_jwt', 401, 'publishable key'],
    ['over_request_rate_limit', 429, 'For mange innloggingsforsøk'],
    ['unexpected_failure', 500, 'Auth-logger'],
  ] as const)(
    'explains %s without exposing the provider response',
    async (code, status, message) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      context.headers = new Headers({ host: 'preview.vercel.app' });
      context.send.mockResolvedValueOnce({
        error: new AuthApiError(
          'Sensitive response with parent@example.test and secret-value',
          status,
          code,
        ),
      });
      const form = new FormData();
      form.set('email', 'parent@example.test');
      const result = await sendLink({ message: '' }, form);
      expect(result.message).toContain(message);
      expect(result.message).not.toMatch(
        /parent@example|secret-value|Sensitive/,
      );
      expect(log).toHaveBeenCalledWith('Innloggingslenke kunne ikke sendes', {
        code,
        status,
      });
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /parent@example|secret-value|Sensitive/,
      );
    },
  );
});

describe('automatic Auth origin', () => {
  it.each(['branch-preview.vercel.app', 'leo.example.no'])(
    'keeps %s for both sending email and returning to the parent page',
    async (host) => {
      vi.stubEnv('VERCEL', '1');
      vi.stubEnv('VERCEL_URL', 'different-deployment.vercel.app');
      context.headers = new Headers({
        host: 'internal.local',
        'x-forwarded-host': host,
        'x-forwarded-proto': 'https',
      });
      const form = new FormData();
      form.set('email', 'parent@example.test');
      expect((await sendLink({ message: '' }, form)).message).toContain(
        'Sjekk e-posten',
      );
      expect(context.send).toHaveBeenCalledWith({
        email: 'parent@example.test',
        options: { emailRedirectTo: `https://${host}/auth/callback` },
      });
      const response = await GET(
        new NextRequest('http://localhost:3000/auth/callback?code=test-code', {
          headers: context.headers,
        }),
      );
      expect(response.headers.get('location')).toBe(`https://${host}/forelder`);
    },
  );
  it('uses VERCEL_URL without manual APP_URL when request headers are unavailable', async () => {
    vi.stubEnv('VERCEL_URL', 'deployment.vercel.app');
    const form = new FormData();
    form.set('email', 'parent@example.test');
    await sendLink({ message: '' }, form);
    expect(context.send).toHaveBeenCalledWith({
      email: 'parent@example.test',
      options: {
        emailRedirectTo: 'https://deployment.vercel.app/auth/callback',
      },
    });
    expect(authOrigin(context.headers, 'http://localhost:3000')).toBe(
      'https://deployment.vercel.app',
    );
  });
  it('uses Host to retain local cookies despite Next normalizing request.url', async () => {
    context.headers = new Headers({ host: '127.0.0.1:3000' });
    const response = await GET(
      new NextRequest('http://localhost:3000/auth/callback', {
        headers: context.headers,
      }),
    );
    expect(response.headers.get('location')).toBe(
      'http://127.0.0.1:3000/login?error=link',
    );
  });
  it('honors an explicit valid APP_URL and normalizes it to its origin', () => {
    vi.stubEnv('APP_URL', 'https://fixed.example.no/some/path');
    expect(authOrigin(new Headers({ host: 'preview.vercel.app' }))).toBe(
      'https://fixed.example.no',
    );
  });
  it('uses HTTPS remotely even when the proxy reaches Next over HTTP', () => {
    expect(
      authOrigin(
        new Headers({ host: 'leo.example.no', 'x-forwarded-proto': 'http' }),
      ),
    ).toBe('https://leo.example.no');
  });
  it('ignores untrusted forwarded hosts outside Vercel', () => {
    expect(
      authOrigin(
        new Headers({
          host: 'localhost:3000',
          'x-forwarded-host': 'untrusted.example.test',
        }),
      ),
    ).toBe('http://localhost:3000');
  });
  it.each([
    'https://bad.example',
    'good.example@bad.example',
    'good.example/path',
    'good.example,bad.example',
    'good.example\\bad.example',
  ])('rejects malformed Host %s', (host) => {
    expect(authOrigin(new Headers({ host }))).toBeNull();
  });
  it.each(['ftp://example.test', 'https://user:password@example.test'])(
    'rejects an invalid explicit override instead of sending email',
    async (url) => {
      vi.stubEnv('APP_URL', url);
      const form = new FormData();
      form.set('email', 'parent@example.test');
      expect((await sendLink({ message: '' }, form)).message).toContain(
        'Nettadressen',
      );
      expect(context.send).not.toHaveBeenCalled();
    },
  );
  it('fails clearly if no address can be resolved', async () => {
    const form = new FormData();
    form.set('email', 'parent@example.test');
    expect((await sendLink({ message: '' }, form)).message).toContain(
      'Nettadressen',
    );
    expect(context.send).not.toHaveBeenCalled();
  });
});
