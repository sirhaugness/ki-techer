import { leoAccess } from '@/lib/learning/access';
import { fixture, fixtureEnabled } from '@/lib/learning/fixture';
import { StarWarsPlayer } from '@/components/leo/star-wars-player';
export const dynamic = 'force-dynamic';
export default async function PreparedPage() {
  const profile = fixtureEnabled()
    ? fixture().profile
    : (await leoAccess()).profile;
  return (
    <StarWarsPlayer
      voice={profile.settings.voice !== false}
      autoRead={profile.settings.auto_read === true}
    />
  );
}
