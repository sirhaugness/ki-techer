import { z } from 'zod';
import type { ActiveTask } from '../agent/tools';
import type { TutorResponse } from '../agent/schemas';
import type { SessionClock } from '../engine/session';
import type { SkillState } from '../engine/mastery';
import type { PartProgress, MasterTest } from '../engine/medallion';
import type { HintState } from '../engine/hints';
import type { BanditState } from '../engine/bandit';
import type { PracticeEvent } from '../engine/candidates';
import type { serializeCard } from '../engine/scheduler';
import { answerSchema } from '../engine/skills/generators';

export const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('next') }),
  z.object({ type: z.literal('hint') }),
  z.object({ type: z.literal('school'), text: z.string().trim().max(240) }),
  z.object({
    type: z.literal('answer'),
    itemId: z.uuid(),
    answer: answerSchema,
    inputMode: z.enum(['tastatur', 'tale', 'manipulativ']),
  }),
  z.object({
    type: z.literal('explain'),
    text: z.string().trim().min(1).max(600),
  }),
  z.object({
    type: z.literal('end'),
    mood: z.enum(['glad', 'rolig', 'sliten']),
    reflection: z.string().max(600),
  }),
  z.object({
    type: z.literal('mood'),
    mood: z.enum(['glad', 'rolig', 'sliten']),
  }),
]);
export type LearningEvent = z.infer<typeof eventSchema>;
export type LearnerProfile = {
  id: string;
  householdId: string;
  firstName: string;
  tutorName: string;
  grade: number;
  avatar: string;
  settings: Record<string, unknown>;
};
export type Interest = {
  id: string;
  label: string;
  active: boolean;
  weight?: number;
};
export type Snapshot = {
  version: 1;
  revision: number;
  id: string;
  clock: SessionClock;
  mode: 'diagnostic' | 'practice' | 'master';
  states: Record<string, SkillState>;
  parts: PartProgress[];
  cards: Record<string, ReturnType<typeof serializeCard>>;
  bandit: BanditState;
  history: PracticeEvent[];
  active: ActiveTask | null;
  hints: HintState;
  focusSkillId: string | null;
  selectedPart: 1 | 2 | 3 | 4 | null;
  masterTest: MasterTest | null;
  masterAnswers: { itemId: string; correct: boolean; hintLevel: 0 }[];
  diagnosticIndex: number;
  diagnosticDifficulty: 1 | 2 | 3 | 4 | 5;
  diagnosticComplete: boolean;
  usedInterests: (string | null)[];
  seenEvents: string[];
  messages: { role: string; text: string }[];
  response: TutorResponse;
  endedAt: string | null;
  taskStartedAt: string;
  correct: boolean | null;
  pauseOffered: boolean;
  celebration: string | null;
  moodStart: string | null;
  moodEnd: string | null;
  schoolTopics: {
    rawText: string;
    skillIds: string[];
    confidence: number;
    expiresAt: string;
  }[];
  pendingObservations: { category: string; text: string }[];
};
export type LearningEvents = {
  items: Record<string, unknown>[];
  attempts: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  tools: Record<string, unknown>[];
  flags: Record<string, unknown>[];
  masterTests: Record<string, unknown>[];
  misconceptions: Record<string, unknown>[];
  schoolTopics: Record<string, unknown>[];
};
export const emptyEvents = (): LearningEvents => ({
  items: [],
  attempts: [],
  messages: [],
  tools: [],
  flags: [],
  masterTests: [],
  misconceptions: [],
  schoolTopics: [],
});
export type PublicTask = {
  showVisual: boolean;
  id: string;
  question: string;
  answerType: 'number' | 'choice' | 'remainder' | 'sequence' | 'coordinate';
  choices: string[];
  visual: {
    type: string;
    count: number;
    groups: number;
    shape: string | null;
    steps: string[];
  };
  resolved: boolean;
  skillTitle: string;
};
export type LearningView = {
  id: string;
  revision: number;
  mode: Snapshot['mode'];
  task: PublicTask | null;
  speech: string;
  parts: PartProgress[];
  ended: boolean;
  correct: boolean | null;
  hintLevel: number;
  pauseOffered: boolean;
  celebration: string | null;
  diagnosticComplete: boolean;
  masterProgress: { done: number; total: number } | null;
};
