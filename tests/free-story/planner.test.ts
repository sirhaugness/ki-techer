import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { planMath } from '../../lib/free-story/planner';
import { zpdDifficulty } from '../../lib/engine/candidates';
import { initialState, type SkillState } from '../../lib/engine/mastery';
import { partUnlocked } from '../../lib/engine/medallion';
import { skills } from '../../lib/engine/skills/graph';
import type { Snapshot } from '../../lib/learning/types';

const now = '2026-10-20T10:00:00Z';
const past = '2026-10-19T10:00:00Z';
const future = '2026-10-25T10:00:00Z';

// Only planning inputs are supplied: planning must not need an active clock,
// provider, imagined answers or session-side effects.
function snapshot(states: Record<string, SkillState> = {}): Snapshot {
  return {
    states,
    cards: {},
    selectedPart: null,
    focusSkillId: null,
  } as Snapshot;
}
function mastered(theta = 2): SkillState {
  return { ...initialState(theta), masteredAt: past, nextReviewAt: future };
}
function allMastered() {
  return Object.fromEntries(skills.map((s) => [s.id, mastered()]));
}
function freeze(value: object) {
  Object.freeze(value);
  for (const child of Object.values(value))
    if (child && typeof child === 'object' && !Object.isFrozen(child))
      freeze(child);
}

describe('pure free-story maths planning', () => {
  it.each([20, 21, 22, 23, 24, 25])(
    'makes exactly %i complete, distinct slots',
    (count) => {
      const slots = planMath(null, now, 42, count);
      expect(slots).toHaveLength(count);
      expect(slots.map((s) => s.index)).toEqual(
        Array.from({ length: count }, (_, i) => i),
      );
      expect(new Set(slots.map((s) => s.id)).size).toBe(count);
      expect(slots.every((s) => z.uuid().safeParse(s.id).success)).toBe(true);
      expect(
        slots.every((s) => s.item.question && s.item.answer !== undefined),
      ).toBe(true);
    },
  );

  it('is deterministic, has a stable prefix and keeps seed/index identities independent of time', () => {
    const first = planMath(null, now, 42);
    expect(planMath(null, now, 42)).toEqual(first);
    expect(planMath(null, now, 42, 25).slice(0, 20)).toEqual(first);
    expect(planMath(null, future, 42).map((s) => s.id)).toEqual(
      first.map((s) => s.id),
    );
    for (const seed of [43, -1, 2 ** 40, Number.MAX_SAFE_INTEGER])
      expect(planMath(null, now, seed)[0].id).not.toBe(first[0].id);
    expect(planMath(null, now, 43).map((s) => s.item)).not.toEqual(
      first.map((s) => s.item),
    );
  });

  it('rejects invalid counts, timestamps and seeds before planning', () => {
    for (const count of [19, 26, 20.5, NaN])
      expect(() => planMath(null, now, 1, count)).toThrow();
    for (const seed of [NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(() => planMath(null, now, seed)).toThrow();
    expect(() => planMath(null, 'not a timestamp', 1)).toThrow();
  });

  it('keeps actual prerequisites and medal-part gates, including the open geometry part', () => {
    const state = snapshot({ 'mult-telling-grupper': mastered() });
    const locked = planMath(state, now, 5);
    expect(locked.some((s) => s.item.skillId.startsWith('div-'))).toBe(false);
    expect(locked.some((s) => s.item.skillId.startsWith('figur-'))).toBe(true);
    for (const slot of locked) {
      const skill = skills.find((s) => s.id === slot.item.skillId)!;
      expect(
        skill.prerequisites.every((id) => !!state.states[id]?.masteredAt),
      ).toBe(true);
      expect(
        skill.part === null || partUnlocked(skill.part, state.states),
      ).toBe(true);
    }
    for (const s of skills.filter((s) => s.part === null))
      state.states[s.id] = mastered();
    state.focusSkillId = 'div-deling-konkret';
    const unlocked = planMath(state, now, 5);
    expect(unlocked[0].item.skillId).toBe('div-deling-konkret');
    expect(unlocked[0].reason).toBe('learning');
  });

  it('uses the real per-skill theta to choose generator difficulty', () => {
    const state = snapshot({
      'mult-telling-grupper': initialState(-3),
      'dobling-halvering': initialState(1),
      likhetstegn: initialState(3),
    });
    const slots = planMath(state, now, 12, 25);
    for (const s of slots)
      expect(s.item.difficulty).toBe(
        zpdDifficulty(state.states[s.item.skillId]?.theta ?? 0),
      );
    expect(
      slots
        .filter((s) => s.item.skillId === 'mult-telling-grupper')
        .every((s) => s.item.difficulty === 1),
    ).toBe(true);
    expect(
      slots.some(
        (s) => s.item.skillId === 'likhetstegn' && s.item.difficulty === 5,
      ),
    ).toBe(true);
  });

  it('prioritizes the oldest due reviews once each before repeating, without hiding learning slots', () => {
    const state = snapshot({
      'mult-telling-grupper': {
        ...mastered(),
        nextReviewAt: '2026-10-18T10:00:00Z',
      },
      likhetstegn: { ...mastered(), nextReviewAt: past },
    });
    const slots = planMath(state, now, 3);
    expect(slots.slice(0, 2).map((s) => [s.item.skillId, s.reason])).toEqual([
      ['mult-telling-grupper', 'repetition'],
      ['likhetstegn', 'repetition'],
    ]);
    expect(slots.slice(2).some((s) => s.reason === 'learning')).toBe(true);
  });

  it('reads FSRS due dates with the legacy nextReviewAt fallback', () => {
    const state = snapshot({ likhetstegn: mastered() });
    state.cards['likhetstegn'] = { due: past } as Snapshot['cards'][string];
    expect(planMath(state, now, 4)[0]).toMatchObject({
      reason: 'repetition',
      item: { skillId: 'likhetstegn' },
    });
    state.states['likhetstegn'].nextReviewAt = past;
    state.cards['likhetstegn'].due = future;
    expect(planMath(state, now, 4).some((s) => s.reason === 'repetition')).toBe(
      false,
    );
  });

  it.each([20, 25])(
    'keeps at least 30%% outside the focus for %i slots',
    (count) => {
      const state = snapshot();
      state.focusSkillId = 'mult-telling-grupper';
      const slots = planMath(state, now, 22, count);
      expect(
        slots.filter((s) => s.item.skillId !== state.focusSkillId).length,
      ).toBeGreaterThanOrEqual(Math.ceil(count * 0.3));
      expect(
        slots.filter((s) => s.item.skillId === state.focusSkillId).length,
      ).toBeGreaterThan(0);
    },
  );

  it('keeps maintenance available when everything is mastered and nothing is due', () => {
    const slots = planMath(snapshot(allMastered()), now, 8, 25);
    expect(slots.every((s) => s.reason === 'maintenance')).toBe(true);
    expect(new Set(slots.map((s) => s.item.skillId)).size).toBeGreaterThan(10);
  });

  it('can select every eligible generator, including native choice, remainder and coordinate answers', () => {
    const answerTypes = new Set<string>();
    for (const target of skills) {
      const states = allMastered();
      states[target.id].nextReviewAt = past;
      const first = planMath(snapshot(states), now, target.order)[0];
      expect(first.item.skillId).toBe(target.id);
      expect(first.reason).toBe('repetition');
      answerTypes.add(first.item.answerType);
    }
    expect(answerTypes).toEqual(
      new Set(['number', 'choice', 'remainder', 'coordinate']),
    );
  });

  it('does not mutate or manufacture snapshot evidence, even with frozen inputs', () => {
    const state = snapshot({
      likhetstegn: { ...mastered(), nextReviewAt: past },
    });
    state.history = [
      {
        skillId: 'likhetstegn',
        correct: false,
        difficulty: 2,
        representation: 'tall',
        phase: 'hovedøkt',
      },
    ];
    state.cards['likhetstegn'] = { due: past } as Snapshot['cards'][string];
    const before = structuredClone(state);
    freeze(state);
    const plan = planMath(state, now, 17, 25);
    expect(state).toEqual(before);
    plan[0].item.params.notSavedEvidence = 100;
    expect(state).toEqual(before);
    expect(state.states['likhetstegn'].attempts).toBe(0);
    expect(state.history).toHaveLength(1);
  });
});
