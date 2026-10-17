import { randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { start } from 'workflow/api';
import { prepareChapter } from '@/workflows/chapter-preparation';
import { leoAccess } from '@/lib/learning/access';
import { boundedJson } from '@/lib/security/body';
import { allowDevice } from '@/lib/security/limits';
import { chapterDb, activeJob, jobById } from '@/lib/chapters/store';
import { chapterView, playTurn } from '@/lib/chapters/play';
import { identifyInterest } from '@/lib/chapters/contracts';
import {
  mayPlayChapter,
  startChapterPlay,
  pauseChapter,
} from '@/lib/chapters/clock';
export const runtime = 'nodejs';
export const maxDuration = 30;
async function owned(id: string, profile: { id: string; householdId: string }) {
  const job = await jobById(z.uuid().parse(id));
  if (job.learner_id !== profile.id || job.household_id !== profile.householdId)
    throw Error('Fant ikke kapittelet ditt.');
  return job;
}
export async function GET(request: Request) {
  try {
    const { profile } = await leoAccess(),
      id = new URL(request.url).searchParams.get('job');
    const job = id ? await owned(id, profile) : await activeJob(profile.id);
    if (job && (job.data as { mode?: string }).mode === 'probe')
      return Response.json(
        {
          probe: {
            state: job.state,
            phase: job.phase,
            data: job.data,
            runId: job.workflow_run_id,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    const last = await chapterDb()
      .from('chapter_sagas')
      .select('interest')
      .eq('learner_id', profile.id)
      .neq('interest->>key', 'internal-worker-probe')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last.error) throw Error('Kunne ikke hente forrige interesse.');
    return Response.json(
      {
        view: job
          ? chapterView(
              job,
              await mayPlayChapter(profile, job, new Date().toISOString()),
            )
          : null,
        suggestedInterest:
          (last.data?.interest as { label?: string })?.label ?? '',
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return Response.json(
      {
        message:
          'Kapittelet kunne ikke åpnes. Kontroller innloggingen og prøv igjen.',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin'),
      host =
        request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    if (origin && new URL(origin).host !== host)
      return Response.json(
        { message: 'Ugyldig forespørsel.' },
        { status: 403 },
      );
    const { profile, device, client: accessClient } = await leoAccess();
    if (!(await allowDevice(device.id, profile.householdId, 'leo')))
      return Response.json(
        { message: 'Vent litt før du prøver igjen.' },
        { status: 429 },
      );
    const input = await boundedJson(request, 6000);
    if (input.tooLarge)
      return Response.json(
        { message: 'Forespørselen er for stor.' },
        { status: 413 },
      );
    const body = z
      .discriminatedUnion('command', [
        z.object({
          command: z.enum(['prepare', 'probe']),
          interest: z.string().max(80),
        }),
        z.object({
          command: z.enum(['pause', 'start', 'cancel']),
          jobId: z.uuid(),
        }),
        z.object({
          command: z.literal('turn'),
          jobId: z.uuid(),
          turn: z.unknown(),
        }),
      ])
      .parse(input.value);
    if (body.command === 'prepare' || body.command === 'probe') {
      const interest = identifyInterest(
        body.command === 'probe' ? 'internal-worker-probe' : body.interest,
      );
      const accessUser = await accessClient.auth.getUser();
      const canProbe =
        process.env.VERCEL_ENV === 'preview' &&
        accessUser.data.user?.email?.startsWith('r3-preview-') &&
        accessUser.data.user.email.endsWith('@example.invalid');
      if (body.command === 'probe' && !canProbe)
        throw Error(
          'Infrastructure probe is limited to an authorized synthetic Preview account.',
        );
      const existing =
        body.command === 'prepare' ? await activeJob(profile.id) : null;
      if (
        existing &&
        !['queued', 'running', 'failed', 'budget'].includes(existing.state)
      )
        return Response.json({ view: chapterView(existing, false) });
      if (
        existing?.state === 'failed' &&
        existing.error_code !== 'checkpoint_unavailable'
      )
        return Response.json({ view: chapterView(existing, false) });
      if (
        existing?.state === 'running' &&
        existing.lease_until &&
        Date.parse(existing.lease_until) > Date.now()
      )
        return Response.json({ view: chapterView(existing, false) });
      // The durable run is accepted before its first step creates a domain job.
      const run = await start(
        prepareChapter,
        [
          {
            learnerId: profile.id,
            householdId: profile.householdId,
            interest,
            seed: randomBytes(4).readUInt32LE(),
            requestKey: randomUUID(),
            mode: body.command === 'probe' ? 'probe' : 'model',
            resume: !!existing,
          },
        ],
        { region: 'arn1' },
      );
      const reader = run.getReadable<{ jobId: string }>().getReader();
      let id: string;
      try {
        const first = await reader.read();
        if (first.done || !first.value?.jobId)
          throw Error(
            'Forberedelsen starter i bakgrunnen. Last siden på nytt om litt.',
          );
        id = first.value.jobId;
      } finally {
        await reader.cancel();
      }
      const job = await owned(id, profile);
      if (body.command === 'probe')
        return Response.json({ probeJobId: job.id, runId: run.runId });
      return Response.json(
        { view: chapterView(job, false) },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (!('jobId' in body)) throw Error('Ukjent handling.');
    const job = await owned(body.jobId ?? '', profile),
      now = new Date().toISOString();
    if (body.command === 'cancel') {
      if (job.state !== 'failed' && job.state !== 'budget')
        throw Error('Dette kapittelet kan ikke avsluttes nå.');
      const uncertain = await chapterDb()
        .from('chapter_calls')
        .select('id')
        .eq('job_id', job.id)
        .in('state', ['pending', 'unknown'])
        .limit(1);
      if (uncertain.error || uncertain.data.length)
        throw Error(
          'Forberedelsen trenger en kontroll før du kan velge et nytt kapittel.',
        );
      const cancelled = await chapterDb()
        .from('chapter_jobs')
        .update({ state: 'cancelled' })
        .eq('id', job.id)
        .eq('learner_id', profile.id)
        .in('state', ['failed', 'budget'])
        .select('id')
        .maybeSingle();
      if (cancelled.error || !cancelled.data)
        throw Error('Kunne ikke avslutte forberedelsen.');
      return Response.json({ view: null });
    }
    if (body.command === 'pause') {
      await pauseChapter(profile.id);
      return Response.json({ view: chapterView(job, false) });
    }
    if (body.command === 'start') {
      if (job.state !== 'ready' || job.play_done)
        throw Error('Kapittelet er ikke klart til spillstart.');
      await startChapterPlay(profile, job, now);
      return Response.json({ view: chapterView(job, true) });
    }
    if (body.command !== 'turn' || !(await mayPlayChapter(profile, job, now)))
      throw Error('Start kapittelet, eller ta pause for i dag.');
    const view = await playTurn(job, body.turn);
    if (view.ending) await pauseChapter(profile.id);
    return Response.json(
      { view },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error && !error.message.includes('NEXT_')
            ? error.message
            : 'Start Leo-modus fra foreldresiden først.',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
