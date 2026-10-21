import { randomUUID } from 'node:crypto';
import { mayContinue } from '../engine/session';
import { createSession } from '../learning/session';
import {
  emptyEvents,
  type Snapshot,
  type LearnerProfile,
  type LearningEvents,
} from '../learning/types';
import type { AiProvider } from '../ai/provider';
import {
  eventSchema,
  emptyWork,
  type Progress,
  type AdventureView,
} from './contracts';
import { missions } from './content';
import { checkWork, solutionWork, checkedSolution, workFeedback } from './math';
import { forceReply } from './tutor';
export const promptVersion = 'force-tutor.v1';
function newProgress(
  index = 0,
  completed: Progress['completed'] = [],
): Progress {
  return {
    packageVersion: 2,
    index,
    itemId: randomUUID(),
    itemPersisted: false,
    work: emptyWork(),
    status: 'working',
    assisted: missions[index].mode !== 'independent-check',
    helpLevel: 0,
    numericCorrect: null,
    modelCorrect: null,
    teacher: 'Jeg er her. Si fra hvis du vil at vi finner første steg sammen.',
    source: 'code',
    completed,
    ending: null,
  };
}
export function startAdventure(
  profile: LearnerProfile,
  previous: Snapshot | null,
  now: string,
  usedMinutes: number,
) {
  if (previous && !previous.endedAt && mayContinue(previous.clock, now)) {
    if (previous.starWarsActive) return previous;
    throw Error('Sett den andre økten på pause først.');
  }
  const state = createSession(
    profile,
    previous,
    now,
    usedMinutes,
    'practice',
    null,
  );
  state.starWarsActive = true;
  state.starWarsSession = true;
  state.starWars = structuredClone(previous?.starWars ?? newProgress());
  if (previous?.starWarsSession)
    state.messages = structuredClone(previous.messages);
  state.active = null;
  return state;
}
function message(
  state: Snapshot,
  events: LearningEvents,
  role: 'leo' | 'lærer',
  text: string,
) {
  const p = state.starWars!;
  state.messages.push({ role, text });
  state.messages = state.messages.slice(-12);
  events.messages.push({
    id: randomUUID(),
    role,
    text,
    meta: {
      experience: 'star-wars',
      packageVersion: 2,
      missionId: missions[Math.min(p.index, 19)].id,
      assisted: p.assisted,
      helpLevel: p.helpLevel,
      source: p.source,
      prompt_version: promptVersion,
    },
  });
}
function register(
  state: Snapshot,
  events: LearningEvents,
  correct: boolean,
  now: string,
) {
  const p = state.starWars!,
    m = missions[p.index];
  if (!p.itemPersisted) {
    events.items.push({
      id: p.itemId,
      skill_id: m.skillId,
      origin: 'generator',
      difficulty: 1,
      params: {},
      answer: checkedSolution(p.index),
      expression: null,
      representation: 'konkret',
      strategy: { package: 'star-wars-v2', mission: m.id, authored: true },
      story_text: [...m.narrative, m.question].join(' '),
      visual_spec: { image: m.image },
      prompt_version: promptVersion,
      validated: true,
    });
    p.itemPersisted = true;
  }
  events.attempts.push({
    id: randomUUID(),
    item_id: p.itemId,
    answer_raw: JSON.stringify(p.work),
    answer_parsed: p.work,
    correct,
    credit: 0,
    hint_level_used: p.assisted ? Math.max(1, p.helpLevel) : 0,
    time_ms: Math.max(
      0,
      Math.min(3600000, Date.parse(now) - Date.parse(state.taskStartedAt)),
    ),
    input_mode: 'manipulativ',
    misconception_code: null,
    is_master_test: false,
  });
}
export async function adventureTurn(input: {
  state: Snapshot;
  event: unknown;
  itemId: string;
  requestId: string;
  now: string;
  provider?: AiProvider | null;
  instructions?: string;
}) {
  const original = input.state;
  if (original.seenEvents.includes(input.requestId))
    return { state: original, events: emptyEvents(), replayed: true };
  if (
    !original.starWarsActive ||
    !original.starWars ||
    original.starWars.itemId !== input.itemId
  )
    throw Error('Oppgaven er endret. Hent lagret arbeid.');
  const e = eventSchema.parse(input.event),
    state = structuredClone(original),
    p = state.starWars!,
    events = emptyEvents(),
    m = missions[p.index];
  if (!m) throw Error('Eventyret er avsluttet.');
  if (!mayContinue(state.clock, input.now)) {
    state.endedAt = input.now;
    state.starWarsActive = false;
    p.teacher = 'Vi tar pause nå. Arbeidet er lagret til neste gang.';
    p.source = 'code';
  } else {
    if (p.status === 'correct' && !['next', 'pause'].includes(e.type))
      throw Error('Dette oppdraget er allerede løst.');
    if (e.type === 'work') {
      p.work = e.work;
      p.status = 'working';
      p.numericCorrect = null;
      p.modelCorrect = null;
    } else if (e.type === 'answer') {
      const result = checkWork(p.index, p.work);
      p.numericCorrect = result.numericCorrect;
      p.modelCorrect = result.modelCorrect;
      p.source = 'code';
      p.status = result.correct ? 'correct' : 'incorrect';
      if (p.index !== 19) register(state, events, result.correct, input.now);
      p.teacher = result.correct ? m.success : workFeedback(p.index, p.work);
      if (result.correct) {
        p.completed.push({
          missionId: m.id,
          assisted: p.assisted,
          correct: true,
        });
        if (p.index === 19) {
          p.ending = p.work.choice === 'yes' ? 'yes' : 'no';
          p.teacher =
            p.ending === 'yes'
              ? 'Luke smiler: «Da må du be den kule faren din lage flere eventyr!»'
              : 'Luke nikker: «Spenning nok for en dag? Det forstår jeg. Hvis du ønsker flere slike eventyr, må du prate med faren din.»';
          p.index = 20;
          state.starWarsActive = false;
          state.endedAt = input.now;
        }
      }
      message(state, events, 'lærer', p.teacher);
    } else if (e.type === 'ask') {
      p.assisted = true;
      p.helpLevel = Math.max(1, p.helpLevel);
      const result = await forceReply({
        provider: input.provider ?? null,
        instructions: input.instructions ?? '',
        mission: m,
        progress: p,
        text: e.text,
        messages: state.messages,
      });
      // Free tutor speech belongs in the existing retention-controlled messages,
      // not in long-lived nested progress. Keep an authored resume fallback here.
      p.teacher =
        result.source === 'model'
          ? m.hints[Math.min(p.helpLevel - 1, 2)]
          : result.speech;
      p.source = result.source;
      if (result.accepted) message(state, events, 'leo', e.text);
      message(state, events, 'lærer', result.speech);
    } else if (
      e.type === 'hint' ||
      e.type === 'example' ||
      e.type === 'solution'
    ) {
      p.assisted = true;
      p.source = 'code';
      if (e.type === 'hint') {
        p.teacher = m.hints[Math.min(p.helpLevel, 2)];
        p.helpLevel = Math.min(3, p.helpLevel + 1);
      }
      if (e.type === 'example') {
        p.teacher = m.example;
        p.helpLevel = Math.max(1, p.helpLevel);
      }
      if (e.type === 'solution') {
        p.helpLevel = 3;
        p.teacher = checkedSolution(p.index);
        p.work = solutionWork(p.index);
        p.status = 'working';
      }
      message(state, events, 'lærer', p.teacher);
    } else if (e.type === 'next') {
      if (p.status !== 'correct')
        throw Error('Løs oppdraget før du går videre.');
      state.starWars = newProgress(p.index + 1, p.completed);
      state.taskStartedAt = input.now;
      // Historical messages remain in their normal retention-controlled rows.
      state.messages = [];
    } else if (e.type === 'pause') {
      state.endedAt = input.now;
      state.starWarsActive = false;
    }
  }
  state.revision++;
  state.seenEvents.push(input.requestId);
  state.seenEvents = state.seenEvents.slice(-50);
  return { state, events, replayed: false };
}
export function adventureView(state: Snapshot | null): AdventureView {
  const p = state?.starWars ?? newProgress(),
    m = missions[Math.min(p.index, 19)];
  const lastMessage = state?.starWarsSession
    ? state.messages.at(-1)
    : undefined;
  const modelSpeech =
    p.source === 'model' && lastMessage?.role === 'lærer'
      ? lastMessage.text
      : null;
  return {
    sessionId: state?.starWars ? state.id : null,
    revision: state?.revision ?? 0,
    running: !!state?.starWarsActive && !state.endedAt,
    finished: p.index >= 20,
    index: p.index,
    total: missions.length,
    itemId: state?.starWars ? p.itemId : null,
    mission: {
      id: m.id,
      title: m.title,
      act: m.act,
      image: m.image,
      narrative: m.narrative,
      question: m.question,
      control: m.control,
    },
    work: p.work,
    status: p.status,
    assisted: p.assisted,
    helpLevel: p.helpLevel,
    teacher: modelSpeech ?? p.teacher,
    source: p.source === 'model' && !modelSpeech ? 'fallback' : p.source,
    ending: p.ending,
    dialogue: (state?.starWarsSession ? state.messages : [])
      .filter(
        (x): x is { role: 'leo' | 'lærer'; text: string } =>
          x.role === 'leo' || x.role === 'lærer',
      )
      .slice(-8),
  };
}
export { adventureSpeech } from './speech';
