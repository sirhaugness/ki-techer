import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db/server';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const client = await db();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const result = await client.rpc('ensure_household', {});
      if (!result.error)
        return NextResponse.redirect(new URL('/forelder', request.url));
    }
  }
  return NextResponse.redirect(new URL('/login?error=link', request.url));
}
