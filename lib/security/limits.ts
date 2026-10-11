import 'server-only';
import { randomUUID } from 'node:crypto';
import { adminDb } from '../db/server';
import { logAi } from '../learning/repository';
import {
  configuredBudget,
  requestLimits,
  type BudgetStatus,
} from '../engine/limits';
import type { AiCall } from '../ai/provider';
export type BudgetGuard = {
  reserve: (ceiling: number) => Promise<string | null>;
  settle: (id: string, ceiling: number, call: AiCall) => Promise<void>;
};
const limit = () => configuredBudget(process.env.AI_MONTHLY_BUDGET_NOK);
export async function budgetStatus(householdId: string): Promise<BudgetStatus> {
  const { data, error } = await adminDb().rpc('budget_status', {
    target_household: householdId,
    configured_limit: limit(),
  });
  if (error || !data) throw new Error('Kunne ikke kontrollere KI-budsjettet.');
  return data as unknown as BudgetStatus;
}
export function budgetGuard(householdId: string): BudgetGuard {
  return {
    async reserve(ceiling) {
      const id = randomUUID();
      const { data, error } = await adminDb().rpc('reserve_ai_budget', {
        target_household: householdId,
        reservation_id: id,
        amount: ceiling,
        configured_limit: limit(),
      });
      if (error) throw new Error('Budsjettkontrollen er utilgjengelig.');
      return data ? id : null;
    },
    async settle(id, ceiling, call) {
      const { error } = await adminDb().rpc('settle_ai_budget', {
        reservation_id: id,
        actual: call.ok ? call.cost_estimate : ceiling,
      });
      if (error) throw new Error('Kunne ikke lagre budsjettoppgjøret.');
    },
  };
}
export async function allowDevice(
  deviceId: string,
  householdId: string,
  scope: keyof typeof requestLimits,
) {
  const { data, error } = await adminDb().rpc('allow_ai_request', {
    target_device: deviceId,
    target_household: householdId,
    request_scope: scope,
    request_limit: requestLimits[scope],
  });
  if (error) throw new Error('Kunne ikke kontrollere forespørselsgrensen.');
  return data === true;
}
export const aiLogger = (householdId: string) => (call: AiCall) =>
  logAi(householdId, call);
