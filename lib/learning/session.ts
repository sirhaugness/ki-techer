import { randomUUID } from 'node:crypto';
import {
  initialState,
  diagnosticState,
  recordAttempt,
  credit,
  confirmExplanation,
} from '../engine/mastery';
import {
  startSession,
  defaultSessionSettings,
  mayContinue,
  sessionPhase,
  sessionSettingsSchema,
} from '../engine/session';
import {
  progressForPart,
  finishMasterTest,
  canStartMasterTest,
} from '../engine/medallion';
import { skills, skillById } from '../engine/skills/graph';
import { generate, checkAnswer } from '../engine/skills/generators';
import { seededRng } from '../engine/random';
import { newHints, advanceHint } from '../engine/hints';
import { newBandit, forget, updateArm } from '../engine/bandit';
import { scheduleReview, serializeCard } from '../engine/scheduler';
import { detectMisconception, misconceptions } from '../engine/misconceptions';
import { executeTool, type AgentRuntime } from '../agent/tools';
import { fallbackResponse, runAgent } from '../agent/loop';
import { buildContext } from '../agent/context';
import { evaluateExplanation } from '../ai/evaluate';
import { guardResponse } from '../agent/guards';
import { privateText } from '../ai/moderation';
import type { AiProvider } from '../ai/provider';
import {
  emptyEvents,
  type Snapshot,
  type LearningEvent,
  type LearnerProfile,
  type Interest,
  type LearningView,
} from './types';

import { activeInterest, adventureTask, chapter } from '../profile/story';
import { teacherHelp, concreteHelp } from './help';
import { checkMultiplicationExpression } from '../engine/expression-answer';

const diagnosticSkills = [
  'mult-tabell-3-4',
  'div-deling-konkret',
  'mult-tabell-2-5-10',
  'div-maaling-konkret',
  'dobling-halvering',
  'likhetstegn',
  'mult-tabell-6-9',
  'div-som-omvendt-mult',
  'figur-2d-egenskaper',
  'mult-telling-grupper',
];
export function createSession(
  profile: LearnerProfile,
  previous: Snapshot | null,
  now: string,
  usedMinutes: number,
  mode: Snapshot['mode'],
  selectedPart: 1 | 2 | 3 | 4 | null,
): Snapshot {
  const settings = sessionSettingsSchema.parse({
    ...defaultSessionSettings,
    plannedMinutes: profile.settings.session_minutes ?? 15,
    dailyMaxMinutes: profile.settings.daily_max_minutes ?? 30,
    allowedStartMinute: profile.settings.allowed_start_minute ?? 0,
    allowedEndMinute: profile.settings.allowed_end_minute ?? 1440,
  });
  const states = structuredClone(previous?.states ?? {});
  const parts = ([1, 2, 3, 4] as const).map((id) =>
    progressForPart(
      id,
      states,
      previous?.parts.find((p) => p.id === id) ?? null,
    ),
  );
  if (
    selectedPart &&
    parts.find((p) => p.id === selectedPart)?.status === 'låst'
  )
    throw new Error('Velg en tilgjengelig del av kartet.');
  if (
    mode === 'master' &&
    (!selectedPart ||
      !canStartMasterTest(
        parts.find((p) => p.id === selectedPart)!,
        now,
      ))
  )
    throw new Error('Mesterutfordringen kan tas tidligst neste dag.');
  return {
    version: 1,
    storyProgress: structuredClone(previous?.storyProgress ?? {}),
    helpHistory: [],
    revision: 0,
    id: randomUUID(),
    clock: startSession(settings, now, usedMinutes),
    mode,
    states,
    parts,
    cards: previous?.cards ?? {},
    bandit: forget(previous?.bandit ?? newBandit()),
    history: [],
    active: null,
    hints: newHints(),
    focusSkillId: null,
    selectedPart,
    masterTest: null,
    masterAnswers: [],
    diagnosticIndex: 0,
    diagnosticDifficulty: 2,
    diagnosticComplete: previous?.diagnosticComplete ?? false,
    usedInterests: [],
    seenEvents: [],
    messages: [],
    response: {
      ...fallbackResponse(),
      speech:
        mode === 'diagnostic'
          ? 'Vi blir kjent med matte sammen. Det er helt greit å prøve seg frem.'
          : 'Velkommen tilbake. Hvordan kjennes dagen i dag?',
    },
    endedAt: null,
    taskStartedAt: now,
    correct: null,
    pauseOffered: false,
    celebration: null,
    moodStart: null,
    moodEnd: null,
    schoolTopics:
      previous?.schoolTopics.filter(
        (t) => Date.parse(t.expiresAt) > Date.parse(now),
      ) ?? [],
    pendingObservations: [],
  };
}
export async function learningTurn(
  original: Snapshot,
  event: LearningEvent,
  eventId: string,
  now: string,
  profile: LearnerProfile,
  interests: Interest[],
  provider: AiProvider | null,
  instructions: string,
  observations: import('../profile/rules').Observation[] = [],
) {
  const state = structuredClone(original),
    events = emptyEvents();
  if (state.seenEvents.includes(eventId))
    return { state, events, replayed: true };
  state.fallbackMode = !provider;
  state.celebration = null;
  if (state.endedAt) throw new Error('Økten er allerede avsluttet.');
  const phase = sessionPhase(state.clock, now);
  const runtime: AgentRuntime = {
    storyProgress: state.storyProgress,
    taskCreationAllowed: event.type === 'next' || event.type === 'mood',
    masterStartAllowed: state.mode === 'master',
    context: {
      states: state.states,
      clock: state.clock,
      now,
      phase:
        phase === 'hovedøkt'
          ? 'hovedøkt'
          : phase === 'blandet_utfordring'
            ? 'blandet_utfordring'
            : 'oppvarming',
      selectedPart: state.selectedPart ?? undefined,
      history: state.history,
      focusSkillId: state.focusSkillId,
      bandit: state.bandit,
      schoolTopics: state.schoolTopics,
    },
    rng: seededRng(
      Number.parseInt(eventId.replaceAll('-', '').slice(0, 8), 16),
    ),
    uuid: randomUUID,
    provider,
    active: state.active,
    states: state.states,
    parts: state.parts,
    masterTest: state.masterTest,
    interests,
    usedInterests: state.usedInterests,
    pendingObservations: state.pendingObservations,
    schoolTopics: state.schoolTopics,
    visual: null,
    ended: false,
    pauseOffered: state.pauseOffered,
  };
  const flag = async (type: string) => {
    events.flags.push({
      id: randomUUID(),
      type,
      excerpt: 'Innhold skjermet av sikkerhetskontrollen.',
    });
  };
  const logTool = async (
    name: string,
    args: unknown,
    result: unknown,
    latency: number,
  ) => {
    events.tools.push({
      id: randomUUID(),
      tool: name,
      args,
      result,
      ok: (result as { ok: boolean }).ok,
      latency_ms: latency,
    });
  };
  const invokeAgent = async (text?: string) => {
    const context = buildContext({
      learner: {
        firstName: profile.firstName,
        grade: profile.grade,
        tutorName: profile.tutorName,
      },
      engine: runtime.context,
      active: runtime.active?.item ?? null,
      allowedHintLevel: state.hints.level,
      taskText: runtime.active?.text,
      lastAnswer: state.lastAnswer,
      helpHistory: state.helpHistory,
      answerResult: state.correct,
      observations,
      messages: state.messages,
    });
    const result = await runAgent({
      runtime,
      context,
      instructions,
      text,
      allowedHintLevel: state.hints.level,
      logTool,
      flag,
    });
    if (result.fallback) state.fallbackMode = true;
    if (text) {
      const shown =
        result.response.safety_flag === 'upassende' || privateText(text)
          ? '[Tekst skjermet av sikkerhetskontrollen]'
          : text;
      const message = { role: 'leo', text: shown };
      state.messages = [...state.messages, message].slice(-12);
      events.messages.push({
        id: randomUUID(),
        ...message,
        meta: { prompt_version: 'tutor.v1' },
      });
    }
    return result;
  };
  const nextTask = async () => {
    if (runtime.active && !runtime.active.resolved)
      throw new Error('Prøv den aktive oppgaven først.');
    state.hints = newHints();
    state.correct = null;
    state.taskStartedAt = now;
    if (state.mode === 'diagnostic') {
      if (state.diagnosticIndex >= diagnosticSkills.length) {
        state.diagnosticComplete = true;
        runtime.ended = true;
        state.response = {
          ...fallbackResponse('avslutt'),
          speech:
            'Nå har vi blitt bedre kjent. Neste gang utforsker vi kartet sammen.',
        };
        return;
      }
      const item = generate(
        diagnosticSkills[state.diagnosticIndex],
        state.diagnosticDifficulty,
        runtime.rng,
        runtime.active?.item,
      );
      runtime.active = {
        id: randomUUID(),
        item,
        text: item.question,
        representation: 'konkret',
        strategy: {},
        resolved: false,
      };
      state.response = fallbackResponse('ny_oppgave');
      return;
    }
    if (state.mode === 'master') {
      if (!runtime.masterTest) {
        const result = await executeTool(runtime, 'start_mesterprøve', {
          part_id: state.selectedPart,
        });
        if (!result.ok) throw new Error(String(result.result));
        const test = runtime.masterTest!;
        events.masterTests.push({
          id: test.id,
          part_id: test.part,
          item_ids: test.items.map((i) => i.id),
          score: null,
          passed: null,
        });
      }
      const test = runtime.masterTest!;
      const task = test.items[state.masterAnswers.length];
      if (!task) return;
      const item = generate(task.skillId, 3, runtime.rng, runtime.active?.item);
      runtime.active = {
        id: task.id,
        item,
        text: item.question,
        representation: 'tall',
        strategy: {},
        resolved: false,
      };
      state.response = {
        ...fallbackResponse('ny_oppgave'),
        speech:
          'Prøv på egen hånd. Vi ser på det sammen når utfordringen er ferdig.',
      };
      return;
    }
    const ai = await invokeAgent();
    state.response = ai.response;
    if (runtime.ended) return;
    if (!runtime.active || runtime.active.resolved) {
      const result = await executeTool(runtime, 'hent_kandidater', {});
      const candidates = result.result as {
        skill_id: string;
        foreslått_vanskegrad: number;
        anbefalt_strategi: Record<string, string>;
      }[];
      const candidate = candidates[0];
      if (!candidate) {
        runtime.pauseOffered = true;
        state.response = {
          ...fallbackResponse('foreslå_pause'),
          speech: 'La oss ta en rolig pause. Du kan avslutte for i dag.',
        };
        return;
      }
      const interest = activeInterest(interests);
      await executeTool(runtime, 'lag_oppgave', {
        skill_id: candidate.skill_id,
        vanskegrad: candidate.foreslått_vanskegrad,
        interesse_id: interest?.id ?? null,
        representasjon: candidate.anbefalt_strategi.representasjon,
        kontekst_stil: interest ? 'interessefortelling' : 'ren_oppgave',
        begrunnelse: 'Motorens anbefalte neste øvingsoppgave.',
      });
      state.response = fallbackResponse('ny_oppgave');
    }
    state.focusSkillId ??= runtime.active?.item.skillId ?? null;
  };
  if (!mayContinue(state.clock, now)) {
    runtime.ended = true;
    state.response = fallbackResponse('avslutt');
  } else if (event.type === 'mood') {
    state.moodStart = event.mood;
    await nextTask();
  } else if (event.type === 'next') await nextTask();
  else if (event.type === 'school') {
    if (state.mode === 'master')
      throw new Error('Skoletema kan noteres etter utfordringen.');
    if (event.text) {
      const result = await executeTool(runtime, 'noter_skoletema', {
        leo_sa: event.text,
      });
      await logTool('noter_skoletema', {}, result, 0);
      state.response = {
        ...fallbackResponse(),
        speech: result.ok
          ? String(result.result)
          : 'Vi kunne ikke notere temaet. Du kan fortsette å øve.',
      };
    } else
      state.response = {
        ...fallbackResponse(),
        speech: 'Det er helt greit. Vi utforsker matte sammen.',
      };
  } else if (event.type === 'hint' || event.type === 'ask') {
    const active = runtime.active;
    if (!active) throw new Error('Velg en oppgave først.');
    if (!active.resolved)
      state.hints = advanceHint(state.hints, { id: eventId, type: 'request' });
    const text = event.type === 'ask' ? event.text : 'Jeg forstår ikke';
    const context = buildContext({
      learner: {
        firstName: profile.firstName,
        grade: profile.grade,
        tutorName: profile.tutorName,
      },
      engine: runtime.context,
      active: active.item,
      taskText: active.text,
      lastAnswer: state.lastAnswer,
      helpHistory: state.helpHistory,
      allowedHintLevel: state.hints.level,
      answerResult: state.correct,
      observations,
      messages: state.messages,
    });
    const result = await teacherHelp({
      provider,
      task: active,
      text,
      level: state.hints.level,
      context,
      instructions,
    });
    state.response = result.response;
    if (result.fallback) state.fallbackMode = true;
    state.helpHistory = [
      ...(state.helpHistory ?? []),
      {
        itemId: active.id,
        question: result.text,
        reply: result.response.speech,
      },
    ].slice(-12);
    const message = { role: 'leo', text: result.text };
    state.messages = [...state.messages, message].slice(-12);
    events.messages.push({
      id: randomUUID(),
      ...message,
      meta: {
        kind: 'question',
        item_id: active.id,
        hint_level_used: state.hints.level,
      },
    });
    if (result.text.startsWith('[Spørsmål')) await flag('upassende');
  } else if (event.type === 'answer') {
    const active = runtime.active;
    if (!active || active.resolved || active.id !== event.itemId)
      throw new Error('Denne oppgaven er ikke aktiv lenger.');
    const compound =
      typeof event.answer === 'object' &&
      !Array.isArray(event.answer) &&
      'value' in event.answer
        ? event.answer
        : null;
    const numericCorrect = checkAnswer(
      active.item,
      compound ? compound.value : event.answer,
    );
    const correct =
      numericCorrect &&
      (!active.expressionRequired ||
        (!!compound &&
          checkMultiplicationExpression(
            compound.expression,
            Number(active.item.params.a),
            Number(active.item.params.b),
          )));
    const hint = state.hints.level;
    state.lastAnswer = event.answer;
    state.lastAnswerCorrect = numericCorrect;
    state.correct = correct;
    const timeMs = Math.max(
      0,
      Date.parse(now) - Date.parse(state.taskStartedAt),
    );
    const misconception = detectMisconception(
      event.answer,
      active.item.commonWrongAnswers,
    );
    events.attempts.push({
      id: eventId,
      item_id: active.id,
      answer_raw: JSON.stringify(event.answer),
      answer_parsed: event.answer,
      correct,
      credit: credit(correct, hint),
      hint_level_used: hint,
      time_ms: timeMs,
      input_mode: event.inputMode,
      misconception_code: misconception,
      is_master_test: state.mode === 'master',
    });
    if (misconception)
      events.misconceptions.push({
        skill_id: active.item.skillId,
        code: misconception,
        description: misconceptions[misconception].description,
      });
    if (correct && active.interestId) {
      state.storyProgress ??= {};
      const progress = state.storyProgress[active.interestId] ?? {
        completed: 0,
        part: state.selectedPart,
      };
      state.storyProgress[active.interestId] = {
        completed: progress.completed + 1,
        part: state.selectedPart,
      };
    }
    if (state.mode === 'master') {
      active.resolved = true;
      state.masterAnswers.push({ itemId: active.id, correct, hintLevel: hint });
      if (state.masterAnswers.length === runtime.masterTest!.items.length) {
        const test = runtime.masterTest!,
          part = runtime.parts.find((p) => p.id === test.part)!;
        const result = finishMasterTest(part, test, state.masterAnswers, now);
        runtime.parts = runtime.parts.map((p) =>
          p.id === test.part ? result.progress : p,
        );
        events.masterTests.push({
          id: test.id,
          part_id: test.part,
          item_ids: test.items.map((i) => i.id),
          score: result.score,
          passed: result.passed,
        });
        runtime.ended = true;
        state.celebration = result.passed
          ? runtime.parts.every((p) => p.awardedAt)
            ? 'Hele mattemedaljongen er din!'
            : `Du har fått del ${test.part} av medaljongen!`
          : null;
        state.response = {
          ...fallbackResponse('avslutt'),
          speech: result.passed
            ? 'Du holdt ut og viste det du kan. Nå lyser en ny del av medaljongen.'
            : 'Du fikk til mye. Vi øver på det vanskelige, og prøver igjen en annen dag.',
        };
      } else
        state.response = {
          ...fallbackResponse(),
          speech: 'Takk for svaret. Nå kan du prøve neste oppgave.',
        };
    } else if (state.mode === 'diagnostic') {
      active.resolved = true;
      const previous = state.states[active.item.skillId];
      if (!previous?.masteredAt)
        runtime.states[active.item.skillId] = diagnosticState(
          correct && hint === 0 ? state.diagnosticDifficulty - 1 : -1,
        );
      state.diagnosticDifficulty = Math.max(
        1,
        Math.min(5, state.diagnosticDifficulty + (correct ? 1 : -1)),
      ) as 1 | 2 | 3 | 4 | 5;
      state.diagnosticIndex++;
      state.response = {
        ...fallbackResponse(),
        speech: 'Takk for at du prøvde. Vi utforsker en ny oppgave sammen.',
      };
    } else {
      const previous = runtime.states[active.item.skillId] ?? initialState();
      let next = recordAttempt(previous, {
        id: eventId,
        at: now,
        difficulty: active.item.difficulty,
        correct,
        hintLevel: hint,
      });
      runtime.states[active.item.skillId] = next;
      if (!previous.masteredAt && next.masteredAt)
        state.celebration = `Du har mestret ${skillById(active.item.skillId).title}!`;
      if (next.masteredAt) {
        const card = scheduleReview(
          state.cards[active.item.skillId] ?? null,
          now,
          { correct, hintLevel: hint, timeMs, medianMs: null },
        );
        state.cards[active.item.skillId] = serializeCard(card);
        next.nextReviewAt = card.due.toISOString();
      }
      runtime.context.history = [
        ...state.history,
        {
          skillId: active.item.skillId,
          difficulty: active.item.difficulty as 1 | 2 | 3 | 4 | 5,
          representation: active.representation,
          correct,
          phase: runtime.context.phase,
        },
      ];
      state.history = runtime.context.history as typeof state.history;
      for (const [dimension, arm] of Object.entries(active.strategy))
        if (
          dimension in state.bandit &&
          state.bandit[dimension as keyof typeof state.bandit].some(
            (a) => a.name === arm,
          )
        )
          state.bandit[dimension as keyof typeof state.bandit] = updateArm(
            state.bandit[dimension as keyof typeof state.bandit],
            arm,
            credit(correct, hint) * 0.5,
          );
      state.hints = advanceHint(state.hints, {
        id: eventId,
        type: correct ? 'correct' : 'wrong',
      });
      active.resolved = correct;
      const result = await invokeAgent();
      if (correct && result.fallback) {
        const claimArgs = {
          skill_id: active.item.skillId,
          begrunnelse:
            'Regelstyrt lærer: kontrollerte selvstendige svar viser fremgang.',
        };
        const claim = await executeTool(runtime, 'foreslå_mestring', claimArgs);
        await logTool('foreslå_mestring', claimArgs, claim, 0);
      }
      next = runtime.states[active.item.skillId];
      if (!previous.masteredAt && next.masteredAt) {
        state.celebration = `Du har mestret ${skillById(active.item.skillId).title}!`;
        if (!state.cards[active.item.skillId]) {
          const card = scheduleReview(null, now, {
            correct,
            hintLevel: hint,
            timeMs,
            medianMs: null,
          });
          state.cards[active.item.skillId] = serializeCard(card);
          next.nextReviewAt = card.due.toISOString();
        }
      }
      state.response = result.fallback
        ? correct
          ? fallbackResponse('ros')
          : {
              ...fallbackResponse(),
              speech:
                active.expressionRequired && numericCorrect
                  ? 'Tallsvaret stemmer! Skriv et regnestykke som viser gruppene i oppgaven.'
                  : concreteHelp(
                      active,
                      Math.max(1, state.hints.level),
                      'Jeg forstår ikke',
                    ),
            }
        : result.response;
    }
  } else if (event.type === 'explain') {
    if (state.mode === 'master')
      throw new Error('Forklaringer tar vi etter mesterutfordringen.');
    if (!runtime.active) throw new Error('Velg en oppgave først.');
    const result = await evaluateExplanation(
      provider,
      event.text,
      runtime.active.item.question,
    );
    // A rubric cannot replace answer evidence; preserve data criterion and
    // attach understanding only after the independently correct, unaided answer.
    const skillState = runtime.states[runtime.active.item.skillId];
    const attempt = skillState?.recent.at(-1);
    if (
      state.mode === 'practice' &&
      result.forstaelse === 2 &&
      state.correct &&
      state.hints.level === 0 &&
      skillState &&
      attempt
    )
      runtime.states[runtime.active.item.skillId] = confirmExplanation(
        skillState,
        attempt.id,
        result.forstaelse,
        now,
      );
    const candidate = { ...fallbackResponse(), speech: result.tilbakemelding };
    state.response =
      guardResponse(candidate, runtime.active.item, state.hints.level) ??
      fallbackResponse();
    const reply = await invokeAgent(event.text);
    if (!reply.fallback) state.response = reply.response;
  } else if (event.type === 'end') {
    state.moodEnd = event.mood;
    if (event.reflection) {
      const reply = await invokeAgent(event.reflection);
      if (reply.response.safety_flag !== 'ingen')
        state.response = reply.response;
    }
    runtime.ended = true;
    state.response = fallbackResponse('avslutt');
  }
  if (runtime.active && runtime.active.id !== original.active?.id) {
    const interest = activeInterest(interests);
    if (interest) {
      const completed = state.storyProgress?.[interest.id]?.completed ?? 0;
      const adventure = adventureTask(
        runtime.active.item,
        interest.label,
        completed,
      );
      runtime.active.text =
        state.mode === 'practice'
          ? adventure.text
          : adventure.text
              .replace(' b) Skriv et regnestykke som viser dette.', '')
              .replace(' a) ', ' ');
      runtime.active.expressionRequired =
        adventure.expressionRequired && state.mode === 'practice';
      runtime.active.interestId = interest.id;
      runtime.active.interestLabel = interest.label;
      runtime.active.storyCompleted = completed;
      state.response = {
        ...state.response,
        speech:
          'Oppdraget venter! Prøv det første steget, eller spør meg om hjelp.',
      };
    }
    state.lastAnswerCorrect = undefined;
  }
  if (event.type === 'answer' && state.correct && !state.celebration) {
    const praise = [
      'Ja! Du fant veien videre!',
      'Det stemmer! Du fikk gruppene til å passe.',
      'Riktig! Du prøvde og løste oppdraget.',
    ];
    state.response = {
      ...state.response,
      speech:
        praise[
          (state.storyProgress?.[runtime.active?.interestId ?? '']?.completed ??
            state.revision) % praise.length
        ],
    };
  }
  state.active = runtime.active;
  state.states = runtime.states;
  state.parts = runtime.parts.map((p) =>
    progressForPart(p.id, state.states, p),
  );
  state.masterTest = runtime.masterTest;
  state.pauseOffered = runtime.pauseOffered;
  state.usedInterests = runtime.usedInterests;
  state.pendingObservations = runtime.pendingObservations;
  state.schoolTopics = runtime.schoolTopics;
  if (runtime.ended) state.endedAt = now;
  state.seenEvents = [...state.seenEvents, eventId].slice(-128);
  state.revision++;
  if (state.active && state.active.id !== original.active?.id) {
    const a = state.active;
    events.items.push({
      id: a.id,
      skill_id: a.item.skillId,
      origin: Object.keys(a.item.params).length ? 'generator' : 'modell',
      difficulty: a.item.difficulty,
      params: a.item.params,
      answer: a.item.answer,
      expression: a.item.expression,
      representation: a.representation,
      strategy: a.strategy,
      story_text: a.text,
      visual_spec: { representationHints: a.item.representationHints },
      prompt_version: 'tutor.v1',
      validated: true,
    });
  }
  const message = { role: 'lærer', text: state.response.speech };
  state.messages = [...state.messages, message].slice(-12);
  events.messages.push({
    id: randomUUID(),
    ...message,
    meta: {
      prompt_version: 'tutor.v1',
      action: state.response.action,
      hint_level_used: state.response.hint_level_used,
    },
  });
  for (const topic of state.schoolTopics.filter(
    (t) => !original.schoolTopics.some((old) => old.rawText === t.rawText),
  ))
    events.schoolTopics.push({
      raw_text: topic.rawText,
      mapped_skill_ids: topic.skillIds,
      confidence: topic.confidence,
      expires_at: topic.expiresAt,
    });
  return { state, events, replayed: false };
}
export function publicView(state: Snapshot): LearningView {
  const a = state.active,
    item = a?.item,
    params = item?.params ?? {};
  const division = item?.skillId.startsWith('div-') ?? false;
  const type =
    item?.representationHints.find((h) =>
      [
        'grupper',
        'rutenett',
        'tallinje',
        'tierblokker',
        'figur2d',
        'figur3d',
      ].includes(h),
    ) ?? (division ? 'grupper' : 'rutenett');
  return {
    id: state.id,
    helpHistory: state.helpHistory ?? [],
    lastAnswerCorrect: state.lastAnswerCorrect,
    adventure: state.active?.interestId
      ? chapter(
          [
            {
              id: state.active.interestId,
              label: state.active.interestLabel ?? '',
              active: true,
            },
          ],
          state.storyProgress?.[state.active.interestId]?.completed ?? 0,
          state.selectedPart,
        )
      : undefined,
    fallbackMode: state.fallbackMode ?? false,
    revision: state.revision,
    mode: state.mode,
    task:
      a && item
        ? {
            id: a.id,
            expressionRequired: a.expressionRequired ?? false,
            illustrationSafe: [
              'mult-telling-grupper',
              'mult-tabell-2-5-10',
              'mult-tabell-3-4',
              'mult-tabell-6-9',
              'div-deling-konkret',
              'div-maaling-konkret',
              'div-representasjoner',
              'div-rutenett',
            ].includes(item.skillId),
            question: a.text,
            answerType: item.answerType,
            choices: item.choices ?? [],
            resolved: a.resolved,
            skillTitle: skillById(item.skillId).title,
            showVisual: a.representation !== 'tall',
            visual: {
              type: item?.skillId === 'div-maaling-konkret' ? 'maaling' : type,
              count:
                typeof params.total === 'number'
                  ? params.total
                  : typeof params.a === 'number' && typeof params.b === 'number'
                    ? params.a * params.b
                    : typeof params.number === 'number'
                      ? params.number
                      : typeof params.count === 'number'
                        ? params.count
                        : 0,
              groups:
                item.skillId.startsWith('mult-') && typeof params.a === 'number'
                  ? params.a
                  : typeof params.b === 'number'
                    ? params.b
                    : 1,
              shape: typeof params.shape === 'string' ? params.shape : null,
              steps: Array.isArray(params.steps) ? params.steps : [],
            },
          }
        : null,
    speech: state.response.speech,
    parts: state.parts,
    ended: !!state.endedAt,
    correct: state.correct,
    hintLevel: state.hints.level,
    pauseOffered: state.pauseOffered,
    celebration: state.celebration,
    diagnosticComplete: state.diagnosticComplete,
    masterProgress: state.masterTest
      ? {
          done: state.masterAnswers.length,
          total: state.masterTest.items.length,
        }
      : null,
  };
}
export function stateSummary(state: Snapshot) {
  return `Økten hadde ${state.history.length} øvingssvar. Leo prøvde ${new Set(state.history.map((h) => h.skillId)).size} ferdigheter.`;
}
export { skills };
