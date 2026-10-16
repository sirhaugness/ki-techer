import { describe, expect, it, vi, afterEach } from 'vitest';
import { estimateCost, textModel, USD_TO_NOK } from '../../lib/ai/pricing';

afterEach(() => vi.unstubAllEnvs());
describe('model-priced NOK planning estimates', () => {
  it('prices the same actual usage by model, without claiming cache discounts', () => {
    expect(estimateCost(1_000_000, 1_000_000, 'gpt-5-mini')).toBe(
      2.25 * USD_TO_NOK,
    );
    expect(estimateCost(1_000_000, 1_000_000, 'gpt-5-nano')).toBe(
      0.45 * USD_TO_NOK,
    );
    expect(estimateCost(1_000_000, 1_000_000, 'gpt-5.2')).toBe(
      15.75 * USD_TO_NOK,
    );
    expect(estimateCost(2000, 500, 'gpt-5-mini-2025-08-07')).toBe(
      estimateCost(2000, 500, 'gpt-5-mini'),
    );
    expect(estimateCost(2000, 500, 'unknown')).toBe(0.4);
  });
  it('uses mini despite legacy expensive role configuration and has no automatic upgrade', () => {
    vi.stubEnv('OPENAI_MODEL_DEFAULT', '');
    vi.stubEnv('OPENAI_MODEL_TUTOR', 'gpt-5.2');
    vi.stubEnv('OPENAI_MODEL_REFLECT', 'gpt-5.2');
    expect(textModel()).toBe('gpt-5-mini');
    vi.stubEnv('OPENAI_MODEL_DEFAULT', 'gpt-5-nano');
    expect(textModel()).toBe('gpt-5-nano');
  });
});
