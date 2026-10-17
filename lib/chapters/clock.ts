import 'server-only';
import { adminDb } from '../db/server';
import { chapterDb } from './store';
import { dayKey } from '../engine/time';
import {
  startSession,
  defaultSessionSettings,
  sessionSettingsSchema,
  mayContinue,
  type SessionClock,
} from '../engine/session';
import type { LearnerProfile } from '../learning/types';
import type { ChapterJob } from './production-contracts';
export function chapterSettings(profile: LearnerProfile) {
  return sessionSettingsSchema.parse({
    ...defaultSessionSettings,
    plannedMinutes: profile.settings.session_minutes ?? 15,
    dailyMaxMinutes: profile.settings.daily_max_minutes ?? 30,
    allowedStartMinute: profile.settings.allowed_start_minute ?? 0,
    allowedEndMinute: profile.settings.allowed_end_minute ?? 1440,
  });
}
export async function chapterMinutesUsed(learnerId: string, now: string) {
  const r = await chapterDb()
    .from('chapter_play_times')
    .select('*')
    .eq('learner_id', learnerId)
    .gte('started_at', new Date(Date.parse(now) - 86400000).toISOString());
  if (r.error) throw Error('Kunne ikke kontrollere læringstiden.');
  return r.data
    .filter((t) => dayKey(t.started_at) === dayKey(now))
    .reduce(
      (sum, t) =>
        sum +
        Math.max(
          0,
          Math.min(
            t.planned_minutes,
            (Date.parse(t.ended_at ?? now) - Date.parse(t.started_at)) / 60000,
          ),
        ),
      0,
    );
}
export async function chapterClock(learnerId: string) {
  const r = await chapterDb()
    .from('chapter_play_times')
    .select('*')
    .eq('learner_id', learnerId)
    .is('ended_at', null)
    .maybeSingle();
  if (r.error) throw Error('Kunne ikke hente læringstiden.');
  return r.data;
}
export async function pauseChapter(learnerId: string) {
  const r = await chapterDb()
    .from('chapter_play_times')
    .update({ ended_at: new Date().toISOString() })
    .eq('learner_id', learnerId)
    .is('ended_at', null);
  if (r.error) throw Error('Kunne ikke lagre pausen.');
}
export async function mayPlayChapter(
  profile: LearnerProfile,
  job: ChapterJob,
  now: string,
) {
  const clock = await chapterClock(profile.id);
  if (!clock || clock.job_id !== job.id) return false;
  const settings = chapterSettings(profile);
  const c: SessionClock = {
    startedAt: clock.started_at,
    plannedMinutes: clock.planned_minutes,
    dailyUsedMinutesAtStart: 0,
    settings,
  };
  return mayContinue(c, now);
}
export async function startChapterPlay(
  profile: LearnerProfile,
  job: ChapterJob,
  now: string,
) {
  const active = await chapterClock(profile.id);
  if (active) {
    if (await mayPlayChapter(profile, job, now)) return;
    await pauseChapter(profile.id);
  }
  const sessions = await adminDb()
    .from('sessions')
    .select('started_at,ended_at,planned_minutes')
    .eq('learner_id', profile.id)
    .gte('started_at', new Date(Date.parse(now) - 86400000).toISOString());
  if (sessions.error) throw Error('Kunne ikke kontrollere dagens læringstid.');
  if (sessions.data.some((s) => !s.ended_at))
    throw Error('Avslutt den vanlige matteøkten før du starter kapittelet.');
  const used =
    sessions.data
      .filter((s) => dayKey(s.started_at) === dayKey(now))
      .reduce(
        (sum, s) =>
          sum +
          Math.max(
            0,
            Math.min(
              s.planned_minutes,
              (Date.parse(s.ended_at ?? now) - Date.parse(s.started_at)) /
                60000,
            ),
          ),
        0,
      ) + (await chapterMinutesUsed(profile.id, now));
  const clock = startSession(chapterSettings(profile), now, used);
  const r = await chapterDb().from('chapter_play_times').insert({
    job_id: job.id,
    learner_id: profile.id,
    household_id: profile.householdId,
    started_at: now,
    planned_minutes: clock.plannedMinutes,
  });
  if (r.error) throw Error('En økt er allerede startet. Last siden på nytt.');
}
