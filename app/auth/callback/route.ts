import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db/server';
import { authOrigin } from '@/lib/auth/origin';
export async function GET(request: NextRequest) {
  const origin = authOrigin(request.headers, request.url);
  if (!origin)
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
        return NextResponse.redirect(new URL('/forelder', origin));
      console.error('Auth callback: household failed', result.error.code);
    } else {
      console.error('Auth callback: exchange failed', error.code, error.status);
    }
  }
  return NextResponse.redirect(new URL('/login?error=link', origin));
}
