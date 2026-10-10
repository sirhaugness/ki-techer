import { z } from 'zod';
import { dayKey, timestamp } from './time';
import type { Difficulty } from './skills/graph';
export const attemptEvidenceSchema = z
  .object({
    id: z.string().min(1),
    at: timestamp,
    difficulty: z.number().int().min(1).max(5),
    correct: z.boolean(),
    hintLevel: z.number().int().min(0).max(4),
    understanding: z.number().int().min(0).max(2).optional(),
  })
  .strict();
export type AttemptEvidence = z.infer<typeof attemptEvidenceSchema>;
export type SkillState = {
  theta: number;
  attempts: number;
  correctNoHint: number;
  correctDays: string[];
  recent: AttemptEvidence[];
  seenAttemptIds: string[];
  claim: { at: string; reason: string } | null;
  explained: boolean;
  masteredAt: string | null;
  lastSeenAt: string | null;
  nextReviewAt: string | null;
};
export function initialState(theta = 0): SkillState {
  z.number().finite().parse(theta);
  return {
    theta,
    attempts: 0,
    correctNoHint: 0,
    correctDays: [],
    recent: [],
    seenAttemptIds: [],
    claim: null,
    explained: false,
    masteredAt: null,
    lastSeenAt: null,
    nextReviewAt: null,
  };
}
export function probability(theta: number, difficulty: Difficulty = 3): number {
  return 1 / (1 + Math.exp(-(theta - (difficulty - 3))));
}
export function credit(correct: boolean, hintLevel: number): number {
  z.number().int().min(0).max(4).parse(hintLevel);
  return correct ? [1, 0.7, 0.4, 0.1, 0][hintLevel] : 0;
}
export function learningRate(attempts: number): number {
  return attempts < 5 ? 0.6 : 0.2 + 0.4 * Math.exp(-(attempts - 5) / 20);
}
export function masteryRemaining(state: SkillState): string[] {
  const missing: string[] = [];
  if (probability(state.theta, 3) < 0.85)
    missing.push('Minst 85 % forventet treff på nivå 3.');
  if (
    state.recent.length < 5 ||
    state.recent.filter((a) => a.correct).length < 4
  )
    missing.push('Minst fire av de siste fem svarene riktige.');
  if (state.correctDays.length < 2)
    missing.push('Riktig uten hint på minst to ulike dager.');
  if (!state.claim && !state.explained)
    missing.push(
      'Begrunnelse fra lærer eller en forklaring som viser forståelse.',
    );
  return missing;
}
function confirm(state: SkillState, now: string): SkillState {
  return !state.masteredAt && !masteryRemaining(state).length
    ? { ...state, masteredAt: now }
    : state;
}
export function recordAttempt(
  state: SkillState,
  input: AttemptEvidence,
): SkillState {
  const attempt = attemptEvidenceSchema.parse(input);
  if (state.seenAttemptIds.includes(attempt.id)) return state; // Idempotent event replay.
  if (state.lastSeenAt && Date.parse(attempt.at) < Date.parse(state.lastSeenAt))
    throw new Error('Forsøk må behandles i tidsrekkefølge.');
  const unaided = attempt.correct && attempt.hintLevel === 0;
  const days = unaided
    ? [...new Set([...state.correctDays, dayKey(attempt.at)])].sort()
    : [...state.correctDays];
  const updated = {
    ...state,
    theta:
      state.theta +
      learningRate(state.attempts) *
        (credit(attempt.correct, attempt.hintLevel) -
          probability(state.theta, attempt.difficulty as Difficulty)),
    attempts: state.attempts + 1,
    correctNoHint: state.correctNoHint + (unaided ? 1 : 0),
    correctDays: days,
    recent: [...state.recent, attempt].slice(-5),
    seenAttemptIds: [...state.seenAttemptIds, attempt.id],
    explained: state.explained || (unaided && attempt.understanding === 2),
    lastSeenAt: attempt.at,
  };
  return confirm(updated, attempt.at);
}
export function proposeMastery(
  state: SkillState,
  reason: string,
  now: string,
): { state: SkillState; approved: boolean; remaining: string[] } {
  z.string().trim().min(8).max(1000).parse(reason);
  timestamp.parse(now);
  if (state.lastSeenAt && Date.parse(now) < Date.parse(state.lastSeenAt))
    throw new Error('Vurderingen kan ikke være før siste forsøk.');
  const next = confirm({ ...state, claim: { at: now, reason } }, now);
  return {
    state: next,
    approved: Boolean(next.masteredAt),
    remaining: masteryRemaining(next),
  };
}
/** Diagnostics can initialize theta, never invent days, attempts or awards. */
export function diagnosticState(theta: number): SkillState {
  return initialState(Math.max(-3, Math.min(3, theta)));
}
