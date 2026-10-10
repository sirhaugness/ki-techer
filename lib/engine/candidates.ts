import { z } from 'zod';
import {
  skills,
  skillById,
  type Difficulty,
  type PartId,
} from './skills/graph';
import { probability, initialState } from './mastery';
import { partUnlocked, type States } from './medallion';
import { recommendStrategies, newBandit, type BanditState } from './bandit';
import { type Rng } from './random';
import { timestamp } from './time';
import { mayContinue, type SessionClock } from './session';
export type Representation = 'konkret' | 'bilde' | 'tall';
export type PracticeEvent = {
  skillId: string;
  difficulty: Difficulty;
  representation: Representation;
  correct: boolean;
  phase: 'oppvarming' | 'hovedøkt' | 'blandet_utfordring';
};
export type Candidate = {
  skill_id: string;
  foreslått_vanskegrad: Difficulty;
  grunn:
    | 'forfalt_repetisjon'
    | 'frontferdighet'
    | 'aktiv_misoppfatning'
    | 'skoletema'
    | 'valgt_medaljongdel';
  anbefalt_strategi: Record<string, string>;
  predicted: number;
  score: number;
};
export type CandidateContext = {
  states: States;
  clock: SessionClock;
  now: string;
  phase: PracticeEvent['phase'];
  selectedPart?: PartId;
  misconceptions?: readonly string[];
  schoolTopics?: readonly {
    skillIds: readonly string[];
    confidence: number;
    expiresAt: string;
  }[];
  history: readonly PracticeEvent[];
  focusSkillId: string | null;
  bandit?: BanditState;
};
export function zpdDifficulty(theta: number): Difficulty {
  return ([1, 2, 3, 4, 5] as Difficulty[])
    .map((d) => ({ d, delta: Math.abs(probability(theta, d) - 0.775) }))
    .sort((a, b) => a.delta - b.delta)[0].d;
}
export function consecutiveErrors(history: readonly PracticeEvent[]): number {
  let errors = 0;
  for (let i = history.length - 1; i >= 0 && !history[i].correct; i--) errors++;
  return errors;
}
export function needsPauseOffer(history: readonly PracticeEvent[]): boolean {
  return history.length >= 4 && consecutiveErrors(history.slice(0, -1)) >= 3;
}
export function mixingAllowed(
  history: readonly PracticeEvent[],
  nextSkillId: string,
  focus: string | null,
): boolean {
  if (!focus) return true;
  const main = history.filter((h) => h.phase === 'hovedøkt').slice(-9);
  const other =
    main.filter((h) => h.skillId !== focus).length +
    (nextSkillId !== focus ? 1 : 0);
  return other >= Math.floor(0.3 * (main.length + 1));
}
function available(id: string, states: States): boolean {
  const s = skillById(id);
  return (
    s.prerequisites.every((p) => Boolean(states[p]?.masteredAt)) &&
    (s.part === null || partUnlocked(s.part, states))
  );
}
export function getCandidates(ctx: CandidateContext, rng: Rng): Candidate[] {
  timestamp.parse(ctx.now);
  if (!mayContinue(ctx.clock, ctx.now)) return [];
  const errors = consecutiveErrors(ctx.history),
    last = ctx.history.at(-1);
  const candidates = skills
    .filter((s) => available(s.id, ctx.states))
    .flatMap((s) => {
      const state = ctx.states[s.id] ?? initialState();
      const due =
        !!state.masteredAt &&
        !!state.nextReviewAt &&
        Date.parse(state.nextReviewAt) <= Date.parse(ctx.now);
      const misconception = ctx.misconceptions?.includes(s.id) ?? false;
      const school =
        ctx.schoolTopics?.some(
          (t) =>
            t.confidence >= 0.6 &&
            Date.parse(t.expiresAt) > Date.parse(ctx.now) &&
            t.skillIds.includes(s.id),
        ) ?? false;
      if (state.masteredAt && !due && !misconception && errors < 3) return [];
      if (
        ctx.phase === 'hovedøkt' &&
        !mixingAllowed(ctx.history, s.id, ctx.focusSkillId)
      )
        return [];
      let difficulty = zpdDifficulty(state.theta);
      if (errors >= 3) {
        if (probability(state.theta, 1) < 0.85) return [];
        difficulty = 1;
      }
      const strategy = recommendStrategies(
        ctx.bandit ?? newBandit(),
        rng,
        state.attempts,
      );
      if (errors >= 2 && last) {
        if (
          difficulty >= last.difficulty &&
          strategy.representasjon === last.representation
        ) {
          if (errors === 2 && last.difficulty > 1)
            difficulty = (last.difficulty - 1) as Difficulty;
          else if (state.attempts < 3) return [];
          else
            strategy.representasjon =
              last.representation === 'konkret' ? 'bilde' : 'konkret';
        }
      }
      const reason: Candidate['grunn'] = due
        ? 'forfalt_repetisjon'
        : misconception
          ? 'aktiv_misoppfatning'
          : school
            ? 'skoletema'
            : ctx.selectedPart === s.part
              ? 'valgt_medaljongdel'
              : 'frontferdighet';
      const base = due
        ? 100
        : misconception
          ? 80
          : ctx.selectedPart === s.part
            ? 70
            : 50;
      return [
        {
          skill_id: s.id,
          foreslått_vanskegrad: difficulty,
          grunn: reason,
          anbefalt_strategi: strategy,
          predicted: probability(state.theta, difficulty),
          score: base * (school ? 1.3 : 1) - s.order / 1000,
        },
      ];
    });
  return candidates.sort((a, b) => b.score - a.score).slice(0, 6);
}
const requestSchema = z
  .object({
    skillId: z.string(),
    difficulty: z.number().int().min(1).max(5),
    representation: z.enum(['konkret', 'bilde', 'tall']),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict();
export function validateItemRequest(
  input: unknown,
  ctx: CandidateContext,
  candidates: readonly Candidate[],
): { ok: boolean; reason: string } {
  if (!mayContinue(ctx.clock, ctx.now))
    return { ok: false, reason: 'Økten er ferdig for i dag.' };
  const result = requestSchema.safeParse(input);
  if (!result.success)
    return { ok: false, reason: 'Ugyldige oppgaveargumenter.' };
  const request = result.data;
  let skill;
  try {
    skill = skillById(request.skillId);
  } catch {
    return { ok: false, reason: 'Ukjent ferdighet.' };
  }
  if (!available(skill.id, ctx.states))
    return {
      ok: false,
      reason: 'Forkunnskapene eller medaljongdelen er ikke tilgjengelige.',
    };
  const candidate = candidates.find((c) => c.skill_id === skill.id);
  if (!candidate && (!request.reason || request.reason.length < 8))
    return {
      ok: false,
      reason: 'Oppgave utenfor kandidatlisten trenger en begrunnelse.',
    };
  const state = ctx.states[skill.id] ?? initialState(),
    errors = consecutiveErrors(ctx.history),
    last = ctx.history.at(-1);
  if (errors >= 3) {
    if (request.difficulty !== 1 || probability(state.theta, 1) < 0.85)
      return { ok: false, reason: 'Tre feil: velg en lett mestringsoppgave.' };
  } else if (
    Math.abs(
      request.difficulty -
        (candidate?.foreslått_vanskegrad ?? zpdDifficulty(state.theta)),
    ) > 1
  )
    return {
      ok: false,
      reason: 'Vanskegraden må være innenfor ett nivå fra anbefalingen.',
    };
  if (
    errors >= 2 &&
    last &&
    request.difficulty >= last.difficulty &&
    request.representation === last.representation
  )
    return {
      ok: false,
      reason: 'To feil: senk vanskegrad eller bytt representasjon.',
    };
  if (
    ctx.phase === 'hovedøkt' &&
    !mixingAllowed(ctx.history, skill.id, ctx.focusSkillId)
  )
    return { ok: false, reason: 'Minst 30 % blandet øving må beholdes.' };
  if (
    state.attempts < 3 &&
    request.representation !== ['konkret', 'bilde', 'tall'][state.attempts]
  )
    return {
      ok: false,
      reason: 'Ny ferdighet må introduseres konkret, med bilde, så med tall.',
    };
  return { ok: true, reason: 'Oppgaven er tillatt.' };
}
