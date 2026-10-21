import { after } from 'next/server';
import { reflectPending } from '@/lib/profile/repository';
import { homeChapter, maintainLearner } from '@/lib/profile/home';
import { leoAccess } from '@/lib/learning/access';
import { fixtureEnabled, fixture, resetFixture } from '@/lib/learning/fixture';
import { latestSession } from '@/lib/learning/repository';
import { publicView } from '@/lib/learning/session';
import { progressForPart } from '@/lib/engine/medallion';
import { LeoExperience } from '@/components/leo/experience';
import { redirect } from 'next/navigation';
import { UnlockForm } from '@/app/forelder/forms';
import Link from 'next/link';
import { resetChapterFixtures } from '@/lib/free-story/fixture';
export const dynamic = 'force-dynamic';
export default async function LeoPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string }>;
}) {
  const mock = fixtureEnabled(),
    query = await searchParams;
  if (mock && query.fixture) {
    resetChapterFixtures();
    resetFixture(
      query.fixture === 'master',
      ['practice', 'quiet', 'story'].includes(query.fixture),
      ['quiet', 'story'].includes(query.fixture),
    );
    if (query.fixture === 'story') fixture().storyDriven = true;
    redirect('/leo');
  }
  const f = mock ? fixture() : null;
  const profile = f?.profile ?? (await leoAccess()).profile;
  const state = f ? f.state : await latestSession(profile.id);
  if (!mock)
    after(async () => {
      await maintainLearner(profile.id);
      await reflectPending(profile.id, profile.householdId);
    });
  const story = await homeChapter(profile);
  const parts =
    state?.parts ??
    ([1, 2, 3, 4] as const).map((id) => progressForPart(id, {}));
  return (
    <>
      <p className="mb-4">
        <Link href="/leo/stjerneoppdrag">
          Star Wars: Darth Vaders felle – prøv tre oppdrag →
        </Link>
      </p>
      <p className="mb-4 text-sm">
        <Link href="/leo/eventyr">
          Utforsk et nytt kapittel med dine interesser →
        </Link>
      </p>
      <LeoExperience
        key={`${state?.id ?? 'home'}:${state?.revision ?? 0}`}
        profile={profile}
        story={story}
        initial={
          state && !state.freeChapter && !state.preparedActive
            ? publicView(state, !mock)
            : null
        }
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
