import { describe, it, expect } from 'vitest';
import { skills, type PartId } from '@/lib/engine/skills/graph';
import { initialState, type SkillState } from '@/lib/engine/mastery';
import {
  progressForPart,
  partUnlocked,
  canStartMasterTest,
  startMasterTest,
  finishMasterTest,
  completedMedallion,
} from '@/lib/engine/medallion';
import {
  startSession,
  sessionPhase,
  defaultSessionSettings,
  canAskSchoolTopic,
} from '@/lib/engine/session';
const now = '2026-10-10T09:00:00Z',
  nextDay = '2026-10-11T09:00:00Z';
const allMastered = () =>
  Object.fromEntries(
    skills.map((s) => [
      s.id,
      { ...initialState(3), masteredAt: now, attempts: 20 },
    ]),
  ) as Record<string, SkillState>;
describe('medallion', () => {
  it('enforces Basecamp → part 1 → parts 2/3, with part 4 independently available', () => {
    expect(partUnlocked(1, {})).toBe(false);
    expect(partUnlocked(4, {})).toBe(true);
    const states: Record<string, SkillState> = Object.fromEntries(
      skills
        .filter((s) => s.part === null)
        .map((s) => [s.id, { ...initialState(3), masteredAt: now }]),
    );
    expect(partUnlocked(1, states)).toBe(true);
    expect(partUnlocked(2, states)).toBe(false);
    expect(partUnlocked(3, states)).toBe(false);
    expect(progressForPart(1, states).status).toBe('tilgjengelig');
    states['div-deling-konkret'] = {
      ...initialState(),
      masteredAt: null,
      attempts: 1,
    };
    expect(progressForPart(1, states).status).toBe('pågår');
  });
  it('requires the next Oslo calendar day, including midnight boundaries', () => {
    const p = progressForPart(1, allMastered());
    expect(p.status).toBe('klar_for_mesterprøve');
    expect(canStartMasterTest(p, now)).toBe(false);
    expect(canStartMasterTest(p, nextDay)).toBe(true);
    expect(
      canStartMasterTest(
        { ...p, readySince: '2026-10-10T21:59:00Z' },
        '2026-10-10T22:00:00Z',
      ),
    ).toBe(true);
    expect(() =>
      startMasterTest(
        p,
        now,
        'test',
        Array.from({ length: 10 }, (_, i) => String(i)),
      ),
    ).toThrow();
  });
  it('covers every skill, demands 8–10 unique items, no hints and at least 80%', () => {
    const p = progressForPart(1, allMastered());
    const ids = Array.from({ length: 10 }, (_, i) => String(i)),
      t = startMasterTest(p, nextDay, 't', ids);
    expect(new Set(t.items.map((i) => i.skillId)).size).toBe(7);
    expect(t.items.every((i) => i.difficulty === 3)).toBe(true);
    const answers = t.items.map((i, n) => ({
      itemId: i.id,
      correct: n < 8,
      hintLevel: 0,
    }));
    const win = finishMasterTest(p, t, answers, nextDay);
    expect(win.score).toBe(0.8);
    expect(win.passed).toBe(true);
    expect(win.progress.awardedAt).toBe(nextDay);
    expect(() =>
      finishMasterTest(p, t, [...answers.slice(0, 9), answers[0]], nextDay),
    ).toThrow();
    expect(() =>
      finishMasterTest(
        p,
        t,
        answers.map((a) => ({ ...a, hintLevel: 1 })),
        nextDay,
      ),
    ).toThrow();
    expect(() => startMasterTest(p, nextDay, 't', ids.slice(0, 7))).toThrow();
  });
  it('targets failures, allows retry only next day and never removes earned parts', () => {
    const states = allMastered(),
      p = progressForPart(2, states),
      t = startMasterTest(
        p,
        nextDay,
        't',
        Array.from({ length: 10 }, (_, i) => String(i)),
      );
    const answers = t.items.map((i, n) => ({
      itemId: i.id,
      correct: n < 7,
      hintLevel: 0,
    }));
    const fail = finishMasterTest(p, t, answers, nextDay);
    expect(fail.passed).toBe(false);
    expect(fail.progress.targetedSkills.length).toBeGreaterThan(0);
    expect(canStartMasterTest(fail.progress, nextDay)).toBe(false);
    expect(canStartMasterTest(fail.progress, '2026-10-12T09:00:00Z')).toBe(
      true,
    );
    const awarded = {
      ...fail.progress,
      status: 'tildelt' as const,
      awardedAt: nextDay,
    };
    expect(progressForPart(2, {}, awarded).status).toBe('tildelt');
    expect(progressForPart(2, {}, awarded).awardedAt).toBe(nextDay);
    expect(
      completedMedallion(
        [1, 2, 3, 4].map((id) => ({ ...awarded, id: id as PartId })),
      ),
    ).toBe(true);
    expect(completedMedallion([awarded])).toBe(false);
  });
});
describe('session hard limits', () => {
  it('moves through ordered phases, ends mid-round on time and clips daily remaining time', () => {
    const c = startSession(defaultSessionSettings, now, 0);
    expect(
      ['09:00', '09:01', '09:04', '09:12', '09:14', '09:15'].map((time) =>
        sessionPhase(c, `2026-10-10T${time}:00Z`),
      ),
    ).toEqual([
      'innsjekk',
      'oppvarming',
      'hovedøkt',
      'blandet_utfordring',
      'avslutning',
      'ferdig',
    ]);
    expect(startSession(defaultSessionSettings, now, 28).plannedMinutes).toBe(
      2,
    );
    expect(() => startSession(defaultSessionSettings, now, 30)).toThrow(
      'dagens',
    );
    expect(() => sessionPhase(c, '2026-10-10T08:00:00Z')).toThrow();
  });
  it('enforces Oslo time windows and stops at closing time/midnight', () => {
    const settings = {
      ...defaultSessionSettings,
      allowedStartMinute: 600,
      allowedEndMinute: 720,
    };
    expect(() => startSession(settings, '2026-10-10T07:00:00Z', 0)).toThrow(
      'utenfor',
    );
    const c = startSession(settings, '2026-10-10T09:58:00Z', 0);
    expect(sessionPhase(c, '2026-10-10T10:00:00Z')).toBe('ferdig');
    const night = startSession(
      { ...settings, allowedStartMinute: 1380, allowedEndMinute: 60 },
      '2026-10-10T21:59:00Z',
      0,
    );
    expect(sessionPhase(night, '2026-10-10T22:00:00Z')).toBe('ferdig');
  });
  it('asks about school at most once a week and never on the first session', () => {
    expect(canAskSchoolTopic(now, null, true)).toBe(false);
    expect(canAskSchoolTopic(now, null, false)).toBe(true);
    expect(canAskSchoolTopic(now, '2026-10-04T09:00:00Z', false)).toBe(false);
    expect(canAskSchoolTopic(now, '2026-10-03T09:00:00Z', false)).toBe(true);
  });
});

it('rejects wrong part, incomplete manifests, replay and invalid completion times', () => {
  const p = progressForPart(1, allMastered()),
    ids = Array.from({ length: 8 }, (_, i) => String(i)),
    t = startMasterTest(p, nextDay, 't', ids),
    answers = t.items.map((i) => ({
      itemId: i.id,
      correct: true,
      hintLevel: 0,
    }));
  expect(() => progressForPart(2, {}, p)).toThrow('Feil');
  expect(() => progressForPart(1, {}, null, [])).toThrow('mangler');
  expect(() => startMasterTest(p, nextDay, 't', Array(8).fill('same'))).toThrow(
    'unike',
  );
  expect(() => finishMasterTest(p, t, answers, now)).toThrow('Ugyldig');
  expect(() => finishMasterTest(p, t, answers, '2026-10-12T09:00:00Z')).toThrow(
    'Ugyldig',
  );
  const win = finishMasterTest(p, t, answers, nextDay);
  expect(() => finishMasterTest(win.progress, t, answers, nextDay)).toThrow(
    'Ugyldig',
  );
});
