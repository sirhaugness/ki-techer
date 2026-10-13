import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import {
  createSession,
  learningTurn,
  publicView,
} from '../../lib/learning/session';
import { checkMultiplicationExpression } from '../../lib/engine/expression-answer';
import { generate } from '../../lib/engine/skills/generators';
import { seededRng } from '../../lib/engine/random';
import { skills } from '../../lib/engine/skills/graph';
import { initialState } from '../../lib/engine/mastery';
import { progressForPart } from '../../lib/engine/medallion';
import { adventureTask, chapter } from '../../lib/profile/story';
import { mockProvider } from '../agent/fixtures';
import { fallbackResponse } from '../../lib/agent/loop';
import type { LearningEvent, Snapshot } from '../../lib/learning/types';
const profile = {
  id: randomUUID(),
  householdId: randomUUID(),
  firstName: 'Leo',
  tutorName: 'Lumi',
  grade: 4,
  avatar: 'spire',
  settings: {},
};
const now = '2026-10-12T10:00:00.000Z';
const interests = [{ id: randomUUID(), label: 'Star Wars', active: true }];
const turn = (state: Snapshot, event: LearningEvent, id = randomUUID()) =>
  learningTurn(state, event, id, now, profile, interests, null, 'Bokmål');
function answer(state: Snapshot): LearningEvent {
  const a = state.active!;
  return {
    type: 'answer',
    itemId: a.id,
    answer: a.expressionRequired
      ? { value: Number(a.item.answer), expression: a.item.expression! }
      : a.item.answer,
    inputMode: 'tastatur',
  };
}
describe('verified expression answers', () => {
  it.each(['3*3', '3×3', '(3+3)+3', '3 · 3 = 9', '9=3*3'])(
    'accepts an equivalent expression for the story: %s',
    (text) => expect(checkMultiplicationExpression(text, 3, 3)).toBe(true),
  );
  it.each([
    '9',
    '1*9',
    '3+3',
    '2+7',
    'sqrt(81)',
    'x=9',
    '3*3=8',
    '3^2',
    'import("x")',
    '3*3;9',
  ])('rejects wrong meaning or unsafe syntax: %s', (text) =>
    expect(checkMultiplicationExpression(text, 3, 3)).toBe(false),
  );
});
it('keeps one coherent adventure over repeated tasks and carries actual progress across sessions', async () => {
  let state = createSession(profile, null, now, 0, 'practice', null);
  for (let i = 0; i < 5; i++) {
    state = (await turn(state, { type: 'next' })).state;
    expect(state.active!.text).toMatch(/Luke/);
    expect(state.active!.interestId).toBe(interests[0].id);
    const solved = await turn(state, answer(state));
    expect(solved.state.correct).toBe(true);
    expect(solved.state.storyProgress![interests[0].id].completed).toBe(i + 1);
    state = solved.state;
  }
  expect(publicView(state).adventure?.number).toBe(2);
  state = (await turn(state, { type: 'end', mood: 'rolig', reflection: '' }))
    .state;
  const next = createSession(profile, state, now, 0, 'practice', null);
  expect(next.storyProgress).toEqual(state.storyProgress);
  expect(
    chapter(interests, next.storyProgress![interests[0].id].completed).number,
  ).toBe(2);
});
it('requires both numeric and story expression answers; incorrect submissions and replay never advance the story twice', async () => {
  let state = createSession(profile, null, now, 0, 'practice', null);
  state = (await turn(state, { type: 'next' })).state;
  expect(state.active!.expressionRequired).toBe(true);
  const wrong = await turn(state, {
    type: 'answer',
    itemId: state.active!.id,
    answer: { value: Number(state.active!.item.answer), expression: '1*999' },
    inputMode: 'tastatur',
  });
  expect(wrong.state.correct).toBe(false);
  expect(wrong.state.lastAnswerCorrect).toBe(true);
  expect(wrong.state.storyProgress).toEqual({});
  const id = randomUUID(),
    event = answer(wrong.state);
  const solved = await turn(wrong.state, event, id);
  expect(solved.state.storyProgress![interests[0].id].completed).toBe(1);
  expect((await turn(solved.state, event, id)).state.storyProgress).toEqual(
    solved.state.storyProgress,
  );
});
it('keeps questions separate from evidence and uses task-specific progressively concrete fallback help', async () => {
  let state = createSession(profile, null, now, 0, 'practice', null);
  state = (await turn(state, { type: 'next' })).state;
  const original = structuredClone(state);
  for (let i = 0; i < 3; i++) {
    const result = await turn(state, { type: 'ask', text: 'Jeg forstår ikke' });
    expect(result.events.attempts).toEqual([]);
    expect(result.state.active).toEqual(original.active);
    expect(result.state.storyProgress).toEqual({});
    expect(result.state.response.speech).not.toBe(state.response.speech);
    expect(result.events.messages[0].meta).toMatchObject({ kind: 'question' });
    state = result.state;
  }
  const answered = await turn(state, answer(state));
  expect(answered.events.attempts[0].hint_level_used).toBeGreaterThan(0);
  expect(answered.events.attempts[0].credit).toBeLessThan(1);
});
it('supplies task, previous answer and prior help to the model without exposing task-changing tools', async () => {
  let state = createSession(profile, null, now, 0, 'practice', null);
  state = (await turn(state, { type: 'next' })).state;
  state.lastAnswer = 999;
  state = (await turn(state, { type: 'ask', text: 'Jeg forstår ikke' })).state;
  const provider = mockProvider([
    {
      calls: [],
      value: {
        ...fallbackResponse('hint'),
        speech: 'Ganging teller like grupper. Tegn gruppene først.',
      },
    },
  ]);
  const spy = vi.spyOn(provider, 'respond');
  const result = await learningTurn(
    state,
    { type: 'ask', text: 'Hvorfor skal jeg gange?' },
    randomUUID(),
    now,
    profile,
    interests,
    provider,
    'Bokmål',
  );
  expect(spy.mock.calls[0][0].input).toContain('999');
  expect(spy.mock.calls[0][0].input).toContain('Luke');
  expect(spy.mock.calls[0][0].input).toContain('Jeg forstår ikke');
  expect(spy.mock.calls[0][0].tools).toBeUndefined();
  expect(result.state.active!.id).toBe(state.active!.id);
  expect(result.events.attempts).toEqual([]);
});
it('provides help during master challenges and excludes helped answers from the score and award', async () => {
  const previous = createSession(
    profile,
    null,
    '2026-10-11T10:00:00.000Z',
    0,
    'practice',
    4,
  );
  previous.endedAt = '2026-10-11T10:05:00.000Z';
  for (const skill of skills.filter((s) => s.part === 4))
    previous.states[skill.id] = {
      ...initialState(3),
      masteredAt: '2026-10-11T10:00:00.000Z',
    };
  previous.parts = ([1, 2, 3, 4] as const).map((id) =>
    progressForPart(id, previous.states),
  );
  let state = createSession(profile, previous, now, 0, 'master', 4);
  for (let i = 0; i < 10; i++) {
    state = (await turn(state, { type: 'next' })).state;
    if (i < 3)
      state = (
        await turn(state, { type: 'ask', text: 'Kan vi gjøre det sammen?' })
      ).state;
    state = (await turn(state, answer(state))).state;
  }
  expect(state.parts.find((p) => p.id === 4)?.awardedAt).toBeNull();
  expect(state.masterAnswers.filter((a) => a.hintLevel > 0)).toHaveLength(3);
  expect(state.endedAt).not.toBeNull();
});
it('story templates preserve verified numeric answers across all skills, levels and interests', () => {
  for (const skill of skills)
    for (const level of [1, 2, 3, 4, 5] as const) {
      const item = generate(skill.id, level, seededRng(level));
      const before = structuredClone(item);
      const task = adventureTask(item, 'Star Wars', level);
      expect(task.text).toContain('Luke');
      expect(item).toEqual(before);
    }
});

it('allows verified task quantities in teaching speech without permitting a solution or invented numbers', async () => {
  const { guardResponse } = await import('../../lib/agent/guards');
  const item = generate('mult-telling-grupper', 1, seededRng(2));
  const response = {
    ...fallbackResponse('hint'),
    speech: `Tegn ${item.params.a} tomme grupper først.`,
  };
  expect(guardResponse(response, item, 1, true)).not.toBeNull();
  expect(
    guardResponse(
      { ...response, speech: `Svaret er ${item.answer}.` },
      item,
      1,
      true,
    ),
  ).toBeNull();
  expect(
    guardResponse({ ...response, speech: 'Tegn 999 grupper.' }, item, 1, true),
  ).toBeNull();
  expect(
    guardResponse(
      { ...response, speech: `Regn ${item.params.a} × ${item.params.b}.` },
      item,
      1,
      true,
    ),
  ).toBeNull();
});
