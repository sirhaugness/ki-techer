import { parentOnly } from '@/lib/auth/session';
import { authOrigin } from '@/lib/auth/origin';
import { adminDb } from '@/lib/db/server';
import { clearHousehold } from '@/lib/parent/repository';
export const maxDuration = 120;
export async function POST(request: Request) {
  if (
    request.headers.get('origin') !== authOrigin(request.headers, request.url)
  )
    return Response.json({ message: 'Last siden på nytt.' }, { status: 403 });
  const value = await request.json().catch(() => null);
  if (value?.confirmation !== 'SLETT KONTO')
    return Response.json(
      { message: 'Bekreft sletting av konto.' },
      { status: 400 },
    );
  try {
    const { client, user } = await parentOnly();
    const { data: parent, error } = await client
      .from('parents')
      .select('household_id')
      .eq('id', user.id)
      .single();
    if (error || !parent) throw new Error('Fant ikke husholdningen.');
    await clearHousehold(parent.household_id);
    const signedOut = await client.auth.signOut({ scope: 'global' });
    if (signedOut.error)
      throw new Error(
        'Læringsdata er slettet, men utlogging feilet. Logg inn igjen for å prøve kontosletting på nytt.',
      );
    const removed = await adminDb().auth.admin.deleteUser(user.id);
    if (removed.error)
      throw new Error(
        'Læringsdata er slettet, men innloggingskontoen kunne ikke slettes. Logg inn igjen og prøv på nytt.',
      );
    const remaining = await adminDb()
      .from('parents')
      .select('id')
      .eq('household_id', parent.household_id);
    if (!remaining.error && !remaining.data?.length) {
      const deleted = await adminDb()
        .from('households')
        .delete()
        .eq('id', parent.household_id);
      if (deleted.error)
        throw new Error(
          'Kontoen er slettet, men den tomme husholdningen kunne ikke fjernes.',
        );
    }
    return Response.json(
      { message: 'Kontoen og appdata er slettet.' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return Response.json(
      {
        message:
          e instanceof Error && !e.message.includes('REDIRECT')
            ? e.message
            : 'Logg inn som forelder og lås opp med PIN først.',
      },
      { status: 400 },
    );
  }
}
