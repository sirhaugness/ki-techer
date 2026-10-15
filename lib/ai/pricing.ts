// Standard Responses prices, verified against the model pages on 2026-10-15.
// USD->NOK is a conservative planning assumption, not a live exchange rate.
export const USD_TO_NOK = 11;
export const PRICING_VERSION = '2026-10-15-usd11-v2';
const prices: Record<string, { input: number; output: number }> = {
  'gpt-5.2': { input: 1.75, output: 14 },
  'gpt-5-mini': { input: 0.25, output: 2 },
  'gpt-5-nano': { input: 0.05, output: 0.4 },
};
export function estimateCost(input: number, output: number, model: string) {
  const name = model.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  const rate = prices[name];
  // An unpriced override keeps the old conservative ceiling. No silent free calls.
  return rate
    ? ((input * rate.input + output * rate.output) * USD_TO_NOK) / 1_000_000
    : (input * 100 + output * 400) / 1_000_000;
}
export function textModel() {
  // Legacy TUTOR/REFLECT envs deliberately do not retain the expensive old defaults.
  return process.env.OPENAI_MODEL_DEFAULT || 'gpt-5-mini';
}
export const SEARCH_CALL_NOK = 0.01 * USD_TO_NOK;
// Reservation allowance for retrieved context, NOT a fixed billing block for GPT-5 mini.
export const SEARCH_CONTENT_TOKENS = 8000;
