import { z } from 'zod';

export const workSchema = z
  .object({
    value: z.number().int().min(0).max(24).nullable(),
    groups: z.array(z.number().int().min(0).max(24)).length(4),
    plate: z.enum(['A', 'B', 'C']).nullable(),
    corners: z.array(z.number().int().min(0).max(3)).max(4),
    roleA: z.enum(['recipients', 'size']).nullable(),
    roleB: z.enum(['recipients', 'size']).nullable(),
    demonstration: z.enum(['one-pack', 'three-recipients']).nullable(),
  })
  .strict()
  .refine(
    (w) =>
      new Set(w.corners).size === w.corners.length &&
      w.groups.reduce((a, b) => a + b, 0) <= 24,
  );
export type Work = z.infer<typeof workSchema>;
export const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('work'), work: workSchema }).strict(),
  z.object({ type: z.literal('answer') }).strict(),
  z
    .object({
      type: z.literal('probe'),
      probeId: z.literal('SW19-divisor-roles'),
      text: z.string().trim().min(1).max(500),
    })
    .strict(),
  z
    .object({ type: z.literal('ask'), text: z.string().trim().min(1).max(500) })
    .strict(),
  z.object({ type: z.literal('hint') }).strict(),
  z.object({ type: z.literal('solution') }).strict(),
  z.object({ type: z.literal('example') }).strict(),
  z.object({ type: z.literal('guided-complete') }).strict(),
  z.object({ type: z.literal('next') }).strict(),
  z.object({ type: z.literal('pause') }).strict(),
]);
export type PreparedEvent = z.infer<typeof eventSchema>;
export type Mode = 'teaching' | 'guided-practice' | 'independent-check';
export type Evidence = 'not-assessed' | 'insufficient' | 'partial' | 'relevant';
export type Progress = {
  packageVersion: 1;
  index: number;
  itemId: string;
  itemPersisted: boolean;
  work: Work;
  mode: Mode;
  assisted: boolean;
  helpLevel: number;
  status: 'working' | 'incorrect' | 'correct';
  numericCorrect: boolean | null;
  modelCorrect: boolean | null;
  evidence: Evidence;
  followUps: number;
  probeRoles: { a: boolean; b: boolean };
  feedback: string;
  teacher: string;
  source: 'code' | 'model-selection' | 'fallback';
  completed: { missionId: string; assisted: boolean; evidence: Evidence }[];
};
export type PreparedView = {
  sessionId: string | null;
  revision: number;
  running: boolean;
  finished: boolean;
  missionId: string;
  index: number;
  title: string;
  scene: string;
  opening: string;
  question: string;
  expression: string;
  mode: Mode;
  work: Work;
  status: Progress['status'];
  helpLevel: number;
  feedback: string;
  teacher: string;
  assisted: boolean;
  evidence: Evidence;
  source: Progress['source'];
  probeId: 'SW19-divisor-roles' | null;
};
