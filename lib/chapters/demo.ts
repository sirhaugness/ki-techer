import 'server-only';
import { demoChapter } from './demo-chapter';
import { materializeProblem, tutorContext } from './compile';
import { checkAnswer } from '../engine/skills/generators';
import {
  demoCommandSchema,
  demoStateSchema,
  newDemoState,
  draftWasChecked,
  type DemoAnswer,
  type DemoResult,
} from './demo-contracts';

const missions = demoChapter.nodes.filter((n) => n.kind === 'mission');
function correct(index: number, input: DemoAnswer) {
  const mission = missions[index];
  if (!mission) return false;
  const item = materializeProblem(mission.variants[0]);
  if (mission.variants[0].scene.interaction === 'distribution') {
    const total = Number(item.params.total),
      groups = Number(item.params.b);
    return (
      input.allocations.length === groups &&
      input.allocations.reduce((sum, n) => sum + n, 0) === total &&
      input.allocations.every((n) => checkAnswer(item, n))
    );
  }
  return (
    /^\d{1,3}$/.test(input.value) && checkAnswer(item, Number(input.value))
  );
}

/** Browser-owned rehearsal only. Replay verifies every prior answer; no learning writes. */
export function demoTurn(rawState: unknown, rawCommand: unknown): DemoResult {
  const state = demoStateSchema.parse(rawState),
    command = demoCommandSchema.parse(rawCommand);
  if (!state.completed.every((a, i) => correct(i, a)))
    throw new Error('Ugyldig lagret prøvesvar.');
  const index = state.completed.length;
  if (state.solved && !correct(index, state.solved))
    throw new Error('Prøvesvaret er ikke løst.');
  const mission = missions[index];
  if (!mission) {
    if (state.solved) throw new Error('Kapittelet er avsluttet.');
    const ending = demoChapter.nodes.find((n) => n.kind === 'ending')!;
    return {
      state,
      view: {
        title: demoChapter.title,
        goal: demoChapter.goal,
        opening: demoChapter.opening,
        index,
        total: missions.length,
        mission: null,
        outcome: null,
        ending: ending.kind === 'ending' ? ending.narration : '',
        teacher: 'Du kan ta pause her. Prøvekapittelet er ferdig.',
        feedback: '',
        history: missions.map((m) => m.success),
      },
    };
  }
  if (command === 'next') {
    if (!state.solved) throw new Error('Løs oppdraget først.');
    return demoTurn(
      { ...newDemoState(), completed: [...state.completed, state.solved] },
      'resume',
    );
  }
  if (!state.solved) {
    if (command === 'answer') {
      state.lastChecked = structuredClone(state.draft);
      if (correct(index, state.draft))
        state.solved = structuredClone(state.draft);
      else {
        state.failures = Math.min(5, state.failures + 1);
        if (state.failures > 1) {
          state.hintLevel = Math.min(3, state.hintLevel + 1);
          state.helpKind = 'mathematics';
        }
      }
    }
    if (command === 'hint') {
      state.hintLevel = Math.min(3, state.hintLevel + 1);
      state.helpKind = 'mathematics';
    }
    if (command === 'story') state.helpKind = 'story';
  }
  const context = tutorContext(
    demoChapter,
    {
      id: demoChapter.sagaId,
      revision: index,
      interest: demoChapter.interest,
      goal: demoChapter.goal,
      chapterSummaries: [],
      inventory: [],
      actorLocations: [{ actorId: 'mira', locationId: 'cove' }],
      events: missions.slice(0, index).map((m) => ({
        id: m.id,
        chapterId: demoChapter.id,
        missionId: m.id,
        summary: m.success,
      })),
    },
    {
      chapterId: demoChapter.id,
      sagaId: demoChapter.sagaId,
      currentMissionId: mission.id,
      variantId: 'primary',
      completedMissionIds: missions.slice(0, index).map((m) => m.id),
      choices: [],
    },
    {
      allowedHintLevel: state.hintLevel,
      assessment: state.solved
        ? 'correct'
        : state.failures && draftWasChecked(state)
          ? 'incorrect'
          : 'not-answered',
      attempts: Array.from({ length: state.failures }, () => ({
        correct: false,
        hintLevel: state.hintLevel,
      })),
    },
  );
  const scene = context.mission.scene;
  const quantity = (id: string) =>
    scene.objects.find((o) => o.id === id)!.quantity!;
  const help =
    index === 0
      ? [
          'Se på én lykt først. Tell plassene i den.',
          `Hver lykt trenger ${quantity('stones')} lyssteiner. Tell videre med like store hopp for hver lykt.`,
          `Legg sammen ${Array.from({ length: quantity('lanterns') }, () => quantity('stones')).join(' + ')}. Skriv antallet du får.`,
        ]
      : index === 1
        ? [
            'Finn de mørke plankene. De ligger der fra før.',
            `Start ved ${quantity('placed')}. Tell videre til ${quantity('slots')}, én tom plass om gangen.`,
            `Du kan regne ${quantity('slots')} − ${quantity('placed')}. De nye plankene skal fylle de tomme plassene.`,
          ]
        : [
            'Gi én invitasjon til hver postkasse før du begynner på neste runde.',
            'Sammenlign postkassene etter hver runde. De skal ha like mange.',
            `Del ${quantity('letters')} invitasjoner på ${quantity('boxes')} postkasser. Fortsett til sekken er tom.`,
          ];
  const feedback = state.solved
    ? mission.success
    : state.failures && draftWasChecked(state)
      ? scene.feedback.reducedMotion.incorrect
      : '';
  return {
    state,
    view: {
      title: demoChapter.title,
      goal: demoChapter.goal,
      opening: demoChapter.opening,
      index,
      total: missions.length,
      mission: context.mission,
      outcome: state.solved
        ? {
            text: mission.success,
            sceneText: mission.variants[0].scene.feedback.reducedMotion.correct,
          }
        : null,
      ending: null,
      feedback,
      teacher: state.solved
        ? 'Se hva du fikk til i vika. Fortsett når du er klar.'
        : state.helpKind === 'story'
          ? `${context.mission.before} ${context.mission.goal}`
          : state.helpKind === 'mathematics'
            ? help[Math.max(0, state.hintLevel - 1)]
            : 'Jeg er her. Du kan spørre om historien eller få hjelp med regningen.',
      history: context.saga.recentEvents.map((e) => e.summary),
    },
  };
}
