import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  createSession,
  learningTurn,
  publicView,
} from '../../lib/learning/session';
import type {
  LearningEvent,
  Snapshot,
  Interest,
} from '../../lib/learning/types';
import type { AiProvider } from '../../lib/ai/provider';
import {
  chapterAssessment,
  type AdventureEvidence,
} from '../../lib/learning/adventure';
import { initialState } from '../../lib/engine/mastery';
import { verifyGeneratedItem } from '../../lib/engine/verified-item';
import { generate } from '../../lib/engine/skills/generators';
import { seededRng } from '../../lib/engine/random';
import { skills } from '../../lib/engine/skills/graph';
import { teacherHelp } from '../../lib/learning/help';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

const profile = {
  id: randomUUID(),
  householdId: randomUUID(),
  firstName: 'Leo',
  tutorName: 'Lumi',
  grade: 4,
  avatar: 'spire',
  settings: {},
};
const now = '2026-10-13T10:00:00.000Z';
const star = { id: randomUUID(), label: 'Star Wars', active: true };
const dino = { id: randomUUID(), label: 'Dinosaurer', active: true };
const start = () => createSession(profile, null, now, 0, 'practice', null);
const turn = (
  s: Snapshot,
  e: LearningEvent,
  interests: Interest[] = [star],
  provider: AiProvider | null = null,
) =>
  learningTurn(
    s,
    e,
    randomUUID(),
    now,
    profile,
    interests,
    provider,
    'Kort norsk bokmål',
  );
const answer = (s: Snapshot, wrong = false): LearningEvent => ({
  type: 'answer',
  itemId: s.active!.id,
  answer: s.active!.expressionRequired
    ? {
        value: Number(s.active!.item.answer) + (wrong ? 1 : 0),
        expression: s.active!.item.expression!.replace('*', 'x'),
      }
    : wrong
      ? 999
      : s.active!.item.answer,
  inputMode: 'tastatur',
});
async function solveChapter(state: Snapshot, wrongSkill?: string) {
  for (let i = 0; i < 6; i++) {
    if (i || !state.active) state = (await turn(state, { type: 'next' })).state;
    if (state.active!.item.skillId === wrongSkill)
      state = (await turn(state, answer(state, true))).state;
    state = (await turn(state, answer(state))).state;
    if (publicView(state).adventure?.choice)
      state = (
        await turn(state, {
          type: 'choice',
          itemId: state.active!.id,
          option: 1,
          remaining: Math.min(2, Number(state.active!.item.answer)),
        })
      ).state;
  }
  return state;
}
describe('chapter chain', () => {
  it('plans six different missions, remembers a mathematical route choice and continues across refresh and a new session', async () => {
    let s = (await turn(start(), { type: 'next' })).state;
    const chapter = s.adventures![star.id];
    expect(chapter.tasks).toHaveLength(6);
    expect(
      new Set(chapter.tasks.map((t) => t.item.skillId)).size,
    ).toBeGreaterThan(1);
    expect(new Set(chapter.tasks.map((t) => t.text)).size).toBe(6);
    expect(chapter.tasks.every((t) => verifyGeneratedItem(t.item))).toBe(true);
    s = await solveChapter(s);
    expect(s.adventures![star.id].memory.join(' ')).toContain('adgangsbrikke');
    const persisted = JSON.parse(JSON.stringify(s)) as Snapshot;
    expect(publicView(persisted)).toEqual(publicView(s));
    s = (await turn(persisted, { type: 'end', mood: 'rolig', reflection: '' }))
      .state;
    s = createSession(profile, s, now, 0, 'practice', null);
    s = (await turn(s, { type: 'next' })).state;
    expect(s.adventures![star.id].number).toBe(2);
    expect(s.adventures![star.id].plan.opening).toContain('adgangsbrikke');
    expect(s.adventures![star.id].plan.opening).toContain('motstandsbasen');
  });
  it('adapts to repeated difficulties across the whole chapter, keeps variety and changes at most one level', async () => {
    const initial = start();
    initial.states['mult-telling-grupper'] = initialState(1);
    let s = (await turn(initial, { type: 'next' })).state;
    const first = s.adventures![star.id].tasks.filter(
      (t) => t.item.skillId === 'mult-telling-grupper',
    );
    s = await solveChapter(s, 'mult-telling-grupper');
    const assessment = chapterAssessment(s.adventures![star.id].evidence);
    expect(assessment['mult-telling-grupper'].change).toBe(-1);
    s = (await turn(s, { type: 'next' })).state;
    const next = s.adventures![star.id].tasks.filter(
      (t) => t.item.skillId === 'mult-telling-grupper',
    );
    expect(next.length).toBeGreaterThan(first.length);
    expect(
      Math.abs(next[0].item.difficulty - first[0].item.difficulty),
    ).toBeLessThanOrEqual(1);
    expect(
      new Set(s.adventures![star.id].tasks.map((t) => t.item.skillId)).size,
    ).toBeGreaterThan(1);
  });
  it('pauses an unfinished mission and restores its answer, hint and story while sharing learning across interests', async () => {
    let s = (await turn(start(), { type: 'next' })).state;
    s = (await turn(s, answer(s, true))).state;
    s = (await turn(s, { type: 'ask', text: 'Jeg forstår ikke' })).state;
    const original = structuredClone(s);
    s = (await turn(s, { type: 'next' }, [dino])).state;
    expect(publicView(s).adventure?.interest).toBe('Dinosaurer');
    expect(s.adventures![dino.id].plan.opening).toContain('dinosaur');
    expect(s.adventures![dino.id].plan.opening).not.toContain('Poe');
    expect(s.states).toEqual(original.states);
    s = (await turn(s, { type: 'next' }, [star])).state;
    expect(s.active).toEqual(original.active);
    expect(s.lastAnswer).toEqual(original.lastAnswer);
    expect(s.hints).toEqual(original.hints);
    expect(s.learningEvidence).toEqual(original.learningEvidence);
  });
  it('does not wait for the model to judge an answer and gives a consistent explanation for 2x3 and 6', async () => {
    let s = (await turn(start(), { type: 'next' })).state;
    s.active!.item = generate('mult-telling-grupper', 1, seededRng(1));
    s.active!.item = {
      ...s.active!.item,
      params: { a: 2, b: 3 },
      answer: 6,
      expression: '2*3',
    };
    const respond = vi.fn(() => new Promise<never>(() => {}));
    const provider = { respond, moderate: async () => true };
    s = (
      await turn(
        s,
        {
          type: 'answer',
          itemId: s.active!.id,
          answer: { value: 6, expression: '2x3' },
          inputMode: 'tastatur',
        },
        [star],
        provider,
      )
    ).state;
    expect(s.correct).toBe(true);
    expect(respond).not.toHaveBeenCalled();
    const help = await teacherHelp({
      provider,
      task: s.active!,
      text: 'Hva var feil?',
      level: 0,
      context: '',
      instructions: '',
      lastAnswer: s.lastAnswer,
      numericCorrect: true,
    });
    expect(help.response.speech).toContain('2x3');
    expect(help.response.speech).toContain('stemmer');
    expect(help.response.speech).not.toContain('feil');
  });
});
it('one calculation error, notation or hints alone do not lower a chapter level', () => {
  const evidence = Array.from({ length: 6 }, (_, i): AdventureEvidence => ({
    itemId: String(i),
    skillId: 'mult-telling-grupper',
    difficulty: 2,
    answer: 6,
    expression: '2x3',
    correct: true,
    numericCorrect: true,
    hintLevel: i % 2,
    issue: i === 0 ? 'calculation' : i === 1 ? 'notation' : 'none',
    support: i % 2 ? 'supported' : 'independent',
  }));
  expect(chapterAssessment(evidence)['mult-telling-grupper'].change).toBe(0);
});
it('a correct numerical result with incomplete notation does not penalize the arithmetic skill or trigger frustration rules', async () => {
  let s = (await turn(start(), { type: 'next' })).state;
  s.states[s.active!.item.skillId] = initialState();
  const before = structuredClone(s.states);
  for (let i = 0; i < 3; i++)
    s = (
      await turn(s, {
        type: 'answer',
        itemId: s.active!.id,
        answer: { value: Number(s.active!.item.answer), expression: '1*999' },
        inputMode: 'tastatur',
      })
    ).state;
  expect(s.states).toEqual(before);
  expect(s.history).toEqual([]);
  expect(s.hints.level).toBe(0);
  expect(s.lastAnswerCorrect).toBe(true);
  expect(s.active!.resolved).toBe(false);
});
it('uses every mission from the preceding chapter even when another interest was played in between', async () => {
  let s = (await turn(start(), { type: 'next' })).state;
  const previous = s.adventures![star.id];
  previous.evidence = previous.tasks.flatMap((task, i) => {
    const correct: AdventureEvidence = {
      itemId: task.id,
      skillId: task.item.skillId,
      difficulty: task.item.difficulty,
      answer: task.item.answer,
      expression: task.item.expression,
      correct: true,
      numericCorrect: true,
      hintLevel: 0,
      issue: 'none',
      support: 'independent',
    };
    return i === 0 || i === 3
      ? [
          {
            ...correct,
            correct: false,
            numericCorrect: false,
            issue: 'calculation' as const,
          },
          correct,
        ]
      : [correct];
  });
  // The global recent window contains other-world missions and has dropped the earliest one.
  s.learningEvidence = previous.evidence.filter(
    (e) => e.itemId !== previous.tasks[0].id,
  );
  previous.index = 5;
  previous.tasks.forEach((task) => {
    task.resolved = true;
  });
  s.active = structuredClone(previous.tasks[5]);
  s = (await turn(s, { type: 'next' })).state;
  expect(
    s.adventures![star.id].assessment?.['mult-telling-grupper']
      .calculationErrors,
  ).toBe(2);
  expect(
    s.adventures![star.id].assessment?.['mult-telling-grupper'].change,
  ).toBe(-1);
});
it('rejects corrupted numeric, coordinate, remainder and choice tasks before display', () => {
  for (const id of [
    'mult-telling-grupper',
    'algoritme-folg-instruksjon',
    'div-med-rest',
    'regneuttrykk-fra-situasjon',
  ]) {
    const item = generate(id, 2, seededRng(5));
    expect(verifyGeneratedItem(item)).toBe(true);
    expect(verifyGeneratedItem({ ...item, answer: 999 })).toBe(false);
  }
  for (const skill of skills)
    for (const level of [1, 2, 3, 4, 5] as const)
      expect(
        verifyGeneratedItem(generate(skill.id, level, seededRng(level))),
      ).toBe(true);
});
it('uses model chapters for custom universes and falls back on malformed or failed model replies', async () => {
  server.use(
    http.get(
      'https://en.wikipedia.org/api/rest_v1/page/summary/Minecraft',
      () =>
        HttpResponse.json({
          thumbnail: { source: 'https://upload.wikimedia.org/example.png' },
        }),
    ),
  );
  const seen: unknown[] = [];
  const provider: AiProvider = {
    moderate: async () => true,
    respond: async (req) => {
      const data = JSON.parse(req.input);
      seen.push(data);
      return {
        calls: [],
        value: {
          ...data.example,
          title: 'Kartet i oververdenen',
          companion: 'Alex',
          place: 'oververdenen',
          cargo: 'steiner',
          container: 'kister',
          opening:
            'Alex bygger et skjul før creeperen kommer. Leo må finne landsbyen og redde kartet.',
          destination: 'landsbyen',
        },
      };
    },
  };
  const minecraft = { id: randomUUID(), label: 'Minecraft', active: true };
  const s = (await turn(start(), { type: 'next' }, [minecraft], provider))
    .state;
  expect(s.adventures![minecraft.id].source).toBe('model');
  expect(s.active!.text).toContain('Alex');
  expect(seen).toHaveLength(1);
  for (const value of [{ missions: [] }, null]) {
    const invalid = {
      ...provider,
      respond: async () => ({ calls: [], value }),
    };
    const fallback = (await turn(start(), { type: 'next' }, [star], invalid))
      .state;
    expect(fallback.adventures![star.id].source).toBe('fallback');
    expect(fallback.active).not.toBeNull();
  }
  const failing = {
    ...provider,
    respond: async () => {
      throw new Error('Unavailable');
    },
  };
  expect(
    (await turn(start(), { type: 'next' }, [dino], failing)).state.active,
  ).not.toBeNull();
});
