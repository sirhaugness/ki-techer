import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  liveEvalBudget,
  assertPreviewTestBudget,
} from '../../scripts/lib/live-eval-budget.mjs';
import type { AiCall } from '../../lib/ai/provider';

const directories: string[] = [];
async function ledgerPath() {
  const directory = await mkdtemp(join(tmpdir(), 'leo-test-budget-'));
  directories.push(directory);
  return join(directory, 'budget.json');
}
const call = (cost: number, ok = true): AiCall => ({
  purpose: 'tutor',
  model: 'gpt-5-nano',
  input_tokens: 100,
  output_tokens: 20,
  cost_estimate: cost,
  latency_ms: 10,
  ok,
});
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});

describe('persistent live evaluation budget', () => {
  it('rejects normal monthly caps and expensive or unverifiable Preview models before browser actions', () => {
    const good = {
      budget: { limit: 10, spent: 1 },
      models: { text: 'gpt-5-mini' },
    };
    expect(() => assertPreviewTestBudget(good)).not.toThrow();
    expect(() =>
      assertPreviewTestBudget({ ...good, models: { text: 'gpt-5-nano' } }),
    ).not.toThrow();
    for (const bad of [
      undefined,
      {},
      { ...good, budget: { limit: 100, spent: 1 } },
      { ...good, budget: { limit: 10, spent: 10 } },
      { ...good, budget: { limit: 10, spent: -1 } },
      { ...good, models: { text: 'gpt-5.2' } },
      { ...good, models: {} },
      { ...good, models: { text: undefined } },
    ])
      expect(() => assertPreviewTestBudget(bad)).toThrow('No paid action');
  });
  it('reserves before calls, persists across processes and never silently raises the cap', async () => {
    const path = await ledgerPath();
    const first = liveEvalBudget(path);
    const id = await first.guard.reserve(8);
    expect(id).toBeTruthy();
    expect((await stat(path)).mode & 0o077).toBe(0);
    const fresh = liveEvalBudget(path);
    expect(await fresh.guard.reserve(3)).toBeNull();
    await fresh.guard.settle(id!, 8, call(1));
    await fresh.log(call(1));
    expect(await liveEvalBudget(path).status()).toEqual({
      limit: 10,
      spent: 1,
      remaining: 9,
    });
    expect(JSON.parse(await readFile(path, 'utf8')).calls).toEqual([call(1)]);
    await expect(liveEvalBudget(path, 5).status()).rejects.toThrow('invalid');
    expect(() => liveEvalBudget(path, 11)).toThrow('hard total limit');
  });
  it('retains the full reservation for unknown and failed calls, including after restart', async () => {
    const path = await ledgerPath();
    const ledger = liveEvalBudget(path);
    await ledger.guard.reserve(4); // Process died without a reply.
    const id = await ledger.guard.reserve(6);
    await ledger.guard.settle(id!, 6, call(0, false));
    await ledger.log(call(0, false));
    expect(await liveEvalBudget(path).status()).toEqual({
      limit: 10,
      spent: 10,
      remaining: 0,
    });
    expect(await ledger.guard.reserve(0.01)).toBeNull();
    await expect(ledger.guard.settle(id!, 6, call(0))).rejects.toThrow(
      'invalid',
    );
    expect((await ledger.status()).spent).toBe(10);
  });
  it('fails closed for corrupt or public ledgers and for a concurrent/stale lock', async () => {
    const path = await ledgerPath();
    await writeFile(path, '{broken', { mode: 0o600 });
    await expect(liveEvalBudget(path).guard.reserve(1)).rejects.toThrow(
      'invalid',
    );
    await writeFile(
      path,
      JSON.stringify({ version: 1, limit: 10, reservations: [], calls: [] }),
    );
    await writeFile(`${path}.lock`, 'held by another process', { mode: 0o600 });
    await expect(liveEvalBudget(path).guard.reserve(1)).rejects.toThrow(
      'invalid',
    );
    await rm(`${path}.lock`);
    await rm(path);
    await writeFile(path, '{}', { mode: 0o644 });
    await expect(liveEvalBudget(path).guard.reserve(1)).rejects.toThrow(
      'invalid',
    );
  });
  it('allows at most one competing reservation and preserves unknown over-ceiling charges', async () => {
    const path = await ledgerPath();
    const a = liveEvalBudget(path),
      b = liveEvalBudget(path);
    const attempts = await Promise.allSettled([
      a.guard.reserve(6),
      b.guard.reserve(6),
    ]);
    const ids = attempts.flatMap((result) =>
      result.status === 'fulfilled' && result.value ? [result.value] : [],
    );
    expect(ids).toHaveLength(1);
    await expect(a.guard.settle(ids[0], 6, call(7))).rejects.toThrow('invalid');
    expect((await a.status()).spent).toBe(6);
    expect(await b.guard.reserve(5)).toBeNull();
  });
});
