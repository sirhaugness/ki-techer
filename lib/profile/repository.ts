import 'server-only';
import { adminDb } from '../db/server';
import { asJson, snapshot } from '../learning/repository';
import { controlledProvider } from '../ai/control';
import { reflectSession } from '../ai/reflect';
export async function observations(learnerId: string) {
  const { data, error } = await adminDb()
    .from('learner_profile_observations')
    .select('*')
    .eq('learner_id', learnerId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error('Kunne ikke hente profilhukommelsen.');
  return data ?? [];
}
/** Durable pending status + lease; retry on the next visit if the worker stops. */
export async function reflectPending(learnerId: string, householdId: string) {
  const db = adminDb();
  const { data: pending, error } = await db
    .from('sessions')
    .select('*')
    .eq('learner_id', learnerId)
    .not('ended_at', 'is', null)
    .is('reflected_at', null)
    .order('started_at')
    .limit(3);
  if (error) throw new Error('Kunne ikke hente ventende refleksjon.');
  for (const row of pending ?? []) {
    const { data: claimed, error: claimError } = await db.rpc(
      'claim_reflection',
      { target_session: row.id, target_learner: learnerId },
    );
    if (claimError) throw new Error('Kunne ikke starte refleksjon.');
    if (!claimed) continue;
    const state = snapshot(row);
    if (!state) continue;
    const existing = await observations(learnerId);
    const { data: tools, error: toolError } = await db
      .from('tool_calls')
      .select('tool,ok')
      .eq('session_id', row.id)
      .eq('learner_id', learnerId)
      .limit(100);
    if (toolError) throw new Error('Kunne ikke hente verktøyhistorikk.');
    const provider = await controlledProvider(householdId);
    const result = await reflectSession(provider, state, existing, tools ?? []);
    const { error: saveError } = await db.rpc('commit_reflection', {
      target_session: row.id,
      target_learner: learnerId,
      result: asJson(result),
    });
    if (saveError) throw new Error('Refleksjonen kunne ikke lagres.');
  }
}
