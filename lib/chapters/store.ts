import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminDb } from '../db/server';
import type { ChapterDatabase, ChapterJob } from './production-contracts';
import { asJson } from '../learning/repository';
export class CheckpointUnavailable extends Error {}
export const chapterDb = () =>
  adminDb() as unknown as SupabaseClient<ChapterDatabase>;
export async function jobById(id: string): Promise<ChapterJob> {
  const result = await chapterDb()
    .from('chapter_jobs')
    .select('*')
    .eq('id', id)
    .single();
  if (result.error || !result.data)
    throw new Error('Fant ikke kapittelforberedelsen.');
  return result.data;
}
export async function activeJob(learnerId: string) {
  const r = await chapterDb()
    .from('chapter_jobs')
    .select('*')
    .eq('learner_id', learnerId)
    .eq('play_done', false)
    .neq('state', 'cancelled')
    .neq('data->>mode', 'probe')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (r.error) throw new Error('Kunne ikke hente kapittelet.');
  return r.data;
}
export async function checkpoint(
  job: ChapterJob,
  owner: string,
  next: string,
  data: unknown,
) {
  const r = await chapterDb().rpc('checkpoint_chapter', {
    target_job: job.id,
    claim_owner: owner,
    expected_phase: job.phase,
    next_phase: next,
    phase_data: asJson(data),
  });
  if (r.error)
    throw new CheckpointUnavailable('Checkpoint response unavailable');
  if (r.data !== true)
    throw new Error('Kapittelet ble endret eller forberedelsen er stoppet.');
}
export async function failJob(
  id: string,
  owner: string,
  state: 'failed' | 'budget' | 'unknown' | 'cancelled',
  code: string,
) {
  const r = await chapterDb().rpc('fail_chapter', {
    target_job: id,
    claim_owner: owner,
    failure_state: state,
    failure_code: code,
  });
  if (r.error) throw new Error('Kunne ikke lagre forberedelsesfeilen.');
}
