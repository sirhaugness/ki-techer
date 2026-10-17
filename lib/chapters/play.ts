import 'server-only';
import { createHash } from 'node:crypto';
import { identifyInterest, sagaFactsSchema, type SagaFacts } from './contracts';
import {
  publicMission,
  materializeProblem,
  validateChapterPackage,
} from './compile';
import { checkAnswer } from './generator-v1/skills/generators';
import { readyManifest } from './production';
import {
  playProgressSchema,
  type ChapterJob,
  type ChapterView,
  chapterCommandSchema,
} from './production-contracts';
import { chapterDb } from './store';
import { asJson } from '../learning/repository';
import type { z } from 'zod';
export function preparedPacket(job: ChapterJob) {
  const data = job.data as { packet?: unknown; manifest?: unknown };
  if (job.state !== 'ready' || job.phase !== 'ready')
    throw Error('Kapittelet er ikke klart.');
  const packet = validateChapterPackage(data.packet);
  if (JSON.stringify(readyManifest(packet)) !== JSON.stringify(data.manifest))
    throw Error('Illustrasjonene er ikke klare for denne versjonen.');
  return packet;
}
export function initialFacts(job: ChapterJob): SagaFacts {
  const d = job.data as { facts?: unknown; interest: { label: string } };
  const saved = sagaFactsSchema.safeParse(d.facts);
  if (saved.success) return saved.data;
  const packet = preparedPacket(job);
  return {
    id: packet.sagaId,
    revision: 0,
    interest: identifyInterest(d.interest.label),
    goal: packet.goal,
    chapterSummaries: [],
    events: [],
    choices: [],
    inventory: [],
    actorLocations: [],
  };
}
const statusMessages: Record<ChapterJob['state'], string> = {
  queued: 'Kapittelet står i kø. Du kan gå herfra og komme tilbake.',
  running:
    'Vi gjør hele kapittelet klart. Du kan ta en pause mens vi arbeider.',
  ready: 'Hele kapittelet er klart.',
  failed:
    'Kapittelet ble ikke klart. Arbeidet er beholdt. Du kan gå hjem og øve som vanlig.',
  budget: 'Vi har nådd KI-grensen. Det ferdige arbeidet er beholdt.',
  unknown:
    'Et svar fra fortelleren kunne ikke bekreftes. Vi starter ikke samme betalte arbeid på nytt.',
  cancelled: 'Forberedelsen er stoppet.',
};
export function chapterView(
  job: ChapterJob,
  playing: boolean,
  teacher?: string,
): ChapterView {
  const interest =
    (job.data as { interest?: { label: string } }).interest?.label ?? '';
  const view: ChapterView = {
    jobId: job.id,
    state: job.state,
    phase: job.phase,
    revision: job.play_revision,
    playing,
    canRetry:
      job.state === 'budget' ||
      job.state === 'queued' ||
      job.state === 'running' ||
      (job.state === 'failed' && job.error_code === 'checkpoint_unavailable'),
    canChooseNew: job.state === 'failed' || job.state === 'budget',
    interest,
    title: 'Ditt neste kapittel',
    goal: '',
    opening: '',
    message: statusMessages[job.state],
    teacher: 'Jeg er her. Spør om historien eller få hjelp med regningen.',
    lastAnswer: null,
    mission: null,
    choices: [],
    choicePrompt: null,
    solved: false,
    outcome: null,
    ending: null,
    history: [],
    hintLevel: 0,
    failures: 0,
  };
  if (job.state !== 'ready') return view;
  const packet = preparedPacket(job),
    p = playProgressSchema.parse(job.progress),
    node = packet.nodes.find((n) => n.id === (p.nodeId ?? packet.entryNodeId));
  if (!node) throw Error('Fant ikke den lagrede fortsettelsen.');
  Object.assign(view, {
    title: packet.title,
    goal: packet.goal,
    opening: packet.opening,
    solved: p.solved,
    hintLevel: p.hintLevel,
    failures: p.failures,
    lastAnswer: p.lastAnswer ?? null,
    history: packet.nodes
      .filter((n) => n.kind === 'mission' && p.completed.includes(n.id))
      .map((n) => (n.kind === 'mission' ? n.success : '')),
  });
  if (node.kind === 'ending') {
    view.ending = node.narration;
    return view;
  }
  if (node.kind === 'choice') {
    view.choicePrompt = node.prompt;
    view.choices = node.options.map(({ id, label }) => ({ id, label }));
    return view;
  }
  const variant = node.variants.find((v) => v.role === 'primary')!;
  view.mission = {
    ...publicMission(packet, node.id, variant.id),
    quantities: Object.fromEntries(
      variant.scene.objects
        .filter((o) => o.quantityKey)
        .map((o) => [
          o.quantityKey!,
          {
            objectId: o.id,
            value: publicMission(
              packet,
              node.id,
              variant.id,
            ).scene.objects.find((v) => v.id === o.id)!.quantity!,
          },
        ]),
    ),
  };
  if (p.solved)
    view.outcome = {
      text: node.success,
      sceneText: variant.scene.feedback.reducedMotion.correct,
      effects: variant.scene.feedback.correct,
    };
  const q = (key: string) =>
    view.mission!.scene.objects.find(
      (o) =>
        variant.scene.objects.find((s) => s.id === o.id)?.quantityKey === key,
    )?.quantity ?? 0;
  const hints =
    variant.scene.interaction === 'grouping'
      ? [
          'Se på én gruppe først. Hva skal være inni den?',
          `Hver gruppe har plass til ${q('each')}. Tell videre med like store hopp.`,
          `Du kan legge sammen ${Array.from({ length: q('groups') }, () => q('each')).join(' + ')}.`,
        ]
      : variant.scene.interaction === 'distribution'
        ? [
            'Gi én ting til hver mottaker før du begynner på neste runde.',
            'Sammenlign mottakerne. Alle skal få like mange.',
            `Fordel alle ${q('total')} på ${q('groups')} mottakere. Fortsett til alt er delt ut.`,
          ]
        : [
            'Se etter det som allerede er på plass.',
            `Begynn ved ${q('known')} og tell videre til ${q('total')}.`,
            `Du kan regne ${q('total')} − ${q('known')}. Tell bare det som mangler.`,
          ];
  view.teacher =
    teacher ??
    (p.solved
      ? 'Se hva du fikk til. Fortsett når du er klar.'
      : p.hintLevel
        ? hints[p.hintLevel - 1]
        : view.mission.clue);
  return view;
}
export function advanceChapter(
  job: ChapterJob,
  raw: unknown,
  actualFacts: unknown,
) {
  const command = chapterCommandSchema.parse(raw),
    packet = preparedPacket(job),
    p = playProgressSchema.parse(job.progress);
  if (command.revision !== job.play_revision)
    throw Error('Kapittelet ble endret i en annen fane. Last siden på nytt.');
  const node = packet.nodes.find(
    (n) => n.id === (p.nodeId ?? packet.entryNodeId),
  );
  if (!node) throw Error('Ugyldig fortsettelse.');
  p.nodeId = node.id;
  const parsedFacts = sagaFactsSchema.safeParse(actualFacts);
  let facts = parsedFacts.success ? parsedFacts.data : initialFacts(job),
    changedFacts = false,
    finished = false,
    teacher: string | undefined;
  if (command.type === 'story')
    return {
      job,
      facts: null,
      view: chapterView(
        job,
        true,
        node.kind === 'mission'
          ? `${node.before} ${node.goal}`
          : node.kind === 'choice'
            ? node.prompt
            : node.narration,
      ),
    };
  if (command.type === 'answer' && node.kind === 'mission' && !p.solved) {
    const v = node.variants.find((v) => v.role === 'primary')!,
      item = materializeProblem(v);
    let correct =
      /^\d{1,3}$/.test(command.value) &&
      checkAnswer(item, Number(command.value));
    if (v.scene.interaction === 'distribution')
      correct =
        command.allocations.length === Number(item.params.b) &&
        command.allocations.reduce((s, n) => s + n, 0) ===
          Number(item.params.total) &&
        command.allocations.every((n) => checkAnswer(item, n));
    p.lastAnswer = { value: command.value, allocations: command.allocations };
    if (correct) {
      p.solved = true;
      p.completed = [...p.completed, node.id];
      facts = {
        ...facts,
        revision: facts.revision + 1,
        events: [
          ...facts.events,
          {
            id:
              'event-' +
              createHash('sha256')
                .update(`${job.id}:${node.id}`)
                .digest('hex')
                .slice(0, 40),
            chapterId: packet.id,
            missionId: node.id,
            summary: node.success,
          },
        ],
        actorLocations: [
          ...facts.actorLocations.filter(
            (a) => !v.scene.actorIds.includes(a.actorId),
          ),
          ...v.scene.actorIds.map((actorId) => ({
            actorId,
            locationId: v.scene.locationId,
          })),
        ],
      };
      changedFacts = true;
    } else {
      p.failures = Math.min(5, p.failures + 1);
      if (p.failures >= 2) p.hintLevel = Math.min(3, p.hintLevel + 1);
      teacher = v.scene.feedback.reducedMotion.incorrect;
    }
  } else if (command.type === 'hint' && node.kind === 'mission' && !p.solved)
    p.hintLevel = Math.min(3, p.hintLevel + 1);
  else if (command.type === 'next' && node.kind === 'mission' && p.solved) {
    p.nodeId = node.next;
    p.solved = false;
    p.lastAnswer = null;
    p.hintLevel = 0;
    p.failures = 0;
  } else if (command.type === 'choice' && node.kind === 'choice') {
    const option = node.options.find((o) => o.id === command.optionId);
    if (!option) throw Error('Ukjent valg.');
    p.choices.push({ nodeId: node.id, optionId: option.id });
    p.nodeId = option.next;
    facts = {
      ...facts,
      revision: facts.revision + 1,
      choices: [
        ...(facts.choices ?? []),
        {
          chapterId: packet.id,
          nodeId: node.id,
          optionId: option.id,
          label: option.label,
        },
      ],
    };
    changedFacts = true;
  } else if (command.type !== 'start')
    throw Error('Denne handlingen passer ikke det aktive oppdraget.');
  const nextNode = packet.nodes.find((n) => n.id === p.nodeId)!;
  if (nextNode.kind === 'ending') {
    finished = true;
    facts = {
      ...facts,
      revision: facts.revision + 1,
      chapterSummaries: [
        ...facts.chapterSummaries,
        { chapterId: packet.id, summary: nextNode.narration },
      ],
    };
    changedFacts = true;
  }
  const nextJob = {
    ...job,
    progress: asJson(p),
    play_revision: job.play_revision + 1,
    play_done: finished,
  };
  return {
    job: nextJob,
    facts: changedFacts ? facts : null,
    view: chapterView(nextJob, !finished, teacher),
  };
}
export async function playTurn(job: ChapterJob, raw: unknown) {
  const saga = await chapterDb()
    .from('chapter_sagas')
    .select('facts')
    .eq('id', job.saga_id)
    .single();
  if (saga.error) throw Error('Kunne ikke hente den faktiske historien.');
  const next = advanceChapter(job, raw, saga.data.facts);
  if (next.job === job) return next.view;
  const r = await chapterDb().rpc('commit_chapter_play', {
    target_job: job.id,
    target_learner: job.learner_id,
    expected_revision: job.play_revision,
    next_progress: next.job.progress,
    actual_facts: next.facts ? asJson(next.facts) : null,
    finished: next.job.play_done,
  });
  if (r.error || r.data !== true)
    throw Error('Handlingen ble ikke lagret. Last kapittelet på nytt.');
  return next.view;
}
export type ChapterCommand = z.infer<typeof chapterCommandSchema>;
