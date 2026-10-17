import { getWorkflowMetadata, sleep } from 'workflow';
import {
  initializePreparation,
  signalJob,
  claimPreparation,
  recoverPreparation,
  researchChapter,
  draftChapter,
  reviewChapter,
  prepareAssets,
} from './chapter-steps';
import type { PreparationInput } from '../lib/chapters/production-contracts';
/** Enqueue FIRST. Domain job creation is the first durable, replayable step. */
export async function prepareChapter(input: PreparationInput) {
  'use workflow';
  const runId = getWorkflowMetadata().workflowRunId;
  const jobId = await initializePreparation(input);
  try {
    await signalJob(jobId);
  } catch {
    console.log('chapter initial signal interrupted', { jobId });
  }
  const owner = await claimPreparation(jobId, runId);
  if (!owner) return { claimed: false, jobId };
  console.log('chapter preparation started', { jobId, runId });
  for (let recovery = 0; recovery < 3; recovery++) {
    try {
      await researchChapter(jobId, owner);
      if (input.mode === 'probe') await sleep('5s');
      await draftChapter(jobId, owner);
      await reviewChapter(jobId, owner);
      await prepareAssets(jobId, owner);
      return { claimed: true, jobId };
    } catch (error) {
      const result = await recoverPreparation(jobId, owner, runId);
      if (result === 'ready') return { claimed: true, jobId };
      if (result !== 'retry' || recovery === 2) throw error;
      await sleep('2s');
    }
  }
}
