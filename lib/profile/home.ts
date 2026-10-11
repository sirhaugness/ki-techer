import 'server-only';
import { adminDb } from '../db/server';
import { fixture, fixtureEnabled } from '../learning/fixture';
import { chapter } from './story';
import type { LearnerProfile } from '../learning/types';
export async function homeChapter(profile: LearnerProfile) {
  if (fixtureEnabled()) {
    const f = fixture();
    return chapter(f.interests, f.state?.endedAt ? 1 : 0);
  }
  const db = adminDb();
  const [interestRows, completed] = await Promise.all([
    db.from('interests').select('*').eq('learner_id', profile.id),
    db
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('learner_id', profile.id)
      .not('ended_at', 'is', null),
  ]);
  if (interestRows.error || completed.error) return chapter([], 0);
  return chapter(interestRows.data ?? [], completed.count ?? 0);
}
export async function maintainLearner(learnerId: string) {
  const { error } = await adminDb().rpc('maintain_learner', {
    target_learner: learnerId,
  });
  if (error) throw new Error('Kunne ikke rydde gamle logger.');
  const db = adminDb();
  const learner = await db
    .from('learners')
    .select('household_id')
    .eq('id', learnerId)
    .maybeSingle();
  if (!learner.data) return;
  const expired = await db
    .from('tts_cache')
    .select('text_hash,voice,storage_path')
    .like('storage_path', `${learner.data.household_id}/%`)
    .lt(
      'generation_started_at',
      new Date(Date.now() - 30 * 86400000).toISOString(),
    )
    .limit(100);
  if (expired.error) throw new Error('Kunne ikke finne gammel lyd.');
  for (const audio of expired.data ?? []) {
    const removed = await db.storage
      .from('leo-tts')
      .remove([audio.storage_path]);
    if (removed.error) throw new Error('Kunne ikke rydde gammel lyd.');
    await db
      .from('tts_cache')
      .delete()
      .eq('text_hash', audio.text_hash)
      .eq('voice', audio.voice);
  }
}
