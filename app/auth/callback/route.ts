import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db/server';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  console.info('Auth callback: code present', Boolean(code));
  if (code) {
    const client = await db();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const result = await client.rpc('ensure_household', {});
      if (!result.error) {
        console.info('Auth callback: household ready');
        return NextResponse.redirect(new URL('/forelder', request.url));
      }
      console.error('Auth callback: household failed', result.error.code);
    } else {
      console.error('Auth callback: exchange failed', error.code, error.status);
    }
  }
  return NextResponse.redirect(new URL('/login?error=link', request.url));
}
