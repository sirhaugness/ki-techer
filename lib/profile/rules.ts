import { z } from 'zod';
export const categories = [
  'interesse',
  'læringspreferanse',
  'motivasjon',
  'styrke',
  'utfordring',
  'misoppfatning',
  'skolemetode',
] as const;
export const operationSchema = z
  .object({
    op: z.enum(['legg_til', 'styrk', 'svekk', 'arkiver']),
    observation_id: z.uuid().nullable(),
    category: z.enum(categories),
    text: z.string().trim().min(1).max(240),
    evidence_session_id: z.uuid(),
    confidence_delta: z.number().min(-1).max(1),
  })
  .strict();
export type Operation = z.infer<typeof operationSchema>;
export type Observation = {
  id: string;
  learner_id: string;
  category: string;
  text: string;
  confidence: number;
  status: string;
  evidence: { session_ids?: string[] };
  updated_by: string;
  updated_at: string;
};
/** Fixed evidence increments. Model-supplied confidence_delta is advisory only. */
export function nextConfidence(current: number, op: Operation['op']) {
  return (
    Math.round(
      Math.max(0, Math.min(1, current + (op === 'styrk' ? 0.15 : -0.2))) * 100,
    ) / 100
  );
}
export function visibleObservations(rows: Observation[]) {
  return rows
    .filter(
      (o) =>
        o.status === 'låst' || (o.status === 'aktiv' && o.confidence >= 0.6),
    )
    .slice(0, 25);
}
