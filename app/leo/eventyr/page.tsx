import { FreeStory } from '@/components/leo/free-story';
import { leoAccess } from '@/lib/learning/access';
import { fixture, fixtureEnabled } from '@/lib/learning/fixture';

export const dynamic = 'force-dynamic';

export default async function FreeStoryPage() {
  const profile = fixtureEnabled()
    ? fixture().profile
    : (await leoAccess()).profile;

  return <FreeStory tutorName={profile.tutorName} />;
}
