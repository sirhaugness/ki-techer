import { after } from 'next/server';
import { reflectPending } from '@/lib/profile/repository';
import { chapter } from '@/lib/profile/story';
import { adminDb } from '@/lib/db/server';
import { leoAccess } from '@/lib/learning/access';
import { fixtureEnabled, fixture, resetFixture } from '@/lib/learning/fixture';
import { latestSession } from '@/lib/learning/repository';
import { publicView } from '@/lib/learning/session';
import { progressForPart } from '@/lib/engine/medallion';
import { LeoExperience } from '@/components/leo/experience';
import { redirect } from 'next/navigation';
import { UnlockForm } from '@/app/forelder/forms';
export const dynamic = 'force-dynamic';
export default async function LeoPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string }>;
}) {
  const mock = fixtureEnabled(),
    query = await searchParams;
  if (mock && query.fixture) {
    resetFixture(query.fixture === 'master');
    redirect('/leo');
  }
  const f = mock ? fixture() : null;
  const profile = f?.profile ?? (await leoAccess()).profile;
  const state = f ? f.state : await latestSession(profile.id);
  if (!mock) after(() => reflectPending(profile.id, profile.householdId));
  const interestRows =
    f?.interests ??
    (await adminDb().from('interests').select('*').eq('learner_id', profile.id))
      .data ??
    [];
  const completed = mock
    ? state?.endedAt
      ? 1
      : 0
    : ((
        await adminDb()
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('learner_id', profile.id)
          .not('ended_at', 'is', null)
      ).count ?? 0);
  const story = chapter(interestRows, completed);
  const parts =
    state?.parts ??
    ([1, 2, 3, 4] as const).map((id) => progressForPart(id, {}));
  return (
    <>
      <LeoExperience
        key={`${state?.id ?? 'home'}:${state?.revision ?? 0}`}
        profile={profile}
        story={story}
        initial={state ? publicView(state) : null}
        parts={parts}
        diagnosticComplete={state?.diagnosticComplete ?? false}
      />
      {!mock && (
        <details className="mt-12">
          <summary className="min-h-12 cursor-pointer">For forelder</summary>
          <UnlockForm />
        </details>
      )}
    </>
  );
}
