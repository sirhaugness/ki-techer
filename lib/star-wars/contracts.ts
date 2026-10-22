import { z } from 'zod';
export const workSchema = z
  .object({
    numbers: z.array(z.number().int().min(0).max(999).nullable()).max(3),
    choice: z.string().max(40).nullable(),
    groups: z.array(z.number().int().min(0).max(24)).length(4),
    corners: z.array(z.number().int().min(0).max(3)).max(4),
    commands: z.array(z.enum(['right', 'up', 'left', 'down'])).max(3),
  })
  .strict()
  .refine(
    (w) =>
      new Set(w.corners).size === w.corners.length &&
      w.groups.reduce((a, b) => a + b, 0) <= 24,
  );
export type Work = z.infer<typeof workSchema>;
export const emptyWork = (): Work => ({
  numbers: [],
  choice: null,
  groups: [0, 0, 0, 0],
  corners: [],
  commands: [],
});
export type Control = {
  kind:
    'groups' | 'numbers' | 'route' | 'program' | 'shape' | 'choice' | 'ending';
  labels: string[];
  options?: { id: string; label: string; values?: number[] }[];
  grid?: { columns: number; rows: number };
  rotated?: boolean;
};
export type Mission = {
  id: string;
  title: string;
  act: string;
  image: 'cockpit' | 'corridor' | 'hangar' | 'force';
  narrative: string[];
  question: string;
  control: Control;
  skillId: string;
  mode: 'teaching' | 'guided-practice' | 'independent-check';
  success: string;
  hints: [string, string, string];
  example: string;
};
export type Progress = {
  packageVersion: 2;
  index: number;
  itemId: string;
  itemPersisted: boolean;
  work: Work;
  status: 'working' | 'incorrect' | 'correct';
  assisted: boolean;
  helpLevel: number;
  numericCorrect: boolean | null;
  modelCorrect: boolean | null;
  teacher: string;
  source: 'code' | 'model' | 'fallback';
  completed: { missionId: string; assisted: boolean; correct: boolean }[];
  ending: 'yes' | 'no' | null;
};
export type AdventureView = {
  sessionId: string | null;
  revision: number;
  running: boolean;
  finished: boolean;
  index: number;
  total: number;
  itemId: string | null;
  mission: Pick<
    Mission,
    'id' | 'title' | 'act' | 'image' | 'narrative' | 'question' | 'control'
  >;
  work: Work;
  status: Progress['status'];
  assisted: boolean;
  helpLevel: number;
  teacher: string;
  source: Progress['source'];
  ending: Progress['ending'];
  dialogue: { role: 'leo' | 'lærer'; text: string }[];
};
export const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('work'), work: workSchema }).strict(),
  z.object({ type: z.literal('answer') }).strict(),
  z
    .object({ type: z.literal('ask'), text: z.string().trim().min(1).max(500) })
    .strict(),
  z.object({ type: z.literal('hint') }).strict(),
  z.object({ type: z.literal('example') }).strict(),
  z.object({ type: z.literal('solution') }).strict(),
  z.object({ type: z.literal('next') }).strict(),
  z.object({ type: z.literal('pause') }).strict(),
]);
export type AdventureEvent = z.infer<typeof eventSchema>;
