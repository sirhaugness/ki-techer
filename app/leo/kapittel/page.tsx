import { fixture, fixtureEnabled } from '@/lib/learning/fixture';
import { leoAccess } from '@/lib/learning/access';
import { PreparedChapter } from '@/components/leo/prepared-chapter';
export const dynamic = 'force-dynamic';
export default async function PreparedChapterPage() {
  const profile = fixtureEnabled()
    ? fixture().profile
    : (await leoAccess()).profile;
  return <PreparedChapter tutorName={profile.tutorName} />;
}
