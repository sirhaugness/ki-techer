import { randomUUID } from 'node:crypto';
import { open, readFile, rename, unlink, lstat } from 'node:fs/promises';
import { dirname } from 'node:path';

const validAmount = (n) => Number.isFinite(n) && n >= 0;
const failure = () =>
  new Error(
    'Live test ledger is invalid or unavailable; no paid call allowed.',
  );

/** Validate authenticated server configuration, not caller-supplied config files. */
export function assertPreviewTestBudget(status) {
  const budget = status?.budget;
  const models = status?.models;
  if (
    !budget ||
    !validAmount(budget.limit) ||
    budget.limit <= 0 ||
    budget.limit > 10 ||
    !validAmount(budget.spent) ||
    budget.spent >= budget.limit ||
    !models ||
    typeof models !== 'object' ||
    Array.isArray(models) ||
    !Object.keys(models).length ||
    !Object.values(models).every((model) =>
      ['gpt-5-mini', 'gpt-5-nano'].includes(model),
    )
  )
    throw new Error(
      'Live Preview tests require an authenticated server budget of at most 10 NOK and only gpt-5-mini/gpt-5-nano. No paid action allowed.',
    );
}

/** Local developer evaluations only. Reuse the same private path for the whole approved task.
 * Failed/unknown calls retain their ceiling. A stale lock requires manual investigation,
 * never automatic deletion or resetting the ledger. No credentials or prompt text are stored.
 */
export function liveEvalBudget(path, limit = 10) {
  if (!path || !validAmount(limit) || limit <= 0 || limit > 10)
    throw new Error('Live tests have a hard total limit of 10 NOK.');
  async function mutate(change) {
    let lock;
    try {
      lock = await open(`${path}.lock`, 'wx', 0o600);
    } catch {
      throw failure();
    }
    let pending;
    try {
      let state;
      try {
        const info = await lstat(path);
        if (!info.isFile() || (info.mode & 0o077) !== 0) throw failure();
        state = JSON.parse(await readFile(path, 'utf8'));
      } catch (error) {
        if (error.code !== 'ENOENT') throw failure();
        state = { version: 1, limit, reservations: [], calls: [] };
      }
      if (
        state.version !== 1 ||
        state.limit !== limit ||
        !Array.isArray(state.reservations) ||
        !Array.isArray(state.calls) ||
        !state.reservations.every(
          (r) =>
            typeof r.id === 'string' &&
            validAmount(r.ceiling) &&
            validAmount(r.charged) &&
            r.charged <= r.ceiling &&
            ['pending', 'settled'].includes(r.status),
        ) ||
        new Set(state.reservations.map((r) => r.id)).size !==
          state.reservations.length ||
        state.reservations.some(
          (r) => r.status === 'pending' && r.charged !== r.ceiling,
        )
      )
        throw failure();
      const spent = state.reservations.reduce((sum, r) => sum + r.charged, 0);
      if (!validAmount(spent) || spent > limit) throw failure();
      const result = change(state, spent);
      pending = `${path}.${randomUUID()}.pending`;
      const file = await open(pending, 'wx', 0o600);
      try {
        await file.writeFile(JSON.stringify(state, null, 2));
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(pending, path);
      pending = undefined;
      const directory = await open(dirname(path), 'r');
      try {
        await directory.sync();
      } finally {
        await directory.close();
      }
      return result;
    } finally {
      if (pending) await unlink(pending).catch(() => {});
      await lock.close();
      await unlink(`${path}.lock`);
    }
  }
  return {
    guard: {
      reserve: (ceiling) =>
        mutate((state, spent) => {
          if (!validAmount(ceiling)) throw failure();
          if (spent + ceiling > limit) return null;
          const id = randomUUID();
          state.reservations.push({
            id,
            ceiling,
            charged: ceiling,
            status: 'pending',
          });
          return id;
        }),
      settle: (id, ceiling, call) =>
        mutate((state) => {
          const reservation = state.reservations.find((r) => r.id === id);
          if (
            !reservation ||
            reservation.status !== 'pending' ||
            reservation.ceiling !== ceiling ||
            !validAmount(call.cost_estimate) ||
            call.cost_estimate > ceiling
          )
            throw failure();
          reservation.status = 'settled';
          reservation.charged = call.ok ? call.cost_estimate : ceiling;
        }),
    },
    log: (call) =>
      mutate((state) => {
        const {
          purpose,
          model,
          input_tokens,
          output_tokens,
          cost_estimate,
          latency_ms,
          ok,
        } = call;
        if (
          typeof purpose !== 'string' ||
          typeof model !== 'string' ||
          typeof ok !== 'boolean' ||
          ![input_tokens, output_tokens, cost_estimate, latency_ms].every(
            validAmount,
          )
        )
          throw failure();
        state.calls.push({
          purpose,
          model,
          input_tokens,
          output_tokens,
          cost_estimate,
          latency_ms,
          ok,
        });
      }),
    status: () =>
      mutate((_state, spent) => ({ limit, spent, remaining: limit - spent })),
  };
}
