import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  createSession,
  learningTurn,
  publicView,
} from '../../lib/learning/session';
import { planAdventure } from '../../lib/learning/adventure';
import {
  compileInteraction,
  missionMath,
  validateMissionChapter,
  judgeTaskAnswer,
} from '../../lib/engine/mission';
import { generate } from '../../lib/engine/skills/generators';
import { initialState } from '../../lib/engine/mastery';
import { skills } from '../../lib/engine/skills/graph';
import { seededRng } from '../../lib/engine/random';
import { teacherHelp } from '../../lib/learning/help';
import type { AiProvider } from '../../lib/ai/provider';
import type { Snapshot, LearningEvent } from '../../lib/learning/types';

const now = '2026-10-14T10:00:00.000Z';
const profile = {
  id: randomUUID(),
  householdId: randomUUID(),
  firstName: 'Leo',
  tutorName: 'Lumi',
  grade: 4,
  avatar: 'spire',
  settings: {},
};
const interest = { id: randomUUID(), label: 'Star Wars', active: true };
const turn = (
  state: Snapshot,
  event: LearningEvent,
  requestId = randomUUID(),
) =>
  learningTurn(
    state,
    event,
    requestId,
    now,
    profile,
    [interest],
    null,
    'Bokmål.',
  );
const solve = (state: Snapshot) =>
  turn(state, {
    type: 'answer',
    itemId: state.active!.id,
    answer: state.active!.expressionRequired
      ? {
          value: Number(state.active!.item.answer),
          expression: state.active!.item.expression!,
        }
      : state.active!.item.answer,
    inputMode: 'tastatur',
  });

describe('compiled illustrated chapters', () => {
  it('keeps at least three actual interactions at every curriculum part and in all preset interests', async () => {
    for (const part of [null, 1, 2, 3, 4] as const) {
      const previous = createSession(profile, null, now, 0, 'practice', null);
      for (const skill of skills)
        if (skill.part !== part)
          previous.states[skill.id] = { ...initialState(3), masteredAt: now };
      const state = createSession(profile, previous, now, 0, 'practice', part);
      for (const label of [
        'Star Wars',
        'Dinosaurer',
        'Fotball',
        'Verdensrommet',
        'Dyr',
        'Bygging',
      ]) {
        const chapter = await planAdventure({
          label,
          interestId: randomUUID(),
          context: {
            states: state.states,
            clock: state.clock,
            now,
            phase: 'oppvarming',
            selectedPart: part ?? undefined,
            history: [],
            focusSkillId: null,
          },
          provider: null,
          seed: 14,
          uuid: randomUUID,
        });
        expect(
          validateMissionChapter(chapter.tasks),
          `${label}, part ${part}`,
        ).toBe(true);
        expect(
          new Set(chapter.tasks.map((t) => t.interaction?.kind)).size,
        ).toBeGreaterThanOrEqual(3);
        chapter.tasks.forEach((t) =>
          expect(t.interaction?.math).toEqual(missionMath(t.item)),
        );
      }
    }
  });
  it('renders a model-authored custom world through the same validated contract and rejects uniform activity plans', async () => {
    const state = createSession(profile, null, now, 0, 'practice', null);
    const context = {
      states: state.states,
      clock: state.clock,
      now,
      phase: 'oppvarming' as const,
      history: [],
      focusSkillId: null,
    };
    const provider: AiProvider = {
      moderate: async () => true,
      respond: async (request) => {
        const { example } = JSON.parse(request.input);
        return {
          calls: [],
          value: {
            ...example,
            title: 'Alex reparerer landsbyens bro',
            companion: 'Alex',
            place: 'oververdenen',
            opening:
              'Alex finner en ødelagt bro ved landsbyen. Leo bygger en vei til vennene.',
            missions: example.missions.map(
              (m: Record<string, unknown>, i: number) => ({
                ...m,
                stage: i === 3 ? 'river' : 'village',
                object: 'steiner',
                container: 'kister',
                dialogue: 'Alex: «Vi bygger en trygg vei til landsbyen.»',
                purpose: 'Steinene skal gjøre veien til landsbyen trygg.',
              }),
            ),
          },
        };
      },
    };
    const input = {
      label: 'Minecraft',
      interestId: randomUUID(),
      context,
      provider,
      seed: 10,
      uuid: randomUUID,
    };
    const generated = await planAdventure(input);
    expect(generated.source).toBe('model');
    expect(generated.tasks[0].text).toContain('Alex');
    expect(generated.tasks[0].interaction?.object).toBe('steiner');
    expect(generated.plan.missions[0].stage).toBe('village');
    expect(validateMissionChapter(generated.tasks)).toBe(true);
    const uniform: AiProvider = {
      ...provider,
      respond: async (request) => {
        const { example } = JSON.parse(request.input);
        return {
          calls: [],
          value: {
            ...example,
            missions: example.missions.map((m: object) => ({
              ...m,
              activity: 'quantity',
            })),
          },
        };
      },
    };
    const trusted = await planAdventure({ ...input, provider: uniform });
    expect(trusted.source).toBe('fallback');
    expect(validateMissionChapter(trusted.tasks)).toBe(true);
  });
  it('rejects misleading illustrated quantities and uniform compiled chapters', async () => {
    let state = (
      await turn(createSession(profile, null, now, 0, 'practice', null), {
        type: 'next',
      })
    ).state;
    const tasks = state.adventures![interest.id].tasks;
    const corrupt = structuredClone(tasks);
    corrupt[0].interaction!.math.each++;
    expect(validateMissionChapter(corrupt)).toBe(false);
    const uniform = structuredClone(tasks);
    uniform.forEach((t) => {
      t.interaction!.kind = 'quantity';
    });
    expect(validateMissionChapter(uniform)).toBe(false);
    state = (await solve(state)).state;
    expect(state.correct).toBe(true);
  });
  it('checks the distribution as well as its total, and teacher help agrees with the same judgement', async () => {
    const item = generate('mult-telling-grupper', 1, seededRng(2));
    const interaction = compileInteraction(
      item,
      'grouping',
      'planker',
      'brofelt',
      3,
    );
    const task = {
      id: randomUUID(),
      item,
      interaction,
      text: item.question,
      representation: 'konkret' as const,
      strategy: {},
      resolved: false,
    };
    const allocations = Array.from(
      { length: interaction.math.groups },
      () => interaction.math.each,
    );
    allocations[0]++;
    allocations[1]--;
    const answer = { value: Number(item.answer), allocations };
    expect(judgeTaskAnswer(task, answer)).toMatchObject({
      numericCorrect: true,
      correct: false,
    });
    const help = await teacherHelp({
      provider: null,
      task,
      text: 'Hva var feil?',
      level: 1,
      context: '',
      instructions: '',
      lastAnswer: answer,
      numericCorrect: true,
    });
    expect(help.response.speech).toContain('Tallsvaret stemmer');
    expect(help.response.speech).toContain('fordelingen');
    allocations[0]--;
    allocations[1]++;
    expect(judgeTaskAnswer(task, answer).correct).toBe(true);
    const measure = missionMath(
      generate('div-maaling-konkret', 2, seededRng(2)),
    );
    expect(measure.kind).toBe('measure');
    expect(measure.groups).toBe(0);
    let state = (
      await turn(createSession(profile, null, now, 0, 'practice', null), {
        type: 'next',
      })
    ).state;
    for (let i = 0; i < 3; i++) {
      if (i) state = (await turn(state, { type: 'next' })).state;
      state = (await solve(state)).state;
    }
    state = (
      await turn(state, {
        type: 'choice',
        itemId: state.active!.id,
        option: 1,
        remaining: 2,
      })
    ).state;
    state = (await turn(state, { type: 'next' })).state;
    const math = state.active!.interaction!.math;
    const uneven = Array.from({ length: math.groups }, () => math.each);
    uneven[0]++;
    uneven[1]--;
    const memory = structuredClone(state.adventures![interest.id].memory);
    state = (
      await turn(state, {
        type: 'answer',
        itemId: state.active!.id,
        answer: {
          value: Number(state.active!.item.answer),
          allocations: uneven,
        },
        inputMode: 'manipulativ',
      })
    ).state;
    expect(state.lastAnswerCorrect).toBe(true);
    expect(state.correct).toBe(false);
    expect(state.adventures![interest.id].evidence.at(-1)?.issue).toBe(
      'calculation',
    );
    expect(state.adventures![interest.id].memory).toEqual(memory);
  });
  it('retains supplies after a wrong route calculation, then uses the chosen key later and in the next chapter', async () => {
    let state = (
      await turn(createSession(profile, null, now, 0, 'practice', null), {
        type: 'next',
      })
    ).state;
    for (let i = 0; i < 3; i++) {
      if (i) state = (await turn(state, { type: 'next' })).state;
      state = (await solve(state)).state;
    }
    const before = structuredClone(state.adventures![interest.id]);
    state = (
      await turn(state, {
        type: 'choice',
        itemId: state.active!.id,
        option: 1,
        remaining: 999,
      })
    ).state;
    expect(state.adventures![interest.id].pendingChoice).toBe(true);
    expect(state.adventures![interest.id].memory).toEqual(before.memory);
    expect(state.adventures![interest.id].choices).toEqual(before.choices);
    expect(publicView(state).adventure?.choice?.error).toContain(
      'Du beholder alt',
    );
    const choice: LearningEvent = {
      type: 'choice',
      itemId: state.active!.id,
      option: 1,
      remaining: 2,
    };
    const requestId = randomUUID();
    state = (await turn(state, choice, requestId)).state;
    const replay = await turn(state, choice, requestId);
    expect(replay.replayed).toBe(true);
    expect(replay.state.adventures).toEqual(state.adventures);
    for (let i = 3; i < 6; i++) {
      state = (await turn(state, { type: 'next' })).state;
      if (i === 4) {
        expect(publicView(state).adventure?.payoff?.effect).toBe('open');
        expect(state.adventures![interest.id].route?.used).toBe(true);
      }
      state = (await solve(state)).state;
    }
    state = JSON.parse(JSON.stringify(state));
    state = (await turn(state, { type: 'next' })).state;
    expect(publicView(state).adventure?.number).toBe(2);
    expect(publicView(state).adventure?.text).toContain('adgangsbrikke');
    expect(publicView(state).adventure?.route?.asset).toBe('key');
  });
  it('upgrades legacy persisted presentations without losing submitted answers or task identity', async () => {
    let state = (
      await turn(createSession(profile, null, now, 0, 'practice', null), {
        type: 'next',
      })
    ).state;
    const id = state.active!.id;
    state.lastAnswer = { value: 999, expression: '2x3' };
    delete state.active!.interaction;
    state.adventures![interest.id].tasks.forEach((t) => {
      delete t.interaction;
    });
    const shown = publicView(state);
    expect(shown.task?.id).toBe(id);
    expect(shown.task?.submittedAnswer).toEqual(state.lastAnswer);
    expect(shown.task?.interaction?.kind).toBe('equation');
    state = (await solve(state)).state;
    expect(state.active!.id).toBe(id);
    expect(state.correct).toBe(true);
  });
});
