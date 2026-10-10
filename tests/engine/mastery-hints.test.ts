import { describe, it, expect } from 'vitest';
import {
  initialState,
  probability,
  credit,
  learningRate,
  recordAttempt,
  proposeMastery,
  diagnosticState,
  masteryRemaining,
  type SkillState,
} from '@/lib/engine/mastery';
import { newHints, advanceHint, allowedHint } from '@/lib/engine/hints';
import { dayKey } from '@/lib/engine/time';
const day1 = '2026-10-10T09:00:00Z',
  day2 = '2026-10-11T09:00:00Z';
function attempts(state: SkillState, count = 5, at = day1, hint = 0) {
  for (let i = 0; i < count; i++)
    state = recordAttempt(state, {
      id: `${at}-${i}-${state.attempts}`,
      at,
      difficulty: 3,
      correct: true,
      hintLevel: hint,
    });
  return state;
}
describe('logistic mastery and evidence', () => {
  it('implements expected probability, decreasing K and all five credits', () => {
    expect(probability(0, 3)).toBe(0.5);
    expect(probability(0, 1)).toBeCloseTo(0.880797);
    expect(probability(0, 5)).toBeCloseTo(0.119203);
    expect(learningRate(0)).toBe(0.6);
    expect(learningRate(4)).toBe(0.6);
    expect(learningRate(25)).toBeLessThan(0.6);
    expect(learningRate(1000)).toBeCloseTo(0.2);
    expect([0, 1, 2, 3, 4].map((h) => credit(true, h))).toEqual([
      1, 0.7, 0.4, 0.1, 0,
    ]);
    expect(credit(false, 0)).toBe(0);
    expect(() => credit(true, 5)).toThrow();
  });
  it('cannot award mastery on a single good day even with a model claim', () => {
    const state = attempts(initialState(3), 10);
    const result = proposeMastery(
      state,
      'Forklaringen viser en tydelig strategi.',
      day1,
    );
    expect(result.approved).toBe(false);
    expect(result.remaining.join(' ')).toContain('to ulike dager');
    expect(state.claim).toBe(null);
  });
  it('requires assessment as well as all data criteria', () => {
    let state = attempts(initialState(3));
    state = attempts(state, 1, day2);
    expect(state.masteredAt).toBe(null);
    expect(masteryRemaining(state)).toHaveLength(1);
    expect(
      proposeMastery(state, 'Fordeler likt og kontrollerer med ganging.', day2)
        .approved,
    ).toBe(true);
    expect(() => proposeMastery(state, 'ja', day2)).toThrow();
  });
  it('accepts unaided understanding=2; hinted and wrong explanations do not count', () => {
    let state = attempts(initialState(3));
    state = recordAttempt(state, {
      id: 'explain',
      at: day2,
      difficulty: 3,
      correct: true,
      hintLevel: 0,
      understanding: 2,
    });
    expect(state.masteredAt).toBe(day2);
    const wrong = recordAttempt(initialState(), {
      id: 'no',
      at: day1,
      difficulty: 3,
      correct: false,
      hintLevel: 0,
      understanding: 2,
    });
    expect(wrong.explained).toBe(false);
    const hinted = recordAttempt(initialState(), {
      id: 'hinted',
      at: day1,
      difficulty: 3,
      correct: true,
      hintLevel: 1,
      understanding: 2,
    });
    expect(hinted.explained).toBe(false);
  });
  it('rejects low theta, fewer than five events, insufficient recent correctness and hints-only days', () => {
    for (const state of [
      attempts(initialState(-3), 5),
      attempts(initialState(3), 4),
      attempts(initialState(3), 5, day1, 1),
    ])
      expect(
        proposeMastery(state, 'Dette er en begrunnet vurdering.', day2)
          .approved,
      ).toBe(false);
    let state = attempts(initialState(3));
    for (let i = 0; i < 3; i++)
      state = recordAttempt(state, {
        id: `wrong${i}`,
        at: day2,
        difficulty: 3,
        correct: false,
        hintLevel: 0,
      });
    expect(
      proposeMastery(state, 'Dette er en begrunnet vurdering.', day2).approved,
    ).toBe(false);
  });
  it('is idempotent, rejects reversed time and does not mutate inputs', () => {
    const initial = initialState(),
      e = { id: 'a', at: day2, difficulty: 3, correct: true, hintLevel: 0 };
    const updated = recordAttempt(initial, e);
    expect(recordAttempt(updated, e)).toBe(updated);
    expect(initial.attempts).toBe(0);
    expect(() =>
      proposeMastery(updated, 'En godt begrunnet vurdering.', day1),
    ).toThrow('før siste');
    expect(updated.theta).toBeCloseTo(0.3);
    expect(() => recordAttempt(updated, { ...e, id: 'b', at: day1 })).toThrow(
      'tidsrekkefølge',
    );
  });
  it('uses Oslo calendar days including DST and never grants diagnostic mastery', () => {
    expect(dayKey('2026-10-10T21:59:00Z')).toBe('2026-10-10');
    expect(dayKey('2026-10-10T22:00:00Z')).toBe('2026-10-11');
    expect(dayKey('2026-10-25T23:00:00Z')).toBe('2026-10-26');
    expect(diagnosticState(9).theta).toBe(3);
    expect(diagnosticState(3).masteredAt).toBe(null);
  });
});
describe('server-controlled hints', () => {
  it('keeps first wrong attempt at open question, increases only on fresh wrong attempts or requests, caps at four', () => {
    let s = newHints();
    s = advanceHint(s, { id: 'a', type: 'wrong' });
    expect(s.level).toBe(0);
    expect(advanceHint(s, { id: 'a', type: 'wrong' })).toBe(s);
    s = advanceHint(s, { id: 'b', type: 'wrong' });
    expect(s.level).toBe(1);
    s = advanceHint(s, { id: 'c', type: 'correct' });
    expect(s.level).toBe(1);
    for (let i = 0; i < 8; i++)
      s = advanceHint(s, { id: `hint${i}`, type: 'request' });
    expect(s.level).toBe(4);
    expect(allowedHint(s, 5)).toBe(false);
    expect(allowedHint(s, -1)).toBe(false);
    expect(allowedHint(s, 4)).toBe(true);
    expect(newHints().level).toBe(0);
  });
});
