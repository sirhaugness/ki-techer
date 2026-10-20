import { z } from 'zod';
import type { PublicMission } from './contracts';

const answer = z
  .object({
    value: z.string().max(3),
    allocations: z.array(z.number().int().min(0).max(30)).max(6),
  })
  .strict();
export const demoStateSchema = z
  .object({
    version: z.literal(1),
    completed: z.array(answer).max(3),
    solved: answer.nullable(),
    lastChecked: answer.nullable(),
    draft: answer,
    hintLevel: z.number().int().min(0).max(3),
    failures: z.number().int().min(0).max(5),
    helpKind: z.enum(['none', 'story', 'mathematics']),
  })
  .strict();
export type DemoState = z.infer<typeof demoStateSchema>;
export type DemoAnswer = DemoState['draft'];
export const demoCommandSchema = z.enum([
  'resume',
  'answer',
  'hint',
  'story',
  'next',
]);
export type DemoCommand = z.infer<typeof demoCommandSchema>;
export const newDemoState = (): DemoState => ({
  version: 1,
  completed: [],
  solved: null,
  lastChecked: null,
  draft: { value: '', allocations: [] },
  hintLevel: 0,
  failures: 0,
  helpKind: 'none',
});
export function draftWasChecked(state: DemoState) {
  return (
    state.lastChecked !== null &&
    state.lastChecked.value === state.draft.value &&
    JSON.stringify(state.lastChecked.allocations) ===
      JSON.stringify(state.draft.allocations)
  );
}
export type DemoView = {
  title: string;
  goal: string;
  opening: string;
  index: number;
  total: number;
  mission: PublicMission | null;
  outcome: null | { text: string; sceneText: string };
  ending: string | null;
  teacher: string;
  feedback: string;
  history: string[];
};
export type DemoResult = { state: DemoState; view: DemoView };
