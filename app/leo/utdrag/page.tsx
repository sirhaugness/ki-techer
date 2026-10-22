import { leoAccess } from '@/lib/learning/access';
import { fixture, fixtureEnabled } from '@/lib/learning/fixture';
import { PreparedPlayer } from '@/components/leo/prepared-player';
export const dynamic = 'force-dynamic';
export default async function PreparedPage() {
  const profile = fixtureEnabled()
    ? fixture().profile
    : (await leoAccess()).profile;
  return (
    <PreparedPlayer
      tutorName={profile.tutorName}
      voice={profile.settings.voice !== false}
    />
  );
}
