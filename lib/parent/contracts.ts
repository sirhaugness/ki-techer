import { z } from 'zod';
import { categories } from '../profile/rules';
export const settingsSchema = z
  .object({
    session_minutes: z.coerce.number().int().min(5).max(60),
    daily_max_minutes: z.coerce.number().int().min(5).max(180),
    allowed_start_minute: z.coerce.number().int().min(0).max(1439),
    allowed_end_minute: z.coerce.number().int().min(1).max(1440),
    voice: z.boolean(),
    auto_read: z.boolean(),
    grade: z.coerce.number().int().min(1).max(13),
    retention_months: z.coerce.number().int().min(1).max(36),
    ai_budget_nok: z.coerce.number().finite().min(0).max(10000),
  })
  .strict();
export const parentCommand = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('profile'),
      learnerId: z.uuid(),
      id: z.uuid().nullable(),
      category: z.enum(categories),
      text: z.string().trim().min(1).max(240),
      status: z.enum(['aktiv', 'låst', 'avvist', 'arkivert']),
    })
    .strict(),
  z
    .object({
      action: z.enum(['seenPart', 'seenFlag']),
      learnerId: z.uuid(),
      id: z.string().min(1).max(40),
    })
    .strict(),
  z
    .object({
      action: z.literal('settings'),
      learnerId: z.uuid(),
      settings: settingsSchema,
    })
    .strict(),
  z
    .object({ action: z.literal('resetDiagnostic'), learnerId: z.uuid() })
    .strict(),
  z
    .object({
      action: z.literal('pruneLogs'),
      learnerId: z.uuid(),
      months: z.number().int().min(1).max(36),
    })
    .strict(),
  z
    .object({
      action: z.literal('clearData'),
      learnerId: z.uuid(),
      confirmation: z.literal('SLETT'),
    })
    .strict(),
]);
export type Row = Record<string, unknown>;
export type Dashboard = {
  learner: Row;
  parts: Row[];
  states: Row[];
  observations: Row[];
  misconceptions: Row[];
  strategies: Row[];
  flags: Row[];
  sessions: Row[];
  daily: Row[];
  accuracy: Row[];
  moods: Row[];
  sessionCount: number;
  spend: number;
};
export const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? (value as Row[]) : [];
export const text = (row: Row, key: string) =>
  typeof row[key] === 'string' ? (row[key] as string) : '';
export const num = (row: Row, key: string) =>
  typeof row[key] === 'number' ? (row[key] as number) : 0;
export function date(value: string) {
  return value
    ? new Date(value).toLocaleString('nb-NO', {
        timeZone: 'Europe/Oslo',
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '—';
}
