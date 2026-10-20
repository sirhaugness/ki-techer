import 'server-only';
import { randomInt } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminDb } from '../db/server';
import { asJson } from '../learning/repository';
import type {
  LearnerProfile,
  Snapshot,
  LearningEvents,
} from '../learning/types';
import { planMath } from './planner';
import { reserveHeader, reserveMission } from './generation';
import type { FreeChapter, StorySession } from './types';

// New migrations are intentionally not coupled to the generated legacy types.
export const chapterDb = () => adminDb(5000) as unknown as SupabaseClient;
export async function latestStorySession(
  learnerId: string,
  chapterId?: string,
): Promise<StorySession | null> {
  let query = chapterDb()
    .from('sessions')
    .select('engine_state')
    .eq('learner_id', learnerId)
    .not('engine_state->freeChapter', 'is', null);
  if (chapterId) query = query.eq('engine_state->freeChapter->>id', chapterId);
  const { data, error } = await query
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Error('Kunne ikke hente den lagrede fortsettelsen.');
  return (data?.engine_state as StorySession) ?? null;
}
export async function loadChapter(
  id: string,
  learnerId?: string,
): Promise<FreeChapter | null> {
  let query = chapterDb().from('free_story_chapters').select('*').eq('id', id);
  if (learnerId) query = query.eq('learner_id', learnerId);
  const { data, error } = await query.maybeSingle();
  if (error) throw Error('Kunne ikke hente kapitlet.');
  return data as FreeChapter | null;
}
export async function currentChapter(
  learnerId: string,
  state: Snapshot | null,
) {
  if (state?.freeChapter) return loadChapter(state.freeChapter.id, learnerId);
  const saved = await latestStorySession(learnerId);
  if (saved) return loadChapter(saved.freeChapter.id, learnerId);
  const { data, error } = await chapterDb()
    .from('free_story_chapters')
    .select('*')
    .eq('learner_id', learnerId)
    .is('previous_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Error('Kunne ikke hente kapitlet.');
  return data as FreeChapter | null;
}
export async function nextChapter(chapter: FreeChapter) {
  const { data, error } = await chapterDb()
    .from('free_story_chapters')
    .select('*')
    .eq('learner_id', chapter.learner_id)
    .eq('previous_id', chapter.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw Error('Kunne ikke hente fortsettelsen.');
  return data as FreeChapter | null;
}
export async function prepareChapter(
  profile: LearnerProfile,
  state: Snapshot | null,
  interests: string[],
  parent: FreeChapter | null,
) {
  const now = new Date().toISOString();
  const { data, error } = await chapterDb().rpc('begin_free_story', {
    target_learner: profile.id,
    target_household: profile.householdId,
    parent_chapter: parent?.id ?? null,
    interest_identity: JSON.stringify(
      interests
        .map((s) => s.normalize('NFKC').toLocaleLowerCase('nb-NO'))
        .sort(),
    ),
    chapter_interests: interests,
    chapter_context: {
      previousSummary: parent?.completed ? (parent.header?.summary ?? '') : '',
      ...(!parent?.completed && parent?.header
        ? { currentPreview: parent.header.summary }
        : {}),
    },
    math_slots: asJson(planMath(state, now, randomInt(0, 2 ** 32))),
  });
  if (error || !data) throw Error('Kunne ikke klargjøre kapitlet.');
  const chapter = await loadChapter(data, profile.id);
  if (!chapter) throw Error('Kapitlet finnes ikke.');
  return chapter;
}
export async function publishChapter(
  chapter: FreeChapter,
  header: NonNullable<FreeChapter['header']>,
  missions: FreeChapter['missions'],
  done: boolean,
  expired = false,
) {
  const { data, error } = await chapterDb().rpc('publish_free_story', {
    target: chapter.id,
    claim_owner: chapter.owner,
    chapter_header: header,
    chapter_missions: missions,
    finished: done,
    expired,
  });
  if (error || !data) throw Error('Kapitlet kunne ikke lagres.');
}
/** A read after the absolute deadline completes an abandoned job without any AI.
 * The database fences the owner and immutable prefix against racing workers. */
export async function finishReserve(chapter: FreeChapter, onlyExpired = true) {
  if (
    chapter.status === 'done' ||
    (onlyExpired && Date.now() < Date.parse(chapter.deadline))
  )
    return chapter;
  const header = chapter.header ?? reserveHeader(chapter.interests),
    missions = [...chapter.missions];
  for (const slot of chapter.slots.slice(missions.length))
    missions.push(
      reserveMission(slot, missions.at(-1)?.place ?? header.setting),
    );
  try {
    await publishChapter(
      chapter,
      header,
      missions,
      true,
      Date.now() >= Date.parse(chapter.deadline),
    );
  } catch {
    /* Another publisher or privacy deletion may have won; reread once. */
  }
  return (await loadChapter(chapter.id, chapter.learner_id)) ?? chapter;
}
export async function commitStory(
  state: Snapshot,
  learnerId: string,
  expectedRevision: number,
  events: LearningEvents,
) {
  const { data, error } = await chapterDb().rpc('commit_free_story_turn', {
    target_session: state.id,
    target_learner: learnerId,
    expected_revision: expectedRevision,
    next_state: asJson(state),
    events: asJson(events),
  });
  if (error) throw Error('Handlingen kunne ikke lagres.');
  if (!data)
    throw Error('Økten er oppdatert et annet sted. Last siden på nytt.');
}
export async function insertStory(
  state: Snapshot,
  learnerId: string,
  events: LearningEvents,
) {
  const { data, error } = await chapterDb().rpc('start_free_story_session', {
    target_learner: learnerId,
    next_state: asJson(state),
    events: asJson(events),
  });
  if (error || !data)
    throw Error('Økten kunne ikke startes. Last siden på nytt.');
}
export async function usedMinutes(learnerId: string, now: string) {
  const { dayKey } = await import('../engine/time');
  const { data, error } = await chapterDb()
    .from('sessions')
    .select('started_at,ended_at,planned_minutes')
    .eq('learner_id', learnerId)
    .gte('started_at', new Date(Date.parse(now) - 2 * 86400000).toISOString());
  if (error) throw Error('Kunne ikke kontrollere dagens øvingstid.');
  return (data ?? [])
    .filter((s) => dayKey(s.started_at) === dayKey(now))
    .reduce(
      (sum, s) =>
        sum +
        Math.min(
          s.planned_minutes,
          Math.max(
            0,
            (Date.parse(s.ended_at ?? now) - Date.parse(s.started_at)) / 60000,
          ),
        ),
      0,
    );
}
