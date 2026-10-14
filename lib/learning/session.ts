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
import { generate, answerSchema } from '../engine/skills/generators';
import { seededRng } from '../engine/random';
import { bindStoryProblem } from '../engine/story-problem';
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
import { judgeTaskAnswer, missionBudget } from '../engine/mission';
import { routePayoff, fallbackAsset } from './storyboard';
import { recordStorySuccess } from './story-planner';
import { legacyScene } from './legacy-scene';
import {
  planAdventure,
  upgradeAdventurePresentation,
  adventureView,
  type AdventureEvidence,
} from './adventure';

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
  const adventures = structuredClone(previous?.adventures ?? {});
  const lastAdventure = previous?.active?.interestId
    ? adventures[previous.active.interestId]
    : undefined;
  if (
    lastAdventure &&
    previous?.active &&
    lastAdventure.tasks[lastAdventure.index]?.id === previous.active.id
  ) {
    if (!previous.active.resolved || lastAdventure.pendingChoice)
      lastAdventure.paused = {
        active: structuredClone(previous.active),
        hints: structuredClone(previous.hints),
        lastAnswer: previous.lastAnswer,
        correct: previous.correct,
        lastAnswerCorrect: previous.lastAnswerCorrect,
      };
    else lastAdventure.index++;
  }
  return {
    version: 1,
    universeResearch: structuredClone(previous?.universeResearch ?? {}),
    storyProgress: structuredClone(previous?.storyProgress ?? {}),
    adventures,
    learningEvidence: structuredClone(previous?.learningEvidence ?? []),
    helpHistory: structuredClone(previous?.helpHistory ?? []),
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
  onProgress?: (message: string) => void,
  onResearch?: (
    interestId: string,
    research: import('../ai/provider').UniverseResearch,
  ) => Promise<void>,
) {
  const state = structuredClone(original),
    events = emptyEvents();
  let resumedItem = false;
  if (state.seenEvents.includes(eventId))
    return { state, events, replayed: true };
  upgradeSavedPresentation(state);
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
      taskText: `${runtime.active?.storyContext ?? ''} ${runtime.active?.text ?? ''}`,
      lastAnswer: state.lastAnswer,
      helpHistory: state.helpHistory?.filter(
        (h) => h.itemId === runtime.active?.id,
      ),
      answerResult: state.correct,
      numericCorrect: state.lastAnswerCorrect,
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
    const interest = activeInterest(interests);
    if (state.mode === 'practice' && interest) {
      state.adventures ??= {};
      let adventure = state.adventures[interest.id];
      if (
        runtime.active?.interestId &&
        runtime.active.interestId !== interest.id
      ) {
        const old = state.adventures[runtime.active.interestId];
        if (old)
          old.paused = {
            active: runtime.active,
            hints: state.hints,
            lastAnswer: state.lastAnswer,
            correct: state.correct,
            lastAnswerCorrect: state.lastAnswerCorrect,
          };
        runtime.active = null;
      }
      if (adventure?.paused) {
        const paused = adventure.paused;
        runtime.active = paused.active;
        resumedItem = true;
        state.hints = paused.hints;
        state.lastAnswer = paused.lastAnswer;
        state.correct = paused.correct;
        state.lastAnswerCorrect = paused.lastAnswerCorrect;
        delete adventure.paused;
        state.response = {
          ...fallbackResponse(),
          speech: 'Vi fortsetter der du slapp. Vennene dine venter på deg.',
        };
        return;
      }
      if (runtime.active && !runtime.active.resolved)
        throw new Error('Prøv den aktive oppgaven først.');
      if (adventure?.pendingChoice) throw new Error('Velg veien videre først.');
      if (
        adventure &&
        runtime.active?.id === adventure.tasks[adventure.index]?.id
      )
        adventure.index++;
      if (!adventure || adventure.index >= adventure.tasks.length) {
        adventure = await planAdventure({
          label: interest.label,
          interestId: interest.id,
          previous: adventure,
          context: runtime.context,
          provider,
          uuid: randomUUID,
          seed: Number.parseInt(eventId.replaceAll('-', '').slice(0, 8), 16),
          learningEvidence: state.learningEvidence,
          onProgress,
          research: state.universeResearch?.[interest.id],
          onResearch: async (research) => {
            state.universeResearch = {
              ...state.universeResearch,
              [interest.id]: research,
            };
            await onResearch?.(interest.id, research);
          },
        });
        state.adventures[interest.id] = adventure;
        if (adventure.source === 'fallback') state.fallbackMode = true;
      }
      state.hints = newHints();
      state.correct = null;
      state.lastAnswer = undefined;
      state.lastAnswerCorrect = undefined;
      state.helpKind = undefined;
      state.taskStartedAt = now;
      runtime.active = structuredClone(adventure.tasks[adventure.index]);
      if (runtime.active.scene) {
        runtime.active.scene.previousEvent =
          adventure.index > 0
            ? adventure.outcomes?.[adventure.index - 1]
            : adventure.saga?.chapters
                .filter((c) => c.number < adventure.number)
                .at(-1)
                ?.events.at(-1)?.outcome;
        if (
          adventure.story &&
          adventure.route &&
          runtime.active.scene.id === adventure.story.decision.payoffMission
        ) {
          const option =
            adventure.story.decision.options[adventure.route.option];
          runtime.active.scene.before = option.laterScene;
          runtime.active.scene.success = option.laterSuccess;
          runtime.active.scene.branch = option.consequence;
          adventure.route.used = true;
        }
        runtime.active.storyContext = `${runtime.active.scene.before} ${runtime.active.scene.speaker}: ${runtime.active.scene.dialogue} ${runtime.active.scene.purpose}`;
      }
      if (
        !adventure.story &&
        adventure.route &&
        (adventure.index >= 4 || adventure.number > 1)
      ) {
        runtime.active.text = `${adventure.route.consequence} ${runtime.active.text}`;
        adventure.route.used = true;
      }
      state.focusSkillId ??= runtime.active.item.skillId;
      state.response = {
        ...fallbackResponse('ny_oppgave'),
        speech:
          adventure.index === 0
            ? adventure.plan.opening
            : (adventure.plan.missions[adventure.index].dialogue ??
              'Spør meg hvis du vil ha hjelp.'),
      };
      return;
    }
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
  else if (event.type === 'choice') {
    const active = runtime.active;
    const adventure = active?.interestId
      ? state.adventures?.[active.interestId]
      : undefined;
    if (
      !active ||
      active.id !== event.itemId ||
      !active.resolved ||
      !adventure?.pendingChoice
    )
      throw new Error('Dette valget er ikke aktivt.');
    const choice = adventure.plan.choices[event.option];
    const budget = missionBudget(active.item)!,
      cost =
        adventure.story?.decision.options[event.option].cost ??
        Math.max(0, budget - event.option - 1);
    if (
      cost > budget ||
      (active.interaction && event.remaining !== budget - cost)
    ) {
      adventure.choiceError =
        'Se på forsyningene dere har, og ta bort det ruten bruker. Prøv igjen. Du beholder alt.';
      state.response = {
        ...fallbackResponse('hint'),
        speech: adventure.choiceError,
      };
    } else {
      adventure.pendingChoice = false;
      delete adventure.choiceError;
      adventure.choices = [...adventure.choices, choice.label].slice(-12);
      const consequence = `${choice.consequence} Dere bruker ${cost} ${active.interaction?.object ?? adventure.plan.cargo} og har ${budget - cost} igjen.`;
      adventure.route = {
        option: event.option,
        label: choice.label,
        asset:
          choice.asset ??
          fallbackAsset(active.interestLabel ?? '', event.option),
        consequence: choice.consequence,
        budget,
        cost,
        remaining: budget - cost,
        used: false,
      };
      adventure.memory = [...adventure.memory, consequence].slice(-24);
      adventure.outcomes ??= [];
      adventure.outcomes[adventure.index] = consequence;
      if (adventure.saga && adventure.story) {
        const option = adventure.story.decision.options[event.option];
        adventure.saga.inventory = [
          ...new Set([...adventure.saga.inventory, option.assetName]),
        ];
        adventure.saga.chapters
          .find((c) => c.number === adventure.number)!
          .choices.push(consequence);
      }
      if (adventure.world) {
        adventure.world.lastEvent = consequence;
        if (
          !adventure.world.inventory.some(
            (i) => i.asset === adventure.route!.asset,
          )
        )
          adventure.world.inventory.push({
            asset: adventure.route.asset,
            chapter: adventure.number,
            description: choice.consequence,
          });
        if (['pilot', 'companion'].includes(adventure.route.asset))
          adventure.world.companions = [
            ...new Set([...adventure.world.companions, choice.consequence]),
          ].slice(-12);
      }
      state.response = { ...fallbackResponse('ros'), speech: consequence };
    }
  } else if (event.type === 'school') {
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
    state.helpKind = /tekst|ordet|ordene|lese|betyr/i.test(text)
      ? 'text'
      : /regne|gange|dele|feil/i.test(text)
        ? 'calculation'
        : 'general';
    const context = buildContext({
      learner: {
        firstName: profile.firstName,
        grade: profile.grade,
        tutorName: profile.tutorName,
      },
      engine: runtime.context,
      active: active.item,
      taskText: `${active.storyContext ?? ''} ${active.text}`,
      lastAnswer: state.lastAnswer,
      helpHistory: state.helpHistory?.filter(
        (h) => h.itemId === runtime.active?.id,
      ),
      allowedHintLevel: state.hints.level,
      answerResult: state.correct,
      numericCorrect: state.lastAnswerCorrect,
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
      lastAnswer: state.lastAnswer,
      numericCorrect: state.lastAnswerCorrect,
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
    const judgement = judgeTaskAnswer(active, event.answer);
    const { numericCorrect, correct } = judgement;
    const compound =
      typeof event.answer === 'object' &&
      !Array.isArray(event.answer) &&
      'value' in event.answer
        ? event.answer
        : null;
    const hint = state.hints.level;
    state.lastAnswer = event.answer;
    state.lastAnswerCorrect = numericCorrect;
    state.correct = correct;
    if (state.mode === 'practice') {
      const evidence: AdventureEvidence = {
        itemId: active.id,
        skillId: active.item.skillId,
        difficulty: active.item.difficulty,
        answer: event.answer,
        expression: judgement.expression,
        correct,
        numericCorrect,
        hintLevel: hint,
        helpKind: state.helpKind,
        issue: !judgement.groupingCorrect
          ? 'calculation'
          : numericCorrect
            ? correct
              ? 'none'
              : 'notation'
            : state.helpKind === 'text'
              ? 'text'
              : 'calculation',
        support: hint > 0 ? 'supported' : 'independent',
      };
      state.learningEvidence = [
        ...(state.learningEvidence ?? []),
        evidence,
      ].slice(-180);
      const adventure = active.interestId
        ? state.adventures?.[active.interestId]
        : undefined;
      if (adventure) {
        adventure.evidence = [...adventure.evidence, evidence].slice(-180);
        if (correct) {
          adventure.tasks[adventure.index].resolved = true;
          const outcome =
            active.scene?.success ??
            (adventure.index === 4 && adventure.route
              ? routePayoff(
                  adventure.route.asset,
                  adventure.tasks[adventure.index]?.interestLabel,
                ).outcome
              : adventure.plan.missions[adventure.index].outcome);
          adventure.outcomes ??= [];
          adventure.outcomes[adventure.index] = outcome;
          adventure.memory = [...adventure.memory, outcome].slice(-24);
          recordStorySuccess(adventure, adventure.index, outcome);
          if (adventure.world) {
            adventure.world.lastEvent = outcome;
            if (adventure.index === 5)
              adventure.world.unresolvedGoal = adventure.plan.hook;
          }
          adventure.pendingChoice =
            (adventure.story
              ? active.scene?.id === adventure.story.decision.afterMission
              : adventure.index === 2) && missionBudget(active.item) !== null;
        }
      }
    }
    const timeMs = Math.max(
      0,
      Date.parse(now) - Date.parse(state.taskStartedAt),
    );
    const misconception = detectMisconception(
      compound ? compound.value : event.answer,
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
      let next =
        numericCorrect && judgement.groupingCorrect && !correct
          ? previous
          : recordAttempt(previous, {
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
      runtime.context.history =
        numericCorrect && judgement.groupingCorrect && !correct
          ? state.history
          : [
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
      state.hints =
        numericCorrect && judgement.groupingCorrect && !correct
          ? state.hints
          : advanceHint(state.hints, {
              id: eventId,
              type: correct ? 'correct' : 'wrong',
            });
      active.resolved = correct;
      // Numeric judgement is returned immediately; model explanation is a separate help turn.
      const result = {
        fallback: true,
        response: fallbackResponse(correct ? 'ros' : 'hint'),
      };
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
      runtime.active.text,
      {
        answer: state.lastAnswer,
        numericCorrect: state.lastAnswerCorrect,
        complete: state.correct,
      },
    );
    const evidence = state.learningEvidence
      ?.filter((e) => e.itemId === runtime.active!.id)
      .at(-1);
    if (evidence && !privateText(event.text)) {
      evidence.explanation = event.text;
      evidence.understanding = result.forstaelse;
    }
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
    if (runtime.active.resolved && state.correct)
      state.response = {
        ...state.response,
        speech: `Tallsvaret ditt er riktig. ${result.forstaelse === 2 ? 'Forklaringen viser hvordan du tenkte.' : 'Vi kan se videre på forklaringen sammen, eller fortsette eventyret.'}`,
      };
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
  if (
    runtime.active &&
    runtime.active.id !== original.active?.id &&
    !(
      state.mode === 'practice' &&
      runtime.active.interestId &&
      state.adventures?.[runtime.active.interestId]
    )
  ) {
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
    state.lastAnswer = undefined;
  }
  if (event.type === 'answer' && state.correct && !state.celebration) {
    const adventure = runtime.active?.interestId
      ? state.adventures?.[runtime.active.interestId]
      : undefined;
    const praise = [
      'Ja! Du fant veien videre!',
      'Det stemmer! Du fikk gruppene til å passe.',
      'Riktig! Du prøvde og løste oppdraget.',
    ];
    state.response = {
      ...state.response,
      speech: adventure
        ? `Riktig! ${adventure.memory.at(-1)}`
        : praise[
            (state.storyProgress?.[runtime.active?.interestId ?? '']
              ?.completed ?? state.revision) % praise.length
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
  if (state.active && state.active.id !== original.active?.id && !resumedItem) {
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
function upgradeSavedPresentation(state: Snapshot) {
  for (const [id, old] of Object.entries(state.adventures ?? {})) {
    const label = old.tasks[0]?.interestLabel ?? '';
    const adventure = upgradeAdventurePresentation(old, label);
    state.adventures![id] = adventure;
    if (
      state.active?.interestId === id &&
      state.active.id === adventure.tasks[adventure.index]?.id &&
      !state.active.interaction
    ) {
      const task = adventure.tasks[adventure.index];
      state.active = {
        ...state.active,
        text: task.text,
        storyContext: task.storyContext,
        interaction: task.interaction,
      };
    }
    if (adventure.paused && !adventure.paused.active.interaction) {
      const task = adventure.tasks.find(
        (t) => t.id === adventure.paused!.active.id,
      );
      if (task)
        adventure.paused.active = {
          ...adventure.paused.active,
          text: task.text,
          storyContext: task.storyContext,
          interaction: task.interaction,
        };
    }
  }
}
export function publicView(
  original: Snapshot,
  useStoryScene = false,
): LearningView {
  const state = Object.values(original.adventures ?? {}).some((a) =>
    a.tasks.some((t) => !t.interaction),
  )
    ? structuredClone(original)
    : original;
  if (state !== original) upgradeSavedPresentation(state);
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
      ? state.mode === 'practice' && state.adventures?.[state.active.interestId]
        ? adventureView(
            state.adventures[state.active.interestId],
            state.active.interestLabel ?? '',
            state.storyProgress?.[state.active.interestId]?.completed ?? 0,
            state.selectedPart,
          )
        : chapter(
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
    fallbackMode:
      (state.fallbackMode ?? false) ||
      (state.mode === 'practice' &&
        !!a?.interestId &&
        state.adventures?.[a.interestId]?.source === 'fallback'),
    revision: state.revision,
    mode: state.mode,
    task:
      a && item
        ? {
            id: a.id,
            scene:
              (a.scene
                ? { ...a.scene, retry: bindStoryProblem(a.scene.retry, item) }
                : undefined) ??
              (useStoryScene &&
              a.interaction &&
              a.interestId &&
              state.adventures?.[a.interestId]
                ? legacyScene(
                    a,
                    state.adventures[a.interestId].plan,
                    state.adventures[a.interestId].index,
                    a.interestLabel ?? '',
                  )
                : undefined),
            interaction: a.interaction,
            submittedAnswer: answerSchema.safeParse(state.lastAnswer).data,
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
              property:
                typeof params.property === 'string'
                  ? params.property
                  : undefined,
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
