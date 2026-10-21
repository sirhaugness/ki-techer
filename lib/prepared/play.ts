import { randomUUID } from 'node:crypto';
import type { AiProvider } from '../ai/provider';
import { mayContinue } from '../engine/session';
import { createSession } from '../learning/session';
import {
  emptyEvents,
  type Snapshot,
  type LearnerProfile,
  type LearningEvents,
} from '../learning/types';
import {
  eventSchema,
  type Progress,
  type PreparedView,
  type PreparedEvent,
  type Work,
} from './contracts';
import { emptyWork, missions } from './content';
import { checkWork, checkedSolution } from './math';
import { selectTeaching } from './tutor';
export const promptVersion = 'prepared-tutor.v1';
function newProgress(
  index = 0,
  completed: Progress['completed'] = [],
): Progress {
  return {
    packageVersion: 1,
    index,
    itemId: randomUUID(),
    itemPersisted: false,
    work: emptyWork(),
    mode:
      index === 0
        ? 'teaching'
        : index === 1
          ? 'guided-practice'
          : 'independent-check',
    assisted: index < 2,
    helpLevel: 0,
    status: 'working',
    numericCorrect: null,
    modelCorrect: null,
    evidence: 'not-assessed',
    followUps: 0,
    probeRoles: { a: false, b: false },
    feedback: '',
    teacher:
      index === 2
        ? 'Hva betyr 3-tallet på hvert panel? Du kan si det, skrive eller vise med kortene.'
        : 'Vi ser på bildet, ordene og regnestykket sammen.',
    source: 'code',
    completed,
  };
}
export function startPrepared(
  profile: LearnerProfile,
  previous: Snapshot | null,
  now: string,
  usedMinutes: number,
) {
  if (previous && !previous.endedAt && mayContinue(previous.clock, now)) {
    if (previous.preparedActive) return previous;
    throw Error('Avslutt den vanlige økten før du starter stjerneoppdraget.');
  }
  const state = createSession(
    profile,
    previous,
    now,
    usedMinutes,
    'practice',
    null,
  );
  state.preparedActive = true;
  state.preparedChapter = structuredClone(
    previous?.preparedChapter ?? newProgress(),
  );
  if (state.preparedChapter.packageVersion !== 1)
    throw Error('Denne kapittelversjonen kan ikke åpnes.');
  state.active = null;
  return state;
}
function message(
  state: Snapshot,
  events: LearningEvents,
  role: 'leo' | 'lærer' | 'system',
  text: string,
) {
  const p = state.preparedChapter!;
  state.messages.push({ role, text });
  state.messages = state.messages.slice(-12);
  events.messages.push({
    id: randomUUID(),
    role,
    text,
    meta: {
      experience: 'prepared',
      missionId: missions[Math.min(p.index, 2)].id,
      chapterVersion: 1,
      probeId: p.index === 2 ? 'SW19-divisor-roles' : null,
      mode: p.mode,
      assisted: p.assisted,
      evidence: p.evidence,
      source: p.source,
      probeRoles: p.probeRoles,
      prompt_version: promptVersion,
    },
  });
}
function registerAnswer(
  state: Snapshot,
  events: LearningEvents,
  correct: boolean,
  raw: unknown,
) {
  const p = state.preparedChapter!;
  if (!p.itemPersisted) {
    events.items.push({
      id: p.itemId,
      skill_id: [
        'div-deling-konkret',
        'figur-2d-egenskaper',
        'div-representasjoner',
      ][p.index],
      origin: 'generator',
      difficulty: 1,
      params: p.index === 0 ? { total: 24, b: 4 } : {},
      answer: checkedSolution(p.index),
      expression: p.index === 0 ? '24 / 4' : null,
      representation: p.index === 2 ? 'tall' : 'konkret',
      strategy: {
        package: 'prepared-star-wars-v1',
        mission: missions[p.index].id,
      },
      story_text: missions[p.index].question,
      visual_spec: { prepared: true },
      prompt_version: promptVersion,
      validated: true,
    });
    p.itemPersisted = true;
  }
  // K1 collects evidence, but these authored items do not award engine mastery or medallions.
  events.attempts.push({
    id: randomUUID(),
    item_id: p.itemId,
    answer_raw: JSON.stringify(raw),
    answer_parsed: raw,
    correct,
    credit: 0,
    hint_level_used: p.assisted ? 4 : 0,
    time_ms: Math.max(
      0,
      Math.min(
        3600000,
        Math.round(Date.now() - Date.parse(state.taskStartedAt)),
      ),
    ),
    input_mode: 'manipulativ',
    misconception_code: null,
    is_master_test: false,
  });
}
function markHelp(p: Progress, level: number) {
  p.assisted = true;
  p.mode = p.index === 0 ? 'teaching' : 'guided-practice';
  p.helpLevel = Math.min(3, level);
}
function finish(p: Progress) {
  p.status = 'correct';
  p.feedback = missions[p.index].success;
  if (!p.completed.some((c) => c.missionId === missions[p.index].id))
    p.completed.push({
      missionId: missions[p.index].id,
      assisted: p.assisted,
      evidence: p.evidence,
    });
}
export async function preparedTurn(input: {
  state: Snapshot;
  event: PreparedEvent | unknown;
  requestId: string;
  itemId: string;
  now: string;
  provider?: AiProvider | null;
  instructions?: string;
}) {
  const state = structuredClone(input.state),
    events = emptyEvents(),
    p = state.preparedChapter;
  if (state.seenEvents.includes(input.requestId))
    return { state, events, replayed: true };
  if (!p || !state.preparedActive || state.endedAt)
    throw Error('Start stjerneoppdraget først.');
  if (p.index > 2 || p.itemId !== input.itemId)
    throw Error('Oppgaven er endret. Hent siste versjon.');
  const event = eventSchema.parse(input.event);
  if (!mayContinue(state.clock, input.now) && event.type !== 'pause') {
    state.endedAt = input.now;
    state.preparedActive = false;
    p.teacher =
      'Øvingstiden er over. Arbeidet er lagret, så vi kan fortsette en annen gang.';
  } else if (event.type === 'pause') {
    state.endedAt = input.now;
    state.preparedActive = false;
    message(
      state,
      events,
      'system',
      'Stjerneoppdraget er satt på pause. Arbeid og hjelp er lagret.',
    );
  } else if (event.type === 'next') {
    if (p.status !== 'correct')
      throw Error('Fullfør oppgaven sammen med læreren først.');
    if (p.index === 2) {
      p.index = 3;
      state.preparedActive = false;
      state.endedAt = input.now;
    } else {
      state.preparedChapter = newProgress(p.index + 1, p.completed);
      state.taskStartedAt = input.now;
    }
  } else if (event.type === 'work') {
    if (p.status === 'correct') throw Error('Oppgaven er allerede fullført.');
    p.work = event.work;
    p.status = 'working';
    p.feedback = '';
  } else if (event.type === 'answer') {
    if (p.status === 'correct') throw Error('Oppgaven er allerede fullført.');
    const result = checkWork(p.index, p.work);
    p.numericCorrect = result.numericCorrect;
    p.modelCorrect = result.modelCorrect;
    p.status = result.correct ? 'correct' : 'incorrect';
    p.source = 'code';
    if (p.index === 2)
      p.evidence = result.correct ? 'relevant' : 'insufficient';
    p.feedback = result.correct
      ? missions[p.index].success
      : p.index === 0
        ? result.modelCorrect
          ? '↻ Fordelingen stemmer. Se på hvor mange brikker hvert skjold fikk, og rett tallet ditt.'
          : result.numericCorrect
            ? '↻ Tallsvaret stemmer. Fordel også de 24 brikkene likt mellom skjoldene.'
            : '↻ Se på brikkene som er igjen, og om skjoldene har like mye.'
        : p.index === 1
          ? '↻ Sammenlign platen og hjørnene med låsregelen.'
          : '↻ Se på hva 3-tallet teller på A og på B.';
    if (p.index === 2 && !result.correct) {
      if (p.followUps >= 1) {
        markHelp(p, 3);
        p.teacher = missions[2].hints[2];
      } else {
        p.followUps++;
        p.teacher =
          'Hva teller 3-tallet på panel B: sendere eller brikker i én pakke?';
      }
    }
    if (result.correct) finish(p);
    registerAnswer(state, events, result.correct, p.work);
    message(state, events, 'leo', JSON.stringify(p.work));
    message(state, events, 'lærer', p.feedback);
  } else if (event.type === 'guided-complete') {
    if (p.status === 'correct') throw Error('Oppgaven er allerede fullført.');
    if (p.helpLevel < 3) throw Error('Se forklaringen først.');
    markHelp(p, 3);
    p.work = {
      ...emptyWork(),
      ...(p.index === 0
        ? { groups: [6, 6, 6, 6] }
        : p.index === 1
          ? { plate: 'B', corners: [0, 1, 2, 3] }
          : { roleA: 'recipients', roleB: 'size', demonstration: 'one-pack' }),
    } as Work;
    p.modelCorrect = true;
    p.numericCorrect = p.index === 0 ? true : null;
    finish(p);
    registerAnswer(state, events, true, p.work);
    message(state, events, 'lærer', 'Vi fullførte sammen. ' + p.feedback);
  } else if (event.type === 'example') {
    markHelp(p, 2);
    p.source = 'code';
    p.teacher = missions[p.index].example;
    message(state, events, 'lærer', p.teacher);
  } else if (event.type === 'hint' || event.type === 'solution') {
    markHelp(p, event.type === 'solution' ? 3 : p.helpLevel + 1);
    p.source = 'code';
    p.teacher = missions[p.index].hints[Math.max(0, p.helpLevel - 1)];
    message(state, events, 'lærer', p.teacher);
  } else {
    if (p.status === 'correct' && event.type === 'probe')
      throw Error('Denne proben er fullført.');
    if (event.type === 'probe' && p.index !== 2)
      throw Error('Ingen slik probe her.');
    const probe = event.type === 'probe';
    // Assistance is recorded before any help response can be selected or displayed.
    if (!probe) markHelp(p, Math.max(1, p.helpLevel));
    const result = await selectTeaching({
      provider: input.provider ?? null,
      instructions: input.instructions ?? '',
      progress: p,
      text: event.text,
      probe,
      messages: state.messages,
    });
    p.source = result.source;
    message(
      state,
      events,
      'leo',
      result.accepted
        ? event.text
        : '[Svar skjermet eller ikke vurdert; bruk gjerne kortene.]',
    );
    if (result.decision?.safety) {
      p.teacher =
        'Fortell det til en trygg voksen, for eksempel mamma, pappa eller læreren din. Vi kan ta en pause.';
      events.flags.push({
        id: randomUUID(),
        type: 'utrygg',
        excerpt: 'Skjermet elevmelding i stjerneoppdrag.',
      });
    } else if (probe) {
      if (result.roles)
        p.probeRoles = {
          a: p.probeRoles.a || result.roles.a,
          b: p.probeRoles.b || result.roles.b,
        };
      p.evidence = result.decision?.evidence ?? 'not-assessed';
      if (p.evidence === 'relevant') {
        p.modelCorrect = true;
        finish(p);
        registerAnswer(state, events, true, {
          probe: 'SW19-divisor-roles',
          evidence: p.evidence,
        });
        p.teacher = 'Du skiller mellom antall sendere og brikker i hver pakke.';
      } else if (p.followUps >= 1) {
        markHelp(p, 3);
        p.teacher = missions[2].hints[2];
      } else {
        p.followUps++;
        p.teacher =
          result.source === 'fallback'
            ? 'Jeg kunne ikke vurdere ordene nå. Du kan vise forskjellen med kortene.'
            : p.probeRoles.b
              ? 'Hva betyr 3 på panel A? Du kan markere mottakerne eller bruke korte ord.'
              : 'Hva betyr 3 på panel B? Du kan svare med kortene eller bruke korte ord.';
      }
    } else {
      p.teacher =
        result.decision?.intent === 'example'
          ? missions[p.index].example
          : missions[p.index].hints[Math.max(0, p.helpLevel - 1)];
    }
    message(state, events, 'lærer', p.teacher);
  }
  state.revision++;
  state.seenEvents = [...state.seenEvents, input.requestId].slice(-200);
  return { state, events, replayed: false };
}
export function preparedView(state: Snapshot | null): PreparedView {
  const p = state?.preparedChapter ?? newProgress(),
    m = missions[Math.min(p.index, 2)];
  return {
    sessionId: state?.preparedChapter ? state.id : null,
    revision: state?.preparedChapter ? state.revision : 0,
    running: !!state?.preparedActive && !state.endedAt,
    finished: p.index === 3,
    missionId: m.id,
    index: p.index,
    title: m.title,
    scene: m.scene,
    opening: m.opening,
    question: m.question,
    expression: m.expression,
    mode: p.mode,
    work: p.work,
    status: p.status,
    helpLevel: p.helpLevel,
    feedback: p.feedback,
    teacher: p.teacher,
    assisted: p.assisted,
    evidence: p.evidence,
    source: p.source,
    probeId: p.index === 2 ? 'SW19-divisor-roles' : null,
  };
}
