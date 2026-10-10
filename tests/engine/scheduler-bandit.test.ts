import { describe, it, expect } from 'vitest';
import { Rating } from 'ts-fsrs';
import {
  scheduleReview,
  serializeCard,
  reviewRating,
  dueReviews,
} from '@/lib/engine/scheduler';
import {
  newBandit,
  chooseArm,
  updateArm,
  forget,
  reward,
  recommendStrategies,
  sampleBeta,
} from '@/lib/engine/bandit';
import { seededRng } from '@/lib/engine/random';
describe('FSRS', () => {
  it('maps outcomes, with hint precedence over speed', () => {
    expect(reviewRating(false, 0, 1000, 5000)).toBe(Rating.Again);
    expect(reviewRating(true, 1, 1000, 5000)).toBe(Rating.Hard);
    expect(reviewRating(true, 0, 5000, 5000)).toBe(Rating.Good);
    expect(reviewRating(true, 0, 1000, 5000)).toBe(Rating.Easy);
    expect(reviewRating(true, 0, 1000, null)).toBe(Rating.Good);
  });
  it('is deterministic, round-trips JSON and prioritizes expired cards', () => {
    const now = '2026-10-10T09:00:00Z',
      result = { correct: true, hintLevel: 0, timeMs: 3000, medianMs: 4000 };
    const first = scheduleReview(null, now, result);
    expect(first.due.getTime()).toBeGreaterThan(Date.parse(now));
    const json = JSON.parse(JSON.stringify(serializeCard(first)));
    expect(scheduleReview(json, first.due.toISOString(), result)).toEqual(
      scheduleReview(first, first.due.toISOString(), result),
    );
    expect(
      dueReviews(
        { future: json, old: { ...json, due: '2026-10-01T09:00:00Z' } },
        now,
      ),
    ).toEqual(['old']);
    expect(first.reps).toBe(1);
  });
});
describe('strategy learning', () => {
  it('converges to the best synthetic arm and keeps exploration', () => {
    const rng = seededRng(908);
    let arms = newBandit().representasjon;
    let best = 0,
      other = 0;
    for (let i = 0; i < 4000; i++) {
      const chosen = chooseArm(arms, rng);
      arms = updateArm(arms, chosen, chosen === 'konkret' ? 0.95 : 0.15);
      if (i >= 3000) {
        if (chosen === 'konkret') best++;
        else other++;
      }
    }
    expect(best / 1000).toBeGreaterThan(0.85);
    expect(other / 1000).toBeGreaterThan(0.04);
    expect(arms.find((a) => a.name === 'konkret')!.pulls).toBeGreaterThan(
      arms.find((a) => a.name === 'tall')!.pulls,
    );
  });
  it('weights learning first, forgets toward the prior, and mandates concrete → picture → abstract', () => {
    expect(
      reward({ nextCredit: 1, laterReview: 1, engagement: 0, selfReport: 0 }),
    ).toBe(0.5);
    expect(() =>
      reward({ nextCredit: 2, laterReview: 1, engagement: 0, selfReport: 0 }),
    ).toThrow();
    const state = newBandit();
    state.kontekst = updateArm(state.kontekst, 'ren_oppgave', 1);
    expect(forget(state).kontekst[1].alpha).toBeCloseTo(1.97);
    for (const [i, rep] of ['konkret', 'bilde', 'tall'].entries())
      expect(recommendStrategies(state, seededRng(i), i).representasjon).toBe(
        rep,
      );
    expect(() => sampleBeta(0, 1, seededRng(1))).toThrow();
    expect(() => chooseArm([], seededRng(1))).toThrow();
  });
});

it('samples non-integer priors and rejects a degenerate random source', () => {
  const rng = seededRng(12);
  const values = Array.from({ length: 5000 }, () => sampleBeta(0.5, 1.5, rng));
  expect(values.reduce((s, v) => s + v, 0) / values.length).toBeCloseTo(
    0.25,
    1,
  );
  let draw = 0;
  expect(() =>
    sampleBeta(1, 1, () => (++draw % 2 ? Math.exp(-4.5) : 0.5)),
  ).toThrow('Tilfeldighetskilden');
});
it('orders several overdue FSRS cards without dropping awarded-skill reviews', () => {
  const now = '2026-10-10T09:00:00Z',
    card = serializeCard(
      scheduleReview(null, now, {
        correct: true,
        hintLevel: 0,
        timeMs: 2000,
        medianMs: null,
      }),
    );
  expect(
    dueReviews(
      {
        second: { ...card, due: '2026-10-09T09:00:00Z' },
        first: { ...card, due: '2026-10-01T09:00:00Z' },
        future: card,
      },
      now,
    ),
  ).toEqual(['first', 'second']);
});
