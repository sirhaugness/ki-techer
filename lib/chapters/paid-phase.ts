import 'server-only';
import { randomUUID } from 'node:crypto';
import { openaiProvider } from '../ai/openai';
import { budgetGuard } from '../security/limits';
import { logAi, asJson } from '../learning/repository';
import type { AiProvider, AiCall } from '../ai/provider';
import type { ChapterJob } from './production-contracts';
import { chapterDb } from './store';
export class PreparationError extends Error {
  constructor(
    public state: 'failed' | 'budget' | 'unknown',
    public code: string,
  ) {
    super(code);
  }
}
/** A provider result is checkpointed separately from the phase. Replay never
 * repurchases a call whose result or send status is uncertain. */
export async function paidPhase<T>(
  job: ChapterJob,
  owner: string,
  phase: string,
  work: (provider: AiProvider) => Promise<T>,
): Promise<T> {
  if (!process.env.OPENAI_API_KEY)
    throw new PreparationError('failed', 'provider_unconfigured');
  let id: string = randomUUID();
  const db = chapterDb();
  const begin = await db.rpc('begin_chapter_call', {
    target_job: job.id,
    claim_owner: owner,
    call_phase: phase,
    call_id: id,
  });
  if (begin.error || !begin.data)
    throw new PreparationError('failed', 'call_journal_unavailable');
  const record = begin.data as unknown as {
    fresh: boolean;
    call: { id: string; state: string; result: T };
  };
  id = record.call.id;
  if (!record.fresh) {
    if (record.call.state === 'completed') return record.call.result;
    throw new PreparationError(
      record.call.state === 'budget'
        ? 'budget'
        : record.call.state === 'failed'
          ? 'failed'
          : 'unknown',
      'previous_call_' + record.call.state,
    );
  }
  const base = budgetGuard(job.household_id);
  let reserved = false,
    denied = false,
    usage: AiCall | undefined;
  const provider = openaiProvider(
    async (call) => {
      usage = call;
      await logAi(job.household_id, { ...call, chapter_job_id: job.id });
    },
    {
      async reserve(ceiling) {
        if (reserved)
          throw new PreparationError('unknown', 'multiple_paid_calls_in_phase');
        // Persisted call ID is also the stable budget reservation ID.
        const { adminDb } = await import('../db/server');
        const { configuredBudget } = await import('../engine/limits');
        const r = await adminDb().rpc('reserve_ai_budget', {
          target_household: job.household_id,
          reservation_id: id,
          amount: ceiling,
          configured_limit: configuredBudget(process.env.AI_MONTHLY_BUDGET_NOK),
        });
        if (r.error) throw new PreparationError('failed', 'budget_unavailable');
        denied = r.data !== true;
        reserved = !denied;
        return reserved ? id : null;
      },
      settle: base.settle,
    },
    { usage: { chapterNumber: job.chapter_number } },
  );
  async function finish(state: string, result: unknown) {
    const r = await db.rpc('finish_chapter_call', {
      target_job: job.id,
      claim_owner: owner,
      call_id: id,
      call_state: state,
      call_result: asJson(result),
      call_usage: asJson(usage ?? null),
    });
    if (r.error || r.data !== true)
      throw new PreparationError('unknown', 'call_checkpoint_unconfirmed');
  }
  try {
    const result = await work(provider);
    await finish('completed', result);
    return result;
  } catch (error) {
    if (
      error instanceof PreparationError &&
      error.code === 'call_checkpoint_unconfirmed'
    )
      throw error;
    const state = denied
      ? 'budget'
      : reserved && !usage?.usage_known
        ? 'unknown'
        : 'failed';
    await finish(state, null);
    throw new PreparationError(
      state,
      denied
        ? 'budget_exhausted'
        : state === 'unknown'
          ? 'provider_outcome_unknown'
          : 'provider_failed',
    );
  }
}
