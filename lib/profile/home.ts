import 'server-only';
import { adminDb } from '../db/server';
import { fixture, fixtureEnabled } from '../learning/fixture';
import { chapter, activeInterest } from './story';
import { latestSession } from '../learning/repository';
import type { LearnerProfile } from '../learning/types';
export async function homeChapter(profile: LearnerProfile) {
  if (fixtureEnabled()) {
    const f = fixture();
    const active = activeInterest(f.interests);
    const progress = active ? f.state?.storyProgress?.[active.id] : null;
    return chapter(
      f.interests,
      progress?.completed ?? 0,
      progress?.part ?? null,
    );
  }
  const db = adminDb();
  const [interestRows, state] = await Promise.all([
    db.from('interests').select('*').eq('learner_id', profile.id),
    latestSession(profile.id),
  ]);
  if (interestRows.error) throw new Error('Kunne ikke hente eventyret.');
  const active = activeInterest(interestRows.data ?? []);
  const progress = active ? state?.storyProgress?.[active.id] : null;
  return chapter(
    interestRows.data ?? [],
    progress?.completed ?? 0,
    progress?.part ?? null,
  );
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
