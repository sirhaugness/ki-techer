import { parentLearner } from '@/lib/parent/repository';
import { parentFixture, fixtureInsight } from '@/lib/parent/fixture';
import { adminDb } from '@/lib/db/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('learnerId') ?? '';
    const access = await parentLearner(id);
    const result = access.mock
      ? {
          schema_version: 1,
          ...parentFixture(),
          ...fixtureInsight(String(parentFixture().sessions[0]?.id)),
        }
      : await adminDb()
          .rpc('export_household', { target_household: access.householdId })
          .then((r) => {
            if (r.error) throw new Error('Eksport feilet.');
            return r.data;
          });
    return new Response(
      JSON.stringify(
        {
          ...(result as object),
          login_account: 'user' in access ? access.user : null,
        },
        null,
        2,
      ),
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition':
            'attachment; filename="leo-laereren-data.json"',
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch {
    return Response.json(
      {
        message:
          'Eksport er bare tilgjengelig for innlogget forelder i egen husholdning.',
      },
      { status: 403 },
    );
  }
}
