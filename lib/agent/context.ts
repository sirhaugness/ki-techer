import type { CandidateContext } from '../engine/candidates';
import type { GeneratedItem } from '../engine/skills/generators';
import { progressForPart } from '../engine/medallion';
import { sessionPhase } from '../engine/session';
import { privateText } from '../ai/moderation';
export type ContextInput = {
  learner: { firstName: string; grade: number; tutorName: string };
  engine: CandidateContext;
  active: GeneratedItem | null;
  allowedHintLevel: number;
  answerResult: boolean | null;
  observations: { text: string; confidence: number; status: string }[];
  messages: { role: string; text: string }[];
};
export function buildContext(ctx: ContextInput): string {
  return JSON.stringify({
    learner: ctx.learner,
    phase: sessionPhase(ctx.engine.clock, ctx.engine.now),
    remainingMinutes: Math.max(
      0,
      ctx.engine.clock.plannedMinutes -
        (Date.parse(ctx.engine.now) - Date.parse(ctx.engine.clock.startedAt)) /
          60000,
    ),
    active: ctx.active
      ? { skillId: ctx.active.skillId, question: ctx.active.question }
      : null,
    answerResult: ctx.answerResult,
    allowedHintLevel: ctx.allowedHintLevel,
    recentAttempts: ctx.engine.history.slice(-5),
    profile: ctx.observations
      .filter(
        (o) =>
          !privateText(o.text) &&
          (o.status === 'låst' ||
            (o.status === 'aktiv' && o.confidence >= 0.6)),
      )
      .slice(0, 25)
      .map((o) => o.text),
    medallion: ([1, 2, 3, 4] as const).map((id) =>
      progressForPart(id, ctx.engine.states),
    ),
    messages: ctx.messages
      .filter((m) => !privateText(m.text))
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 360) })),
  });
}
