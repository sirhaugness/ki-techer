import { leoAccess } from '@/lib/learning/access';
import { fixture, fixtureEnabled } from '@/lib/learning/fixture';
import { ChapterPlayer } from '@/components/leo/chapter-player';

export const dynamic = 'force-dynamic';
export default async function DemoChapterPage() {
  const profile = fixtureEnabled()
    ? fixture().profile
    : (await leoAccess()).profile;
  return (
    <ChapterPlayer
      storageKey={`leo-r2-v1:${profile.id}`}
      tutorName={profile.tutorName}
    />
  );
}
