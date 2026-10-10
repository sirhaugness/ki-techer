import { it, expect } from 'vitest';
import { simulationReport, assertSimulation } from '@/lib/engine/simulation';
it('200-session synthetic pupils calibrate, learn preferences and earn all four parts', () => {
  const report = simulationReport();
  expect(() => assertSimulation(report)).not.toThrow();
  expect(report.progression.practiceAttempts).toBeGreaterThan(500);
  expect(() =>
    assertSimulation({
      ...report,
      progression: { ...report.progression, complete: false },
    }),
  ).toThrow('Medaljong');
  expect(() =>
    assertSimulation({
      ...report,
      preferences: { ...report.preferences, bestArmShares: { broken: 0 } },
    }),
  ).toThrow('Preferanse');
  // GitHub's shared runners can take >30 s for the full synthetic curriculum.
}, 120_000);
