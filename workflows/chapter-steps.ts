import { FatalError, getWritable } from 'workflow';
import { createHash } from 'node:crypto';
import {
  chapterDb,
  jobById,
  checkpoint,
  failJob,
  CheckpointUnavailable,
} from '../lib/chapters/store';
import { paidPhase, PreparationError } from '../lib/chapters/paid-phase';
import {
  problemMenu,
  researchSchema,
  productionDraft,
  author,
  critic,
  reviewIssues,
  reviewAccepted,
  readyManifest,
  type ProblemOption,
} from '../lib/chapters/production';
import type {
  ChapterJob,
  PreparationInput,
} from '../lib/chapters/production-contracts';
import type { ChapterPackage } from '../lib/chapters/contracts';
import { identifyInterest } from '../lib/chapters/contracts';
import { openaiProvider } from '../lib/ai/openai';
import { aiLogger, budgetGuard } from '../lib/security/limits';
import type { UniverseResearch } from '../lib/ai/provider';
import { asJson } from '../lib/learning/repository';

type PhaseData = {
  mode?: string;
  probeFailed?: boolean;
  probeRevisionRan?: boolean;
  interest: { key: string; label: string };
  facts: unknown;
  menu: ProblemOption[];
  research: UniverseResearch;
  draft: unknown;
  packet: ChapterPackage;
};
export async function initializePreparation(input: PreparationInput) {
  'use step';
  const r = await chapterDb().rpc('begin_chapter', {
    target_learner: input.learnerId,
    target_household: input.householdId,
    interest_identity: asJson(input.interest),
    job_seed: input.seed,
    preparation_mode: input.mode,
    request_key: input.requestKey,
  });
  if (r.error || typeof r.data !== 'string')
    throw Error('Could not initialize chapter.');
  if (input.resume) {
    const job = await jobById(r.data);
    if (job.state === 'failed' || job.state === 'budget') {
      const resumed = await chapterDb().rpc('resume_chapter', {
        target_job: job.id,
        expected_owner: job.owner,
      });
      if (resumed.error) throw Error('Could not resume chapter.');
    }
  }
  return r.data;
}
export async function signalJob(jobId: string) {
  'use step';
  const stream = getWritable<{ jobId: string }>();
  const writer = stream.getWriter();
  try {
    await writer.write({ jobId });
  } finally {
    writer.releaseLock();
  }
  await stream.close();
}
signalJob.maxRetries = 0;
export async function recoverPreparation(
  jobId: string,
  owner: string,
  runId: string,
) {
  'use step';
  const job = await jobById(jobId);
  if (job.state === 'ready') return 'ready';
  const resumedWithoutClaim = job.state === 'queued' && job.owner === null;
  if (job.owner !== owner && !resumedWithoutClaim) return 'stopped';
  const calls = await chapterDb()
    .from('chapter_calls')
    .select('state')
    .eq('job_id', jobId);
  if (calls.error) throw Error('Could not inspect phase recovery.');
  if (calls.data.some((c) => c.state === 'pending' || c.state === 'unknown')) {
    await failJob(jobId, owner, 'unknown', 'provider_outcome_unknown');
    return 'stopped';
  }
  if (calls.data.some((c) => c.state === 'failed' || c.state === 'budget'))
    return 'stopped';
  if (job.state !== 'running' && !resumedWithoutClaim) {
    if (job.error_code !== 'checkpoint_unavailable') return 'stopped';
    const r = await chapterDb().rpc('resume_chapter', {
      target_job: jobId,
      expected_owner: owner,
    });
    if (r.error) throw Error('Could not recover checkpoint.');
    if (r.data !== true) return 'stopped';
  }
  const claim = await chapterDb().rpc('claim_chapter', {
    target_job: jobId,
    claim_owner: owner,
    run_id: runId,
  });
  if (claim.error) throw Error('Could not reclaim checkpoint.');
  return claim.data === true ? 'retry' : 'stopped';
}
export async function claimPreparation(jobId: string, runId: string) {
  'use step';
  const hex = createHash('sha256')
    .update('chapter-claim:' + runId)
    .digest('hex');
  const owner = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  const r = await chapterDb().rpc('claim_chapter', {
    target_job: jobId,
    claim_owner: owner,
    run_id: runId,
  });
  if (r.error) throw new Error('Could not claim chapter.');
  console.log('chapter claim', {
    jobId,
    claimed: r.data === true,
    region: process.env.VERCEL_REGION ?? 'local',
  });
  return r.data === true ? owner : null;
}
async function phase(
  jobId: string,
  owner: string,
  expected: ChapterJob['phase'],
  work: (job: ChapterJob, data: PhaseData) => Promise<void>,
  runProbeWork = false,
) {
  const job = await jobById(jobId);
  if (job.phase !== expected) return;
  if (job.owner !== owner || job.state !== 'running')
    throw new FatalError('Chapter claim changed.');
  const renewed = await chapterDb().rpc('claim_chapter', {
    target_job: jobId,
    claim_owner: owner,
    run_id: job.workflow_run_id ?? '',
  });
  if (renewed.error || renewed.data !== true)
    throw new FatalError('Chapter claim expired.');
  console.log('chapter phase', {
    jobId,
    phase: expected,
    region: process.env.VERCEL_REGION ?? 'local',
  });
  try {
    const data = job.data as unknown as PhaseData;
    if (data.mode === 'probe' && !runProbeWork) {
      if (expected === 'research' && !data.probeFailed) {
        const flag = await chapterDb()
          .from('chapter_jobs')
          .update({ data: asJson({ ...data, probeFailed: true }) })
          .eq('id', job.id)
          .eq('owner', owner)
          .eq('state', 'running');
        if (flag.error) throw Error('Could not store infrastructure probe.');
        throw new CheckpointUnavailable(
          'Controlled unpaid checkpoint interruption',
        );
      }
      const next = {
        research: 'draft',
        draft: 'review',
        review: 'assets',
        assets: 'ready',
        ready: 'ready',
      }[expected];
      await checkpoint(job, owner, next, {
        probeRecovered: true,
        workerRegion: process.env.VERCEL_REGION ?? 'local',
      });
      if (expected === 'assets')
        await chapterDb()
          .from('chapter_jobs')
          .update({ play_done: true })
          .eq('id', job.id)
          .eq('owner', owner);
      return;
    }
    await work(job, data);
  } catch (e) {
    const failure =
      e instanceof PreparationError
        ? e
        : new PreparationError(
            'failed',
            e instanceof CheckpointUnavailable
              ? 'checkpoint_unavailable'
              : 'phase_failed',
          );
    await failJob(jobId, owner, failure.state, failure.code);
    throw new FatalError('Chapter preparation stopped: ' + failure.code);
  }
}
export async function researchChapter(jobId: string, owner: string) {
  'use step';
  await phase(jobId, owner, 'research', async (job, d) => {
    const previous = await chapterDb()
      .from('chapter_jobs')
      .select('data')
      .eq('saga_id', job.saga_id)
      .in('phase', ['draft', 'review', 'assets', 'ready'])
      .not('data->research', 'is', null)
      .neq('data->>mode', 'probe')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (previous.error)
      throw new PreparationError('failed', 'research_cache_unavailable');
    const cache = (previous.data?.data as { research?: unknown } | undefined)
      ?.research;
    let research = cache ? researchSchema.parse(cache) : null;
    if (!research)
      research = await paidPhase(job, owner, 'research', async (provider) => {
        if (!(await provider.moderate(d.interest.label)))
          throw new PreparationError('failed', 'interest_not_approved');
        return researchSchema.parse(await provider.research!(d.interest.label));
      });
    if (identifyInterest(research.interest).key !== d.interest.key)
      throw new PreparationError('failed', 'research_interest_mismatch');
    const menu = await problemMenu(job);
    if (menu.length < 3)
      throw new PreparationError('failed', 'supported_problem_menu_empty');
    await checkpoint(job, owner, 'draft', {
      research,
      menu,
      resourceVersion: 1,
      workerRegion: process.env.VERCEL_REGION ?? 'local',
    });
  });
  // Probe a lost step result AFTER the database checkpoint. Throw outside the
  // phase catch: recovery sees running/draft and no error_code, as after a
  // process termination before Workflow acknowledges the completed step.
  const after = await jobById(jobId);
  const afterData = after.data as Record<string, unknown>;
  if (afterData.mode === 'probe' && !afterData.probeStepAborted) {
    const marked = await chapterDb()
      .from('chapter_jobs')
      .update({ data: asJson({ ...afterData, probeStepAborted: true }) })
      .eq('id', jobId)
      .eq('owner', owner)
      .eq('state', 'running');
    if (marked.error) throw Error('Could not mark step-abort probe.');
    throw new FatalError('Unpaid probe: step result lost after checkpoint.');
  }
}
researchChapter.maxRetries = 0;
export async function draftChapter(jobId: string, owner: string) {
  'use step';
  await phase(jobId, owner, 'draft', async (job, d) => {
    const draft = await paidPhase(job, owner, 'draft', (provider) =>
      author(provider, job, d.menu, d.research),
    );
    await checkpoint(job, owner, 'review', { draft });
  });
}
draftChapter.maxRetries = 0;
type ReviewDecision =
  { needsRevision: false } | { needsRevision: true; issues: unknown };
/** One critic call per durable step: correction never shares its 300s window. */
export async function reviewChapter(
  jobId: string,
  owner: string,
  attempt: 0 | 1 = 0,
): Promise<ReviewDecision> {
  'use step';
  let decision: ReviewDecision = { needsRevision: false };
  await phase(
    jobId,
    owner,
    'review',
    async (job, d) => {
      if (d.mode === 'probe') {
        if (attempt === 0) {
          decision = {
            needsRevision: true,
            issues: { probe: 'controlled editorial correction' },
          };
          return;
        }
        if (!d.probeRevisionRan)
          throw new PreparationError('failed', 'probe_revision_missing');
        await checkpoint(job, owner, 'assets', {
          probeReviewRecovered: true,
          workerRegion: process.env.VERCEL_REGION ?? 'local',
        });
        return;
      }
      let draft = d.draft;
      if (attempt === 1) {
        const revised = await chapterDb()
          .from('chapter_calls')
          .select('state,result')
          .eq('job_id', job.id)
          .eq('phase', 'draft-revision')
          .maybeSingle();
        if (revised.error || revised.data?.state !== 'completed')
          throw new PreparationError('failed', 'revision_result_missing');
        draft = revised.data.result;
      }
      async function reject(issues: unknown, review: unknown = null) {
        if (attempt === 0) {
          decision = { needsRevision: true, issues };
          return;
        }
        const stored = await chapterDb()
          .from('chapter_jobs')
          .update({
            data: asJson({ ...d, rejectedDraft: draft, review, issues }),
          })
          .eq('id', job.id)
          .eq('owner', owner)
          .eq('state', 'running')
          .eq('phase', 'review')
          .select('id')
          .maybeSingle();
        if (stored.error || !stored.data)
          throw new PreparationError(
            'failed',
            'review_diagnostics_unavailable',
          );
        throw new PreparationError('failed', 'editorial_review_rejected');
      }
      let packet: ChapterPackage;
      try {
        packet = productionDraft(draft, job, d.menu);
      } catch (e) {
        await reject({
          structural: e instanceof Error ? e.message : 'Invalid draft',
        });
        return;
      }
      const review = await paidPhase(
        job,
        owner,
        attempt === 0 ? 'review' : 'review-revision',
        (provider) => critic(provider, packet, d.facts, d.research),
      );
      const contractIssues = reviewIssues(review, packet, d.facts);
      if (contractIssues.length) {
        await reject({ editorial: review, contract: contractIssues }, review);
        return;
      }
      const moderator = openaiProvider(
        aiLogger(job.household_id),
        budgetGuard(job.household_id),
      );
      if (!(await moderator.moderate(JSON.stringify(packet))))
        throw new PreparationError('failed', 'chapter_not_approved');
      await checkpoint(job, owner, 'assets', {
        packet,
        review,
        attempts: attempt + 1,
      });
    },
    true,
  );
  return decision;
}
reviewChapter.maxRetries = 0;
export async function reviseChapter(
  jobId: string,
  owner: string,
  issues: unknown,
) {
  'use step';
  await phase(
    jobId,
    owner,
    'review',
    async (job, d) => {
      if (d.mode === 'probe') {
        const saved = await chapterDb()
          .from('chapter_jobs')
          .update({ data: asJson({ ...d, probeRevisionRan: true }) })
          .eq('id', job.id)
          .eq('owner', owner)
          .eq('state', 'running')
          .eq('phase', 'review')
          .select('id')
          .maybeSingle();
        if (saved.error || !saved.data)
          throw new CheckpointUnavailable('Could not save correction probe.');
        return;
      }
      // The existing journal stores the result before this step acknowledges it.
      // A replay reads it; it never purchases a pending/unknown call again.
      await paidPhase(job, owner, 'draft-revision', (provider) =>
        author(provider, job, d.menu, d.research, { draft: d.draft, issues }),
      );
    },
    true,
  );
}
reviseChapter.maxRetries = 0;
export async function prepareAssets(jobId: string, owner: string) {
  'use step';
  await phase(jobId, owner, 'assets', async (job, d) => {
    const packet = productionDraft(d.packet, job, d.menu),
      manifest = readyManifest(packet);
    if (
      !reviewAccepted((job.data as { review: unknown }).review, packet, d.facts)
    )
      throw new PreparationError('failed', 'review_evidence_missing');
    await checkpoint(job, owner, 'ready', { manifest });
  });
}
