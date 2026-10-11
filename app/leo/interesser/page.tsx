import { leoAccess } from '@/lib/learning/access';
import { fixtureEnabled, fixture } from '@/lib/learning/fixture';
import { Interests } from '@/components/leo/interests';
export const dynamic = 'force-dynamic';
export default async function InterestsPage() {
  if (fixtureEnabled()) {
    const f = fixture();
    return (
      <Interests
        interests={f.interests}
        tutorName={f.profile.tutorName}
        avatar={f.profile.avatar}
        voiceEnabled={f.profile.settings.voice !== false}
      />
    );
  }
  const { client, profile } = await leoAccess();
  const { data, error } = await client
    .from('interests')
    .select('*')
    .eq('learner_id', profile.id);
  if (error) throw new Error('Kunne ikke hente interessene.');
  return (
    <Interests
      interests={data ?? []}
      tutorName={profile.tutorName}
      avatar={profile.avatar}
      voiceEnabled={profile.settings.voice !== false}
    />
  );
}
