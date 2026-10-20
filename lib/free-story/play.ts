import { z } from 'zod';
import { fallbackResponse } from '../agent/loop';
import { guardResponse } from '../agent/guards';
import { consecutiveErrors, needsPauseOffer } from '../engine/candidates';
import { newHints } from '../engine/hints';
import { partUnlocked } from '../engine/medallion';
import { mayContinue } from '../engine/session';
import { skillById } from '../engine/skills/graph';
import { answerSchema, checkAnswer } from '../engine/skills/generators';
import { verifyGeneratedItem } from '../engine/verified-item';
import { timestamp } from '../engine/time';
import { createSession, learningTurn } from '../learning/session';
import { concreteHelp } from '../learning/help';
import {
  emptyEvents,
  type LearnerProfile,
  type LearningEvents,
  type PublicTask,
  type Snapshot,
} from '../learning/types';
import type { AiProvider } from '../ai/provider';
import type {
  ApprovedMission,
  FreeChapter,
  FreeStoryView,
  StorySession,
} from './types';

const storyEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('answer'), answer: answerSchema }).strict(),
  z.object({ type: z.literal('hint') }).strict(),
  z
    .object({ type: z.literal('ask'), text: z.string().trim().min(1).max(600) })
    .strict(),
  z.object({ type: z.literal('next') }).strict(),
  z.object({ type: z.literal('pause') }).strict(),
]);
export type StoryEvent = z.infer<typeof storyEventSchema>;
export type StoryTurnResult = {
  state: StorySession;
  events: LearningEvents;
  replayed: boolean;
  completed: boolean;
};
export class StoryNotReadyError extends Error {
  readonly code = 'not_ready';
  constructor() {
    super('Fortsettelsen gjøres klar. Prøv igjen om litt.');
  }
}

function owned(chapter: FreeChapter, profile: LearnerProfile) {
  if (
    chapter.learner_id !== profile.id ||
    chapter.household_id !== profile.householdId
  )
    throw new Error('Kapittelet tilhører ikke denne eleven.');
}
function progress(previous: Snapshot | null, chapter: FreeChapter) {
  const saved = (previous as Partial<StorySession> | null)?.freeChapter;
  return saved?.id === chapter.id ? saved : null;
}
function missionAt(
  chapter: FreeChapter,
  index: number,
): ApprovedMission | null {
  const slot = chapter.slots[index],
    mission = chapter.missions[index];
  if (!slot || !mission) return null;
  if (
    slot.index !== index ||
    mission.slotId !== slot.id ||
    mission.skillId !== slot.item.skillId ||
    mission.difficulty !== slot.item.difficulty ||
    !verifyGeneratedItem(slot.item) ||
    !checkAnswer(slot.item, mission.answer)
  )
    throw new Error('Oppdraget passer ikke den lagrede matteplassen.');
  return mission;
}
function eventItem(state: StorySession) {
  const active = state.active!;
  return {
    id: active.id,
    skill_id: active.item.skillId,
    origin: 'generator',
    difficulty: active.item.difficulty,
    params: active.item.params,
    answer: active.item.answer,
    expression: active.item.expression,
    representation: active.representation,
    strategy: active.strategy,
    story_text: active.text,
    visual_spec: { representationHints: active.item.representationHints },
    prompt_version: 'free-story.v1',
    validated: true,
  };
}
function install(chapter: FreeChapter, state: StorySession, now: string) {
  const index = state.freeChapter.index,
    mission = missionAt(chapter, index);
  if (!mission) throw new StoryNotReadyError();
  const item = chapter.slots[index].item,
    skill = skillById(item.skillId);
  if (
    !skill.prerequisites.every((id) => !!state.states[id]?.masteredAt) ||
    (skill.part !== null && !partUnlocked(skill.part, state.states))
  )
    throw new Error('Forkunnskapene til oppdraget er ikke tilgjengelige.');
  // Item rows belong to the learner, while a new learning session needs fresh
  // IDs. Preserve the session UUID's version/variant and namespace by index.
  const tail = ((Number.parseInt(state.id.slice(-8), 16) ^ index) >>> 0)
    .toString(16)
    .padStart(8, '0');
  const attempts = state.states[item.skillId]?.attempts ?? 0;
  const representation = (['konkret', 'bilde', 'tall'] as const)[
    Math.min(2, attempts)
  ];
  state.active = {
    id: state.id.slice(0, -8) + tail,
    item: structuredClone(item),
    text: mission.question,
    storyContext: mission.text,
    representation,
    strategy: {},
    resolved: false,
  };
  state.taskStartedAt = now;
  state.correct = null;
  state.lastAnswer = undefined;
  state.lastAnswerCorrect = undefined;
  state.helpKind = undefined;
  state.hints = newHints();
  state.freeChapter.failures = 0;
  state.focusSkillId ??= item.skillId;
  state.response = {
    ...fallbackResponse('ny_oppgave'),
    speech: '',
  };
}

function reaction(state: StorySession, mission: ApprovedMission): string {
  if (state.correct) return mission.success;
  const question = mission.question;
  const seen = new Set(state.freeChapter.reactions ?? []);
  const candidates =
    state.freeChapter.failures >= 3
      ? [
          `Vi lar «${question}» hvile litt. Ta en pause, så kan vi prøve videre sammen.`,
          `Ta en pustepause før du vender tilbake til «${question}».`,
        ]
      : [
          state.freeChapter.failures === 1 ? mission.retry : mission.hint,
          state.response.speech,
          `${mission.place}: ${concreteHelp(state.active!, Math.max(1, state.hints.level), 'Jeg forstår ikke')}`,
          `Se etter det du vet i «${question}» før du prøver regningen igjen.`,
          `Tegn først situasjonen i «${question}», og marker det du skal finne.`,
        ];
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    // Quoting an already visible question adds no new mathematical claims.
    if (candidate.includes(`«${question}»`)) return candidate;
    if (
      guardResponse(
        { ...fallbackResponse('hint'), speech: candidate },
        state.active!.item,
        state.hints.level,
        true,
      )
    )
      return candidate;
  }
  return `La oss ta et rolig steg tilbake fra «${question}» og se etter opplysningene sammen.`;
}

function replaceTeacher(
  state: StorySession,
  events: LearningEvents,
  speech: string,
) {
  state.response = { ...state.response, speech };
  const saved = state.messages.at(-1);
  if (saved?.role === 'lærer') saved.text = speech;
  const emitted = events.messages.at(-1);
  if (emitted?.role === 'lærer') emitted.text = speech;
}

/** Complete native inputs, without the answer key, expression or derived math.
 * The chapter's art illustrates the story, not a model-generated answer picture.
 */
function taskView(
  chapter: FreeChapter,
  index: number,
  state: StorySession | null,
): PublicTask | null {
  const mission = missionAt(chapter, index),
    slot = chapter.slots[index];
  if (!mission || !slot) return null;
  const active = state?.active;
  const geometry = [
    'figur-2d-egenskaper',
    'figur-3d-kanter-hjorner-flater',
  ].includes(slot.item.skillId);
  const route = slot.item.skillId === 'algoritme-folg-instruksjon';
  const params = slot.item.params;
  return {
    id: active?.id ?? slot.id,
    question: mission.question,
    answerType: slot.item.answerType,
    choices: [...(slot.item.choices ?? [])],
    submittedAnswer: state
      ? answerSchema.safeParse(state.lastAnswer).data
      : undefined,
    resolved: active?.resolved ?? false,
    skillTitle: skillById(slot.item.skillId).title,
    expressionRequired: false,
    illustrationSafe: geometry || route,
    showVisual: geometry || route,
    visual: {
      type: geometry
        ? slot.item.skillId === 'figur-2d-egenskaper'
          ? 'figur2d'
          : 'figur3d'
        : route
          ? 'rutenett'
          : 'ingen',
      count: geometry && typeof params.count === 'number' ? params.count : 0,
      groups: 0,
      shape: geometry && typeof params.shape === 'string' ? params.shape : null,
      property:
        geometry && typeof params.property === 'string'
          ? params.property
          : undefined,
      steps: route && Array.isArray(params.steps) ? [...params.steps] : [],
    },
  };
}

/** No persistence or provider calls: the caller commits the returned item event
 * with revision 1 after creating the session row at database revision 0.
 */
export function startStorySession(
  chapter: FreeChapter,
  profile: LearnerProfile,
  previous: Snapshot | null,
  now: string,
  usedMinutes: number,
  resume: StorySession | null = null,
): { state: StorySession; events: LearningEvents } {
  owned(chapter, profile);
  timestamp.parse(now);
  if (!chapter.header || chapter.completed)
    throw new Error('Kapittelet kan ikke startes.');
  const source = resume && progress(resume, chapter) ? resume : previous;
  const saved = progress(source, chapter);
  const index = saved?.index ?? 0;
  if (!Number.isInteger(index) || index < 0 || index >= chapter.slots.length)
    throw new Error('Den lagrede fortsettelsen er ugyldig.');
  const state: StorySession = {
    ...structuredClone(
      createSession(profile, previous, now, usedMinutes, 'practice', null),
    ),
    freeChapter: {
      id: chapter.id,
      index,
      failures: 0,
      reactions: [...(saved?.reactions ?? [])],
    },
    revision: 1,
  };
  const events = emptyEvents();
  const mission = missionAt(chapter, index);
  if (!mission) throw new StoryNotReadyError();
  if (
    saved &&
    source?.active &&
    source.active.item.skillId === chapter.slots[index].item.skillId &&
    JSON.stringify(source.active.item) ===
      JSON.stringify(chapter.slots[index].item)
  ) {
    state.active = structuredClone(source.active);
    state.hints = structuredClone(source.hints);
    state.correct = source.correct;
    state.lastAnswer = structuredClone(source.lastAnswer);
    state.lastAnswerCorrect = source.lastAnswerCorrect;
    state.response = structuredClone(source.response);
    state.helpKind = source.helpKind;
    state.focusSkillId = source.focusSkillId;
    state.pauseOffered = source.pauseOffered;
    state.history = structuredClone(source.history);
    state.messages = structuredClone(source.messages);
    state.helpHistory = [
      ...(state.helpHistory ?? []).filter((h) => h.itemId !== state.active!.id),
      ...structuredClone(source.helpHistory ?? []).filter(
        (h) => h.itemId === state.active!.id,
      ),
    ].slice(-12);
    state.response.speech =
      state.hints.level > 0
        ? concreteHelp(state.active, state.hints.level, 'Jeg forstår ikke')
        : '';
  } else {
    install(chapter, state, now);
    events.items.push(eventItem(state));
  }
  return { state, events };
}

export async function storyTurn(
  chapter: FreeChapter,
  original: StorySession,
  raw: unknown,
  eventId: string,
  now: string,
  profile: LearnerProfile,
  provider: AiProvider | null = null,
  instructions = '',
): Promise<StoryTurnResult> {
  owned(chapter, profile);
  timestamp.parse(now);
  z.uuid().parse(eventId);
  if (original.freeChapter.id !== chapter.id)
    throw new Error('Økten gjelder et annet kapittel.');
  if (original.seenEvents.includes(eventId))
    return {
      state: structuredClone(original),
      events: emptyEvents(),
      replayed: true,
      completed: original.freeChapter.index >= chapter.slots.length,
    };
  if (original.endedAt)
    throw new Error('Økten er avsluttet. Start igjen for å fortsette.');
  const event = storyEventSchema.parse(raw);
  let state = structuredClone(original);
  const events = emptyEvents();
  const expired = !mayContinue(state.clock, now);
  if (event.type === 'next' || event.type === 'pause' || expired) {
    if (expired || event.type === 'pause') {
      state.endedAt = now;
      state.response = {
        ...fallbackResponse('avslutt'),
        speech: 'Vi tar en pause. Fortsettelsen din er lagret.',
      };
    } else {
      if (!state.active?.resolved || state.correct !== true)
        throw new Error('Fullfør oppdraget før du fortsetter.');
      const next = state.freeChapter.index + 1;
      if (next === chapter.slots.length) {
        state.freeChapter.index = next;
        state.active = null;
        state.endedAt = now;
        state.response = {
          ...fallbackResponse('avslutt'),
          speech: chapter.header?.ending ?? 'Kapittelet er fullført.',
        };
      } else {
        if (!missionAt(chapter, next)) throw new StoryNotReadyError();
        state.freeChapter.index = next;
        install(chapter, state, now);
        events.items.push(eventItem(state));
      }
    }
    state.seenEvents = [...state.seenEvents, eventId].slice(-128);
    state.revision++;
    return {
      state,
      events,
      replayed: false,
      completed: state.freeChapter.index >= chapter.slots.length,
    };
  }
  if (!state.active || !missionAt(chapter, state.freeChapter.index))
    throw new Error('Oppdraget er ikke klart.');
  if (
    JSON.stringify(state.active.item) !==
    JSON.stringify(chapter.slots[state.freeChapter.index].item)
  )
    throw new Error('Den aktive oppgaven passer ikke matteplassen.');
  // These events have no task creation tools. The stored slot is the sole
  // authority for marking, learning evidence, hint credit and mastery.
  const learned = await learningTurn(
    state,
    event.type === 'answer'
      ? {
          type: 'answer',
          itemId: state.active.id,
          answer: event.answer,
          inputMode: 'tastatur',
        }
      : event,
    eventId,
    now,
    profile,
    [],
    provider,
    instructions,
  );
  state = learned.state as StorySession;
  state.freeChapter = structuredClone(original.freeChapter);
  if (event.type === 'answer' && state.correct === false)
    state.freeChapter.failures++;
  if (consecutiveErrors(state.history) >= 3 || needsPauseOffer(state.history))
    state.pauseOffered = true;
  if (event.type === 'answer') {
    const shown = reaction(state, missionAt(chapter, state.freeChapter.index)!);
    state.freeChapter.reactions = [
      ...(state.freeChapter.reactions ?? []),
      shown,
    ];
    replaceTeacher(state, learned.events, shown);
    if (!state.correct && state.freeChapter.failures >= 3) {
      state.pauseOffered = true;
      state.endedAt = now;
      state.response.action = 'foreslå_pause';
    }
  }
  return {
    state,
    events: learned.events,
    replayed: learned.replayed,
    completed: false,
  };
}

export function freeStoryView(
  chapter: FreeChapter,
  state: StorySession | null,
  now: string,
  nextChapterId: string | null = null,
): FreeStoryView {
  timestamp.parse(now);
  if (state && state.freeChapter.id !== chapter.id)
    throw new Error('Økten gjelder et annet kapittel.');
  const index = state?.freeChapter.index ?? 0;
  const completed = chapter.completed || index >= chapter.slots.length;
  const mission = completed ? null : missionAt(chapter, index);
  const solved = state?.active?.resolved === true && state.correct === true;
  const playing =
    !!state && !state.endedAt && !completed && mayContinue(state.clock, now);
  const feedback =
    solved || (state?.correct === false && state.freeChapter.failures > 0)
      ? (state?.freeChapter.reactions?.at(-1) ??
        (solved ? (mission?.success ?? '') : (mission?.retry ?? '')))
      : '';
  const response = state?.response.speech ?? '';
  const teacher = response === feedback ? '' : response;
  return {
    chapterId: chapter.id,
    title: chapter.header?.title ?? 'Ditt neste eventyr',
    opening: chapter.header?.opening ?? '',
    interests: [...chapter.interests],
    preparing: chapter.status !== 'done',
    available: chapter.missions.length,
    total: chapter.slots.length,
    index,
    scene: mission
      ? { text: mission.text, place: mission.place, art: mission.art }
      : null,
    task: completed ? null : taskView(chapter, index, state),
    feedback,
    teacher,
    solved,
    ending: completed
      ? (chapter.header?.ending ?? 'Kapittelet er fullført.')
      : null,
    sessionId: state?.id ?? null,
    revision: state?.revision ?? 0,
    playing,
    nextChapterId,
  };
}
