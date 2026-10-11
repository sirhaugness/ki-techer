import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  createSession,
  learningTurn,
  publicView,
} from '../../lib/learning/session';
import { initialState, confirmExplanation } from '../../lib/engine/mastery';
import { skills } from '../../lib/engine/skills/graph';
import { progressForPart } from '../../lib/engine/medallion';
import type {
  LearnerProfile,
  Snapshot,
  LearningEvent,
} from '../../lib/learning/types';
const now = '2026-10-11T10:00:00.000Z';
export const profile: LearnerProfile = {
  id: '00000000-0000-4000-8000-000000000011',
  householdId: '00000000-0000-4000-8000-000000000001',
  firstName: 'Leo',
  tutorName: 'Lumi',
  grade: 4,
  avatar: 'spire',
  settings: {},
};
export const turn = (
  state: Snapshot,
  event: LearningEvent,
  id = randomUUID(),
  at = now,
) => learningTurn(state, event, id, at, profile, [], null, 'Bokmål.');
describe('persistent learning session', () => {
  it('finishes adaptive diagnostics without awarding mastery or extra days', async () => {
    let state = createSession(profile, null, now, 0, 'diagnostic', null);
    for (let i = 0; i < 10; i++) {
      state = (await turn(state, { type: 'next' })).state;
      state = (
        await turn(state, {
          type: 'answer',
          itemId: state.active!.id,
          answer: state.active!.item.answer,
          inputMode: 'tastatur',
        })
      ).state;
    }
    state = (await turn(state, { type: 'next' })).state;
    expect(state.diagnosticComplete).toBe(true);
    expect(state.endedAt).not.toBeNull();
    expect(
      Object.values(state.states).every(
        (s) =>
          s.masteredAt === null &&
          s.attempts === 0 &&
          s.correctDays.length === 0,
      ),
    ).toBe(true);
    expect(state.parts.every((p) => !p.awardedAt)).toBe(true);
  });
  it('does not publish answers and records hints, retries, checked answers and replay idempotently', async () => {
    let state = createSession(profile, null, now, 0, 'practice', null);
    state = (await turn(state, { type: 'next' })).state;
    const publicTask = publicView(state).task!;
    expect(publicTask).not.toHaveProperty('answer');
    expect(publicTask).not.toHaveProperty('expression');
    expect(publicTask).not.toHaveProperty('params');
    state = (await turn(state, { type: 'hint' })).state;
    expect(state.hints.level).toBe(1);
    const id = randomUUID(),
      answerEvent: LearningEvent = {
        type: 'answer',
        itemId: state.active!.id,
        answer: state.active!.item.answer,
        inputMode: 'manipulativ',
      };
    const answered = await turn(state, answerEvent, id);
    expect(answered.state.correct).toBe(true);
    expect(answered.events.attempts[0].credit).toBe(0.7);
    const replay = await turn(answered.state, answerEvent, id);
    expect(replay.replayed).toBe(true);
    expect(replay.events.attempts).toEqual([]);
    expect(replay.state.revision).toBe(answered.state.revision);
    await expect(turn(answered.state, answerEvent)).rejects.toThrow(
      'ikke aktiv',
    );
  });
  it('does not grant evidence after deadline and enforces daily max', async () => {
    const state = createSession(profile, null, now, 0, 'practice', null);
    const result = await turn(
      state,
      { type: 'next' },
      randomUUID(),
      '2026-10-11T10:16:00.000Z',
    );
    expect(result.state.endedAt).not.toBeNull();
    expect(result.events.attempts).toEqual([]);
    expect(() =>
      createSession(profile, null, now, 30, 'practice', null),
    ).toThrow('dagens øving');
  });
  it('requires another day, denies master hints, covers all skills and awards only after ten checked answers', async () => {
    const previous = createSession(
      profile,
      null,
      '2026-10-10T10:00:00.000Z',
      0,
      'practice',
      4,
    );
    previous.endedAt = '2026-10-10T10:05:00.000Z';
    for (const skill of skills.filter((s) => s.part === 4))
      previous.states[skill.id] = {
        ...initialState(3),
        masteredAt: '2026-10-10T10:00:00.000Z',
      };
    previous.parts = ([1, 2, 3, 4] as const).map((id) =>
      progressForPart(id, previous.states),
    );
    expect(() =>
      createSession(
        profile,
        previous,
        '2026-10-10T11:00:00.000Z',
        0,
        'master',
        4,
      ),
    ).toThrow('neste dag');
    let state = createSession(profile, previous, now, 0, 'master', 4);
    state = (await turn(state, { type: 'next' })).state;
    await expect(turn(state, { type: 'hint' })).rejects.toThrow('uten hint');
    for (let i = 0; i < 10; i++) {
      if (i) state = (await turn(state, { type: 'next' })).state;
      const result = await turn(state, {
        type: 'answer',
        itemId: state.active!.id,
        answer: state.active!.item.answer,
        inputMode: 'tastatur',
      });
      state = result.state;
      if (i < 9) expect(publicView(state).correct).toBeNull();
    }
    expect(state.parts.find((p) => p.id === 4)?.status).toBe('tildelt');
    expect(state.celebration).toContain('del 4');
    expect(state.endedAt).not.toBeNull();
    expect(new Set(state.masterTest!.items.map((i) => i.skillId)).size).toBe(7);
  });
  it('attaches understanding without double-counting or bypassing answer requirements', () => {
    const state = {
      ...initialState(3),
      attempts: 5,
      correctDays: ['2026-10-10', '2026-10-11'],
      recent: Array.from({ length: 5 }, (_, i) => ({
        id: `a${i}`,
        at: now,
        difficulty: 3,
        correct: true,
        hintLevel: 0,
      })),
    };
    expect(confirmExplanation(state, 'missing', 2, now).masteredAt).toBeNull();
    const confirmed = confirmExplanation(state, 'a4', 2, now);
    expect(confirmed.masteredAt).toBe(now);
    expect(confirmed.attempts).toBe(5);
    expect(
      confirmExplanation(
        { ...state, recent: [{ ...state.recent[0], hintLevel: 1 }] },
        'a0',
        2,
        now,
      ).masteredAt,
    ).toBeNull();
  });
});
