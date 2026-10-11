import 'server-only';
import { adminDb } from '../db/server';
import type { Json, SessionRow } from '../db/types';
import type { Snapshot, LearningEvents } from './types';
import type { AiCall } from '../ai/provider';

export const asJson = (value: unknown): Json =>
  JSON.parse(JSON.stringify(value)) as Json;
export function snapshot(row: SessionRow | null): Snapshot | null {
  if (
    !row ||
    typeof row.engine_state !== 'object' ||
    !row.engine_state ||
    Array.isArray(row.engine_state) ||
    row.engine_state.version !== 1
  )
    return null;
  return row.engine_state as unknown as Snapshot;
}
export async function latestSession(learnerId: string) {
  const { data, error } = await adminDb()
    .from('sessions')
    .select('*')
    .eq('learner_id', learnerId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('Kunne ikke hente økten.');
  return snapshot(data);
}
export async function insertSession(state: Snapshot, learnerId: string) {
  const { error } = await adminDb()
    .from('sessions')
    .insert({
      id: state.id,
      learner_id: learnerId,
      started_at: state.clock.startedAt,
      planned_minutes: state.clock.plannedMinutes,
      engine_state: asJson(state),
    });
  if (error)
    throw new Error(
      'En økt er allerede i gang, eller økten kunne ikke lagres. Last siden på nytt.',
    );
}
export async function saveTurn(
  state: Snapshot,
  learnerId: string,
  expectedRevision: number,
  events: LearningEvents,
) {
  const result = await adminDb().rpc('commit_learning_turn', {
    target_session: state.id,
    target_learner: learnerId,
    expected_revision: expectedRevision,
    next_state: asJson(state),
    events: asJson(events),
  });
  if (result.error) throw new Error('Økten kunne ikke lagres. Prøv igjen.');
  return result.data;
}
export async function logAi(householdId: string, call: AiCall) {
  const { error } = await adminDb()
    .from('ai_calls')
    .insert({ ...call, household_id: householdId });
  if (error) throw new Error('Kunne ikke lagre KI-forbruket.');
}
