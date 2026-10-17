import { z } from 'zod';
import type { Json } from '../db/types';
import type { PublicMission } from './contracts';
export const phases = [
  'research',
  'draft',
  'review',
  'assets',
  'ready',
] as const;
export type PreparationPhase = (typeof phases)[number];
export const playProgressSchema = z
  .object({
    nodeId: z.string().nullable(),
    lastAnswer: z
      .object({
        value: z.string().max(3),
        allocations: z.array(z.number().int().nonnegative()).max(20),
      })
      .nullable()
      .optional(),
    solved: z.boolean(),
    completed: z.array(z.string()).max(40),
    choices: z
      .array(z.object({ nodeId: z.string(), optionId: z.string() }).strict())
      .max(40),
    hintLevel: z.number().int().min(0).max(3),
    failures: z.number().int().min(0).max(5),
  })
  .strict();
export type PlayProgress = z.infer<typeof playProgressSchema>;
export type ChapterJob = {
  id: string;
  household_id: string;
  learner_id: string;
  saga_id: string;
  chapter_number: number;
  based_on_revision: number;
  seed: number;
  phase: PreparationPhase;
  state:
    | 'queued'
    | 'running'
    | 'ready'
    | 'failed'
    | 'budget'
    | 'unknown'
    | 'cancelled';
  data: Json;
  owner: string | null;
  lease_until: string | null;
  workflow_run_id: string | null;
  error_code: string | null;
  progress: Json;
  play_revision: number;
  play_done: boolean;
  created_at: string;
  updated_at: string;
};
export type SagaRow = {
  id: string;
  household_id: string;
  learner_id: string;
  interest: Json;
  facts: Json;
  revision: number;
  created_at: string;
};
export type CallRow = {
  id: string;
  job_id: string;
  household_id: string;
  phase: string;
  state: 'pending' | 'completed' | 'failed' | 'budget' | 'unknown';
  result: Json;
  usage: Json;
  started_at: string;
  completed_at: string | null;
};
type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};
type Rpc<Args> = { Args: Args; Returns: Json };
export type ChapterDatabase = {
  public: {
    Tables: {
      chapter_jobs: Table<ChapterJob>;
      chapter_sagas: Table<SagaRow>;
      chapter_calls: Table<CallRow>;
      chapter_play_times: Table<{
        id: string;
        job_id: string;
        household_id: string;
        learner_id: string;
        started_at: string;
        ended_at: string | null;
        planned_minutes: number;
      }>;
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      begin_chapter: Rpc<{
        target_learner: string;
        target_household: string;
        interest_identity: Json;
        job_seed: number;
        preparation_mode: string;
        request_key: string;
      }>;
      resume_chapter: Rpc<{
        target_job: string;
        expected_owner: string | null;
      }>;
      claim_chapter: Rpc<{
        target_job: string;
        claim_owner: string;
        run_id: string;
      }>;
      checkpoint_chapter: Rpc<{
        target_job: string;
        claim_owner: string;
        expected_phase: string;
        next_phase: string;
        phase_data: Json;
      }>;
      begin_chapter_call: Rpc<{
        target_job: string;
        claim_owner: string;
        call_phase: string;
        call_id: string;
      }>;
      finish_chapter_call: Rpc<{
        target_job: string;
        claim_owner: string;
        call_id: string;
        call_state: string;
        call_result: Json;
        call_usage: Json;
      }>;
      fail_chapter: Rpc<{
        target_job: string;
        claim_owner: string;
        failure_state: string;
        failure_code: string;
      }>;
      commit_chapter_play: Rpc<{
        target_job: string;
        target_learner: string;
        expected_revision: number;
        next_progress: Json;
        actual_facts: Json;
        finished: boolean;
      }>;
    };
  };
};
export type ChapterView = {
  jobId: string;
  playing: boolean;
  canRetry: boolean;
  canChooseNew: boolean;
  teacher: string;
  lastAnswer: { value: string; allocations: number[] } | null;
  state: ChapterJob['state'];
  phase: PreparationPhase;
  revision: number;
  interest: string;
  title: string;
  goal: string;
  opening: string;
  message: string;
  mission:
    | (PublicMission & {
        quantities: Record<string, { objectId: string; value: number }>;
      })
    | null;
  choices: { id: string; label: string }[];
  choicePrompt: string | null;
  solved: boolean;
  outcome: {
    text: string;
    sceneText: string;
    effects: { targetId: string; action: string }[];
  } | null;
  ending: string | null;
  history: string[];
  hintLevel: number;
  failures: number;
};
export const chapterCommandSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('answer'),
      revision: z.number().int().nonnegative(),
      value: z.string().max(3),
      allocations: z.array(z.number().int().min(0).max(100)).max(20),
    })
    .strict(),
  z
    .object({
      type: z.enum(['next', 'hint', 'story', 'start']),
      revision: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      type: z.literal('choice'),
      revision: z.number().int().nonnegative(),
      optionId: z.string().max(80),
    })
    .strict(),
]);

export type PreparationInput = {
  learnerId: string;
  householdId: string;
  interest: { key: string; label: string };
  seed: number;
  requestKey: string;
  mode: 'model' | 'probe';
  resume: boolean;
};
