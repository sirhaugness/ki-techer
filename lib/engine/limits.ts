export const requestLimits = { leo: 30, tts: 12, stt: 6 } as const;
export function configuredBudget(value: string | undefined) {
  if (value === undefined) return 100;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 10000) : 0;
}
export type BudgetStatus = {
  spent: number;
  limit: number;
  remaining: number;
  warning: boolean;
  fallback: boolean;
};
