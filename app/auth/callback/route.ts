import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db/server';
import { z } from 'zod';
export async function GET(request: NextRequest) {
  // Next's internal request URL may use localhost behind a proxy. Redirect to
  // the same configured origin that received the PKCE/session cookies.
  const origin = z.url({ protocol: /^https?$/ }).safeParse(process.env.APP_URL);
  if (!origin.success)
    return new NextResponse(
      'Nettadressen for innlogging mangler i oppsettet.',
      {
        status: 503,
      },
    );
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const client = await db();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const result = await client.rpc('ensure_household', {});
      if (!result.error)
        return NextResponse.redirect(new URL('/forelder', origin.data));
      console.error('Auth callback: household failed', result.error.code);
    } else {
      console.error('Auth callback: exchange failed', error.code, error.status);
    }
  }
  return NextResponse.redirect(new URL('/login?error=link', origin.data));
}
