import {
  initialState,
  recordAttempt,
  proposeMastery,
  probability,
  type SkillState,
} from './mastery';
import {
  skills,
  skillById,
  type PartId,
  type Difficulty,
} from './skills/graph';
import { generate, checkAnswer, type GeneratedItem } from './skills/generators';
import { seededRng, type Rng } from './random';
import {
  getCandidates,
  zpdDifficulty,
  validateItemRequest,
  consecutiveErrors,
  needsPauseOffer,
  type CandidateContext,
  type PracticeEvent,
  type Representation,
} from './candidates';
import {
  newBandit,
  chooseArm,
  updateArm,
  forget,
  reward,
  recommendStrategies,
  type Dimension,
} from './bandit';
import { startSession, defaultSessionSettings, sessionPhase } from './session';
import { scheduleReview } from './scheduler';
import {
  progressForPart,
  canStartMasterTest,
  startMasterTest,
  finishMasterTest,
  completedMedallion,
  type PartProgress,
} from './medallion';
import type { Card } from 'ts-fsrs';
const atDay = (day: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, 10 + day, 9, minute)).toISOString();
function rmse(values: readonly number[]): number {
  return Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length);
}
export function simulateCalibration(
  seed: number,
  mean: number,
  sessions = 200,
) {
  const rng = seededRng(seed),
    states = skills.map(() => initialState()),
    truth = skills.map((s) => mean + ((s.order % 7) - 3) * 0.12);
  let correct = 0,
    total = 0;
  for (let session = 0; session < sessions; session++)
    for (let i = 0; i < 20; i++) {
      const index = Math.floor(rng() * skills.length),
        state = states[index],
        difficulty = zpdDifficulty(state.theta),
        outcome = rng() < probability(truth[index], difficulty);
      states[index] = recordAttempt(state, {
        id: `${session}-${i}`,
        at: atDay(session),
        difficulty,
        correct: outcome,
        hintLevel: 0,
      });
      correct += Number(outcome);
      total++;
    }
  return {
    seed,
    sessions,
    accuracy: correct / total,
    initialRmse: rmse(truth),
    finalRmse: rmse(states.map((s, i) => s.theta - truth[i])),
  };
}
export function simulatePreferences(seed: number, sessions = 200) {
  const rng = seededRng(seed);
  let state = newBandit();
  const preferred: Record<Dimension, string> = {
    kontekst: 'ren_oppgave',
    representasjon: 'konkret',
    forklaringsstil: 'proev_foerst',
    tempo: 'kort',
  };
  const selected = Object.fromEntries(
    Object.keys(state).map((d) => [d, { best: 0, total: 0 }]),
  ) as Record<Dimension, { best: number; total: number }>;
  for (let session = 0; session < sessions; session++) {
    state = forget(state);
    for (let round = 0; round < 10; round++)
      for (const dimension of Object.keys(state) as Dimension[]) {
        const name = chooseArm(state[dimension], rng),
          isBest = name === preferred[dimension],
          p = isBest ? 0.95 : 0.2;
        const value = reward({
          nextCredit: Number(rng() < p),
          laterReview: Number(rng() < p),
          engagement: Number(rng() < (isBest ? 0.9 : 0.5)),
          selfReport: isBest ? 1 : 0.5,
        });
        state[dimension] = updateArm(state[dimension], name, value);
        if (session >= sessions - 40) {
          selected[dimension].total++;
          selected[dimension].best += Number(isBest);
        }
      }
  }
  return {
    seed,
    sessions,
    bestArmShares: Object.fromEntries(
      Object.entries(selected).map(([d, c]) => [d, c.best / c.total]),
    ),
  };
}
function response(item: GeneratedItem, truth: number, rng: Rng): unknown {
  return rng() < probability(truth, item.difficulty as Difficulty)
    ? item.answer
    : null;
}
export function simulateProgression(seed: number, sessions = 200) {
  const rng = seededRng(seed),
    states: Record<string, SkillState> = Object.fromEntries(
      skills.map((s) => [s.id, initialState()]),
    ),
    truth: Record<string, number> = Object.fromEntries(
      skills.map((s) => [s.id, 1 + (s.order % 4) * 0.1]),
    ),
    previous: Record<string, GeneratedItem> = {},
    cards: Record<string, Card> = {};
  let parts: PartProgress[] = [1, 2, 3, 4].map((id) =>
    progressForPart(id as PartId, states),
  );
  const awarded: PartId[] = [];
  let testsFailed = 0,
    practiceAttempts = 0,
    pauseOffers = 0;
  for (let session = 0; session < sessions; session++) {
    const now = atDay(session);
    parts = parts.map((p) => progressForPart(p.id, states, p));
    const target = parts.find((p) => !p.awardedAt);
    if (target && canStartMasterTest(target, now)) {
      const test = startMasterTest(
        target,
        now,
        `test-${session}`,
        Array.from({ length: 10 }, (_, i) => `test-${session}-${i}`),
      );
      const answers = test.items.map((i) => {
        const item = generate(i.skillId, 3, rng, previous[i.skillId]);
        previous[i.skillId] = item;
        const correct = checkAnswer(
          item,
          response(item, truth[i.skillId], rng),
        );
        states[i.skillId] = recordAttempt(states[i.skillId], {
          id: i.id,
          at: now,
          difficulty: 3,
          correct,
          hintLevel: 0,
        });
        return { itemId: i.id, correct, hintLevel: 0 };
      });
      const result = finishMasterTest(target, test, answers, now);
      parts = parts.map((p) => (p.id === target.id ? result.progress : p));
      if (result.passed) awarded.push(target.id);
      else testsFailed++;
    }
    const clock = startSession(defaultSessionSettings, now, 0),
      history: PracticeEvent[] = [];
    let focus: string | null = null;
    const selectedPart = parts.find((p) => !p.awardedAt)?.id ?? 4;
    for (let slot = 0; slot < 24; slot++) {
      const time = new Date(
          Date.parse(now) + (1 + slot * 0.5) * 60000,
        ).toISOString(),
        phase = sessionPhase(clock, time);
      if (
        phase !== 'oppvarming' &&
        phase !== 'hovedøkt' &&
        phase !== 'blandet_utfordring'
      )
        break;
      const ctx: CandidateContext = {
        states,
        clock,
        now: time,
        phase,
        selectedPart,
        history,
        focusSkillId: focus,
      };
      const candidates = getCandidates(ctx, rng);
      // Stand-in chooses among proposals. It may justify a frontier outside top six.
      const pool = [
        ...candidates,
        ...skills
          .filter((s) => !candidates.some((c) => c.skill_id === s.id))
          .map((s) => ({
            skill_id: s.id,
            foreslått_vanskegrad: zpdDifficulty(states[s.id].theta),
            anbefalt_strategi: recommendStrategies(
              newBandit(),
              rng,
              states[s.id].attempts,
            ),
            grunn: 'frontferdighet' as const,
            predicted: 0,
            score: 0,
          })),
      ];
      const priority = (id: string) => {
        const s = skillById(id),
          state = states[id];
        if (
          phase === 'oppvarming' &&
          state.nextReviewAt &&
          Date.parse(state.nextReviewAt) <= Date.parse(time)
        )
          return 0;
        if (!state.masteredAt && s.part === null) return 1;
        if (!state.masteredAt && s.part === selectedPart) return 2;
        if (!state.masteredAt) return 3;
        return 4;
      };
      pool.sort((a, b) => priority(a.skill_id) - priority(b.skill_id));
      let chosen: {
        id: string;
        difficulty: Difficulty;
        representation: Representation;
      } | null = null;
      for (const candidate of pool) {
        const id = candidate.skill_id,
          state = states[id],
          errors = consecutiveErrors(history),
          last = history.at(-1);
        let difficulty =
          errors >= 3 ? (1 as Difficulty) : candidate.foreslått_vanskegrad;
        if (
          errors === 2 &&
          last &&
          difficulty >= last.difficulty &&
          last.difficulty > 1
        )
          difficulty = (last.difficulty - 1) as Difficulty;
        const reps =
          state.attempts < 3
            ? [(['konkret', 'bilde', 'tall'] as const)[state.attempts]]
            : [
                candidate.anbefalt_strategi.representasjon as Representation,
                'konkret' as const,
                'bilde' as const,
                'tall' as const,
              ];
        for (const representation of reps) {
          if (
            validateItemRequest(
              {
                skillId: id,
                difficulty,
                representation,
                reason:
                  'Øver på en tilgjengelig ferdighet og følger blandingsregelen.',
              },
              ctx,
              candidates,
            ).ok
          ) {
            chosen = { id, difficulty, representation };
            break;
          }
        }
        if (chosen) break;
      }
      if (!chosen) break;
      const { id, difficulty, representation } = chosen,
        item = generate(id, difficulty, rng, previous[id]);
      previous[id] = item;
      const correct = checkAnswer(item, response(item, truth[id], rng));
      states[id] = recordAttempt(states[id], {
        id: `practice-${session}-${slot}`,
        at: time,
        difficulty,
        correct,
        hintLevel: 0,
      });
      truth[id] = Math.min(5, truth[id] + 0.08); // Explicit synthetic learning curve, not a forced correct answer.
      states[id] = proposeMastery(
        states[id],
        'Den simulerte læreren har vurdert elevens strategi.',
        time,
      ).state;
      if (states[id].masteredAt) {
        cards[id] = scheduleReview(cards[id] ?? null, time, {
          correct,
          hintLevel: 0,
          timeMs: 3000,
          medianMs: 4000,
        });
        states[id] = {
          ...states[id],
          nextReviewAt: cards[id].due.toISOString(),
        };
      }
      if (phase === 'hovedøkt' && !focus) focus = id;
      history.push({ skillId: id, difficulty, representation, correct, phase });
      practiceAttempts++;
      if (needsPauseOffer(history)) {
        pauseOffers++;
        break;
      }
    }
    parts = parts.map((p) => progressForPart(p.id, states, p));
  }
  return {
    seed,
    sessions,
    practiceAttempts,
    pauseOffers,
    testsFailed,
    awarded,
    complete: completedMedallion(parts),
    skillsMastered: Object.values(states).filter((s) => s.masteredAt).length,
  };
}
export function simulationReport() {
  return {
    calibration: [
      simulateCalibration(11, -0.6),
      simulateCalibration(22, 0.8),
      simulateCalibration(33, 1.8),
    ],
    preferences: simulatePreferences(44),
    progression: simulateProgression(55),
  };
}
export function assertSimulation(
  report: ReturnType<typeof simulationReport>,
): void {
  for (const pupil of report.calibration) {
    if (
      pupil.sessions !== 200 ||
      pupil.accuracy < 0.7 ||
      pupil.accuracy > 0.85 ||
      pupil.finalRmse >= 0.5 ||
      pupil.finalRmse >= pupil.initialRmse * 0.8
    )
      throw new Error(`Kalibrering feilet for seed ${pupil.seed}.`);
  }
  if (
    Object.values(report.preferences.bestArmShares).some((share) => share < 0.8)
  )
    throw new Error('Preferanselæring feilet.');
  if (
    !report.progression.complete ||
    report.progression.skillsMastered !== skills.length ||
    report.progression.awarded.join(',') !== '1,2,3,4'
  )
    throw new Error('Medaljongprogresjon feilet.');
}
