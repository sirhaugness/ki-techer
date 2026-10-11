import 'server-only';
import { openaiProvider } from './openai';
import { budgetStatus, budgetGuard, aiLogger } from '../security/limits';
export async function controlledProvider(householdId: string) {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    if ((await budgetStatus(householdId)).fallback) return null;
  } catch {
    return null;
  }
  return openaiProvider(aiLogger(householdId), budgetGuard(householdId));
}
