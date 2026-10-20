import { zpdDifficulty } from '../engine/candidates';
import { initialState } from '../engine/mastery';
import { partUnlocked } from '../engine/medallion';
import { seededRng } from '../engine/random';
import { skills, type Skill } from '../engine/skills/graph';
import { generate, type GeneratedItem } from '../engine/skills/generators';
import { timestamp } from '../engine/time';
import type { Snapshot } from '../learning/types';
import type { MathSlot } from './types';

type Candidate = {
  skill: Skill;
  reason: MathSlot['reason'];
  difficulty: ReturnType<typeof zpdDifficulty>;
  reviewAt: number;
};

/** UUIDv8 encodes the integer seed and slot index; it is not a secret token. */
function slotId(seed: number, index: number): string {
  const payload =
    BigInt.asUintN(64, BigInt(seed)).toString(16).padStart(16, '0') +
    index.toString(16).padStart(8, '0') +
    '000000';
  return `${payload.slice(0, 8)}-${payload.slice(8, 12)}-8${payload.slice(12, 15)}-8${payload.slice(15, 18)}-${payload.slice(18)}`;
}

/**
 * Preparation has no running session clock and invents no learning evidence.
 * The caller stores these complete items; replay must not regenerate them.
 * Actual errors, help, mastery and future review dates remain the play engine's
 * responsibility, rather than predictions made while preparing a chapter.
 */
export function planMath(
  snapshot: Snapshot | null,
  now: string,
  seed: number,
  count = 20,
): MathSlot[] {
  timestamp.parse(now);
  if (!Number.isInteger(count) || count < 20 || count > 25)
    throw new RangeError('Et kapittel trenger mellom 20 og 25 matteplasser.');
  if (!Number.isSafeInteger(seed))
    throw new RangeError(
      'Oppgavefrøet må være et heltall med sikker presisjon.',
    );

  const states = snapshot?.states ?? {};
  const candidates: Candidate[] = skills
    .filter(
      (skill) =>
        skill.prerequisites.every((id) => !!states[id]?.masteredAt) &&
        (skill.part === null || partUnlocked(skill.part, states)),
    )
    .map((skill) => {
      const state = states[skill.id] ?? initialState();
      // FSRS cards are authoritative when present; older snapshots may have
      // only the corresponding SkillState.nextReviewAt field.
      const reviewAt = Date.parse(
        snapshot?.cards[skill.id]?.due ?? state.nextReviewAt ?? '',
      );
      return {
        skill,
        difficulty: zpdDifficulty(state.theta),
        reviewAt,
        reason: !state.masteredAt
          ? 'learning'
          : reviewAt <= Date.parse(now)
            ? 'repetition'
            : 'maintenance',
      };
    });
  if (!candidates.length) throw new Error('Ingen tilgjengelige ferdigheter.');

  const priority = (a: Candidate, b: Candidate) =>
    Number(b.skill.part === snapshot?.selectedPart) -
      Number(a.skill.part === snapshot?.selectedPart) ||
    a.skill.order - b.skill.order;
  const learning = candidates
    .filter((c) => c.reason === 'learning')
    .sort(priority);
  const due = candidates
    .filter((c) => c.reason === 'repetition')
    .sort((a, b) => a.reviewAt - b.reviewAt || priority(a, b));
  const focus =
    learning.find((c) => c.skill.id === snapshot?.focusSkillId) ??
    learning[0] ??
    due[0] ??
    candidates[0];
  const other = candidates.filter((c) => c !== focus);
  const planned = new Map<string, number>();
  const reviewed = new Set<string>();
  const previous = new Map<string, GeneratedItem>();
  const rng = seededRng(seed);
  const result: MathSlot[] = [];

  for (let index = 0; index < count; index++) {
    // Every third slot is outside the focus. For 20–25 slots this guarantees
    // at least 30% mixing, whenever another unlocked skill exists.
    const mixed = (index + 1) % 3 === 0 && other.length > 0;
    const pool = mixed ? other : candidates;
    const freshReview = due.find(
      (c) => pool.includes(c) && !reviewed.has(c.skill.id),
    );
    const learners = pool.filter((c) => c.reason === 'learning');
    const balanced = [...(learners.length ? learners : pool)].sort(
      (a, b) =>
        (planned.get(a.skill.id) ?? 0) - (planned.get(b.skill.id) ?? 0) ||
        priority(a, b),
    );
    const chosen =
      freshReview ??
      (!mixed && focus.reason === 'learning' ? focus : balanced[0]);
    const item = generate(
      chosen.skill.id,
      chosen.difficulty,
      rng,
      previous.get(chosen.skill.id),
    );
    result.push({
      id: slotId(seed, index),
      index,
      reason: chosen.reason,
      item,
    });
    planned.set(chosen.skill.id, (planned.get(chosen.skill.id) ?? 0) + 1);
    if (chosen.reason === 'repetition') reviewed.add(chosen.skill.id);
    previous.set(chosen.skill.id, item);
  }
  return result;
}
