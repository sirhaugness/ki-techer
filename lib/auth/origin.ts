import 'server-only';
import { z } from 'zod';

const httpUrl = z.url({ protocol: /^https?$/ });

function urlOrigin(value: string): string | null {
  const parsed = httpUrl.safeParse(value);
  if (!parsed.success) return null;
  const url = new URL(parsed.data);
  return url.username || url.password ? null : url.origin;
}

function hostOrigin(host: string, protocol: string | null): string | null {
  // A Host header is an authority, never a URL, path or list of proxies.
  if (/[\s,/@\\?#]/.test(host)) return null;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const scheme = local && protocol !== 'https' ? 'http' : 'https';
  return urlOrigin(`${scheme}://${host}`);
}

/** Shared by sending the email and exchanging its code: keep cookie origin. */
export function authOrigin(
  requestHeaders: Pick<Headers, 'get'>,
  requestUrl?: string,
): string | null {
  const configured = process.env.APP_URL?.trim();
  if (configured) return urlOrigin(configured);

  // Vercel supplies the external host/protocol behind its TLS proxy. Outside
  // Vercel, use Host rather than trusting arbitrary forwarded headers.
  const vercel = process.env.VERCEL === '1';
  const host =
    (vercel ? requestHeaders.get('x-forwarded-host') : null) ||
    requestHeaders.get('host');
  if (host) return hostOrigin(host, requestHeaders.get('x-forwarded-proto'));

  // VERCEL_URL has no scheme. Prefer the request above so branch aliases and
  // custom production domains retain their own PKCE/session cookies.
  const deployment = process.env.VERCEL_URL?.trim();
  if (deployment) return hostOrigin(deployment, 'https');
  return requestUrl ? urlOrigin(requestUrl) : null;
}
