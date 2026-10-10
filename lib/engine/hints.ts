import { z } from 'zod';
export type HintLevel = 0 | 1 | 2 | 3 | 4;
export type HintState = {
  level: HintLevel;
  failures: number;
  seenEvents: string[];
};
export const newHints = (): HintState => ({
  level: 0,
  failures: 0,
  seenEvents: [],
});
const eventSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(['wrong', 'request', 'correct']),
  })
  .strict();
export function advanceHint(
  state: HintState,
  input: z.infer<typeof eventSchema>,
): HintState {
  const event = eventSchema.parse(input);
  if (state.seenEvents.includes(event.id)) return state;
  const failures = state.failures + (event.type === 'wrong' ? 1 : 0);
  const increment =
    event.type === 'request' || (event.type === 'wrong' && failures > 1);
  return {
    level: Math.min(4, state.level + (increment ? 1 : 0)) as HintLevel,
    failures,
    seenEvents: [...state.seenEvents, event.id],
  };
}
export function allowedHint(state: HintState, requested: number): boolean {
  return (
    Number.isInteger(requested) && requested >= 0 && requested <= state.level
  );
}
