import type { AiCall } from '../../lib/ai/provider';
import type { BudgetGuard } from '../../lib/security/limits';
export function assertPreviewTestBudget(status: unknown): void;
export function liveEvalBudget(
  path: string,
  limit?: number,
): {
  guard: BudgetGuard;
  log: (call: AiCall) => Promise<void>;
  status: () => Promise<{ limit: number; spent: number; remaining: number }>;
};
