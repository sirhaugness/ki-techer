import { after } from 'next/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UnlockForm } from '@/app/forelder/forms';
import { PreparedScene } from '@/components/leo/prepared-scene';
import { leoAccess } from '@/lib/learning/access';
import { fixtureEnabled, fixture, resetFixture } from '@/lib/learning/fixture';
import { latestSession } from '@/lib/learning/repository';
import { resetChapterFixtures } from '@/lib/free-story/fixture';
import { maintainLearner } from '@/lib/profile/home';
import styles from './home.module.css';
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
    redirect('/leo');
  }
  const f = mock ? fixture() : null;
  const profile = f?.profile ?? (await leoAccess()).profile;
  const state = f ? f.state : await latestSession(profile.id);
  const progress = state?.preparedChapter;
  const finished = progress?.index === 3;
  if (!mock) after(() => maintainLearner(profile.id));
  return (
    <div className={styles.home}>
      <header className={styles.welcome}>
        <p className={styles.brand}>LEO-LÆREREN</p>
        <h1>Hei, {profile.firstName}!</h1>
        <p>Romskipet venter. Klar for et matteeventyr?</p>
      </header>
      <article className={styles.chapter} aria-labelledby="chapter-title">
        <div className={styles.cover}>
          <PreparedScene index={0} solved={false} />
        </div>
        <div className={styles.content}>
          <p className={styles.world}>STAR WARS</p>
          <h2 id="chapter-title">Darth Vaders felle</h2>
          <p>Hjelp Luke og R2-D2 forbi Vaders feller og tilbake til Falcon.</p>
          {progress && (
            <p className={styles.saved}>
              {finished
                ? 'Du har fullført de tre oppdragene.'
                : `Arbeidet ditt er lagret. Du er på oppdrag ${progress.index + 1} av 3.`}
            </p>
          )}
          <Link href="/leo/stjerneoppdrag" className={styles.play}>
            {finished
              ? 'Se Star Wars-eventyret'
              : progress
                ? 'Fortsett Star Wars-eventyret'
                : 'Spill Star Wars'}{' '}
            <span aria-hidden="true">→</span>
          </Link>
          <p className={styles.detail}>
            Prøv tre oppdrag med brikker, figurer og en lærer som hjelper deg.
          </p>
          <p className={styles.note}>
            Du kan ta pause underveis. Vi husker hvor du er.
          </p>
        </div>
      </article>
      {!mock && (
        <details className={styles.parent}>
          <summary>For forelder</summary>
          <UnlockForm />
        </details>
      )}
    </div>
  );
}
