import { describe, expect, it, vi } from 'vitest';
import { fallbackResponse } from '../../lib/agent/loop';
import { initialState } from '../../lib/engine/mastery';
import { seededRng } from '../../lib/engine/random';
import { skills } from '../../lib/engine/skills/graph';
import { generate } from '../../lib/engine/skills/generators';
import { createSession } from '../../lib/learning/session';
import { scheduleReview, serializeCard } from '../../lib/engine/scheduler';
import type { LearnerProfile } from '../../lib/learning/types';
import type { AiProvider } from '../../lib/ai/provider';
import { planMath } from '../../lib/free-story/planner';
import { reserveHeader, reserveMission } from '../../lib/free-story/generation';
import {
  freeStoryView,
  startStorySession,
  storyTurn,
  StoryNotReadyError,
} from '../../lib/free-story/play';
import type { FreeChapter, StorySession } from '../../lib/free-story/types';

const now = '2026-10-20T10:00:00Z';
const profile: LearnerProfile = {
  id: '00000000-0000-4000-8000-000000000011',
  householdId: '00000000-0000-4000-8000-000000000001',
  firstName: 'Leo',
  tutorName: 'Lumi',
  grade: 4,
  avatar: 'spire',
  settings: {},
};
let counter = 100;
const eventId = () =>
  `00000000-0000-4000-8000-${(++counter).toString(16).padStart(12, '0')}`;
function chapter(): FreeChapter {
  const slots = planMath(null, now, 42);
  return {
    id: '00000000-0000-4000-8000-000000000099',
    learner_id: profile.id,
    household_id: profile.householdId,
    previous_id: null,
    interests: ['Bygging'],
    context: { previousSummary: '' },
    slots,
    header: reserveHeader(['Bygging']),
    missions: slots.map((s) => reserveMission(s, 'Verkstedet')),
    status: 'done',
    owner: null,
    created_at: now,
    deadline: now,
    spent: 0,
    finished_at: now,
    completed: false,
    calls: {},
  };
}
function teacher() {
  return {
    moderate: vi.fn(async () => true),
    respond: vi.fn<AiProvider['respond']>(async () => ({
      calls: [],
      value: {
        ...fallbackResponse('hint'),
        speech: 'Finn først det teksten forteller at du vet.',
      },
    })),
  } satisfies AiProvider;
}
function turn(
  c: FreeChapter,
  state: StorySession,
  event: unknown,
  provider: AiProvider | null = null,
  at = now,
  id = eventId(),
) {
  return storyTurn(c, state, event, id, at, profile, provider, 'Kort bokmål.');
}

describe('free-story play with the real learning engine', () => {
  it('starts at revision one and emits the private item for the existing persistence contract', () => {
    const c = chapter(),
      original = structuredClone(c);
    const { state, events } = startStorySession(c, profile, null, now, 0);
    expect(state.revision).toBe(1);
    expect(state.freeChapter).toMatchObject({
      id: c.id,
      index: 0,
      failures: 0,
    });
    expect(events.items).toHaveLength(1);
    expect(events.items[0]).toMatchObject({
      id: state.active!.id,
      skill_id: c.slots[0].item.skillId,
      answer: c.slots[0].item.answer,
      validated: true,
      origin: 'generator',
    });
    expect(state.active!.item).toEqual(c.slots[0].item);
    expect(c).toEqual(original);
  });

  it('publishes only the current task, with no key, expression, private parameters or derived total', () => {
    const c = chapter(),
      { state } = startStorySession(c, profile, null, now, 0);
    c.missions[1].text = 'Denne framtidige hendelsen skal holdes skjult.';
    c.header!.ending = 'Denne avslutningen er ikke opptjent ennå.';
    const view = freeStoryView(c, state, now),
      task = view.task!;
    for (const key of [
      'answer',
      'params',
      'expression',
      'commonWrongAnswers',
      'interaction',
    ])
      expect(task).not.toHaveProperty(key);
    expect(task.visual).toEqual({
      type: 'ingen',
      count: 0,
      groups: 0,
      shape: null,
      steps: [],
    });
    expect(task.question).toBe(c.missions[0].question);
    expect(view.playing).toBe(true);
    expect(view.ending).toBeNull();
    expect(JSON.stringify(view)).not.toContain(c.missions[1].text);
    expect(JSON.stringify(view)).not.toContain(c.header!.ending);
    expect(freeStoryView(c, null, now).playing).toBe(false);
  });

  it('records a real wrong attempt and a distinct second reaction without changing the task', async () => {
    const c = chapter(),
      { state } = startStorySession(c, profile, null, now, 0);
    const before = structuredClone(state),
      provider = teacher();
    const first = await turn(
      c,
      state,
      { type: 'answer', answer: -1 },
      provider,
    );
    const second = await turn(
      c,
      first.state,
      { type: 'answer', answer: -1 },
      provider,
    );
    expect(first.events.attempts[0]).toMatchObject({
      correct: false,
      credit: 0,
    });
    expect(second.state.active!.id).toBe(state.active!.id);
    expect(second.state.freeChapter.failures).toBe(2);
    expect(second.state.states[state.active!.item.skillId].attempts).toBe(2);
    expect(second.state.hints.level).toBe(1);
    const firstText = freeStoryView(c, first.state, now).feedback;
    const secondText = freeStoryView(c, second.state, now).feedback;
    expect(firstText).not.toBe('');
    expect(secondText).not.toBe(firstText);
    expect(second.events.messages.at(-1)!.text).toBe(secondText);
    expect(provider.respond).not.toHaveBeenCalled();
    expect(state).toEqual(before);
  });

  it('replays an answer without a second attempt, message, reaction or provider call', async () => {
    const c = chapter(),
      { state } = startStorySession(c, profile, null, now, 0);
    const id = eventId();
    const answered = await turn(
      c,
      state,
      { type: 'answer', answer: -1 },
      null,
      now,
      id,
    );
    const replay = await turn(
      c,
      answered.state,
      { type: 'answer', answer: -1 },
      null,
      now,
      id,
    );
    expect(replay.replayed).toBe(true);
    expect(replay.state).toEqual(answered.state);
    expect(
      Object.values(replay.events).every((entries) => entries.length === 0),
    ).toBe(true);
  });

  it('shows answer reactions once while keeping newly requested teacher help visible', async () => {
    const c = chapter(),
      { state } = startStorySession(c, profile, null, now, 0);
    const wrong = await turn(c, state, { type: 'answer', answer: -1 });
    const view = freeStoryView(c, wrong.state, now);
    expect(view.feedback).not.toBe('');
    expect(view.teacher).toBe('');
    const helped = await turn(c, wrong.state, { type: 'hint' }, teacher());
    const helpView = freeStoryView(c, helped.state, now);
    expect(helpView.feedback).toBe(view.feedback);
    expect(helpView.teacher).toBe(
      'Finn først det teksten forteller at du vet.',
    );
  });

  it('uses actual help turns and preserves supported credit instead of inventing independent mastery', async () => {
    const c = chapter(),
      { state } = startStorySession(c, profile, null, now, 0),
      provider = teacher();
    const helped = await turn(c, state, { type: 'hint' }, provider);
    expect(provider.respond).toHaveBeenCalledTimes(1);
    expect(helped.state.active!.id).toBe(state.active!.id);
    expect(helped.state.hints.level).toBe(1);
    expect(helped.events.attempts).toHaveLength(0);
    const answered = await turn(
      c,
      helped.state,
      { type: 'answer', answer: state.active!.item.answer },
      provider,
    );
    expect(answered.state.active!.resolved).toBe(true);
    expect(answered.events.attempts[0]).toMatchObject({
      correct: true,
      credit: 0.7,
      hint_level_used: 1,
    });
    expect(
      answered.state.states[state.active!.item.skillId].correctNoHint,
    ).toBe(0);
    expect(answered.state.parts.every((p) => !p.awardedAt)).toBe(true);
    expect(freeStoryView(c, answered.state, now).feedback).toBe(
      c.missions[0].success,
    );
    expect(provider.respond).toHaveBeenCalledTimes(1);
  });

  it('lets an ask turn see the story and previous answer while keeping the same task', async () => {
    const c = chapter(),
      { state } = startStorySession(c, profile, null, now, 0),
      provider = teacher();
    const wrong = await turn(c, state, { type: 'answer', answer: -1 });
    const asked = await turn(
      c,
      wrong.state,
      { type: 'ask', text: 'Hva skal jeg gjøre først?' },
      provider,
    );
    expect(asked.state.active).toEqual(wrong.state.active);
    expect(asked.state.hints.level).toBe(1);
    expect(asked.state.helpHistory!.at(-1)!.question).toBe(
      'Hva skal jeg gjøre først?',
    );
    const call = provider.respond.mock.calls[0][0];
    expect(call.purpose).toBe('help');
    expect(call.input).toContain(c.missions[0].text);
    expect(call.input).toContain('lastAnswer');
    expect(asked.events.items).toHaveLength(0);
  });

  it('pauses after three wrong attempts and keeps hint/evidence/reaction history on resume', async () => {
    const c = chapter();
    let { state } = startStorySession(c, profile, null, now, 0);
    for (let i = 0; i < 3; i++)
      state = (await turn(c, state, { type: 'answer', answer: -1 })).state;
    expect(state.endedAt).toBe(now);
    expect(state.pauseOffered).toBe(true);
    expect(state.hints.level).toBe(2);
    expect(new Set(state.freeChapter.reactions).size).toBe(3);
    expect(freeStoryView(c, state, now).playing).toBe(false);
    await expect(
      turn(c, state, { type: 'answer', answer: state.active!.item.answer }),
    ).rejects.toThrow('avsluttet');
    const resumed = startStorySession(
      c,
      profile,
      state,
      '2026-10-20T10:01:00Z',
      1,
    );
    expect(resumed.state.freeChapter.failures).toBe(0);
    expect(resumed.state.freeChapter.reactions).toEqual(
      state.freeChapter.reactions,
    );
    expect(resumed.state.hints).toEqual(state.hints);
    expect(resumed.state.states).toEqual(state.states);
    expect(resumed.events.items).toHaveLength(0);
    expect(resumed.state.active!.id).toBe(state.active!.id);
    const correct = await turn(
      c,
      resumed.state,
      { type: 'answer', answer: state.active!.item.answer },
      null,
      '2026-10-20T10:01:01Z',
    );
    expect(correct.events.attempts[0].hint_level_used).toBe(2);
    expect(correct.state.freeChapter.index).toBe(0);
  });

  it('keeps the resolved task when an incremental next mission is not published yet', async () => {
    const c = chapter(),
      allMissions = [...c.missions];
    c.missions = c.missions.slice(0, 1);
    c.status = 'running';
    const { state } = startStorySession(c, profile, null, now, 0),
      provider = teacher();
    const answered = await turn(c, state, {
      type: 'answer',
      answer: state.active!.item.answer,
    });
    await expect(
      turn(c, answered.state, { type: 'next' }, provider),
    ).rejects.toBeInstanceOf(StoryNotReadyError);
    expect(answered.state.freeChapter.index).toBe(0);
    expect(answered.state.active!.resolved).toBe(true);
    c.missions = allMissions.slice(0, 2);
    const next = await turn(c, answered.state, { type: 'next' }, provider);
    expect(next.state.freeChapter.index).toBe(1);
    expect(next.state.active!.item).toEqual(c.slots[1].item);
    expect(next.state.hints.level).toBe(0);
    expect(next.events.items).toHaveLength(1);
    expect(next.events.items[0].id).toBe(next.state.active!.id);
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it('resumes story progress after a newer legacy session without replacing fresh learning states or cards', async () => {
    const c = chapter();
    let { state } = startStorySession(c, profile, null, now, 0);
    state = (
      await turn(c, state, {
        type: 'answer',
        answer: state.active!.item.answer,
      })
    ).state;
    state = (await turn(c, state, { type: 'next' })).state;
    state = (await turn(c, state, { type: 'hint' }, teacher())).state;
    const paused = (await turn(c, state, { type: 'pause' })).state;
    const latest = createSession(
      profile,
      paused,
      '2026-10-20T10:02:00Z',
      2,
      'practice',
      null,
    );
    latest.states['likhetstegn'] = {
      ...initialState(3),
      attempts: 9,
      masteredAt: '2026-10-19T10:00:00Z',
    };
    latest.cards = { ...latest.cards };
    latest.cards['likhetstegn'] = serializeCard(
      scheduleReview(null, '2026-10-20T10:02:00Z', {
        correct: true,
        hintLevel: 0,
        timeMs: 1000,
        medianMs: null,
      }),
    );
    const beforeProgress = structuredClone(paused),
      beforeLearning = structuredClone(latest);
    const resumed = startStorySession(
      c,
      profile,
      latest,
      '2026-10-20T10:03:00Z',
      3,
      paused,
    );
    expect(resumed.state.freeChapter.index).toBe(1);
    expect(resumed.state.active).toEqual(paused.active);
    expect(resumed.state.hints).toEqual(paused.hints);
    expect(resumed.state.freeChapter.reactions).toEqual(
      paused.freeChapter.reactions,
    );
    expect(resumed.state.states).toEqual(latest.states);
    expect(resumed.state.cards).toEqual(latest.cards);
    expect(resumed.state.cards).not.toEqual(paused.cards);
    expect(resumed.state.states['likhetstegn'].attempts).toBe(9);
    expect(resumed.events.items).toHaveLength(0);
    expect(paused).toEqual(beforeProgress);
    expect(latest).toEqual(beforeLearning);
  });

  it('rejects skipping an unfinished task and supports explicit pause without AI', async () => {
    const c = chapter(),
      { state } = startStorySession(c, profile, null, now, 0),
      provider = teacher();
    await expect(turn(c, state, { type: 'next' }, provider)).rejects.toThrow(
      'Fullfør',
    );
    const paused = await turn(c, state, { type: 'pause' }, provider);
    expect(paused.state.endedAt).toBe(now);
    expect(paused.completed).toBe(false);
    expect(paused.state.freeChapter.index).toBe(0);
    expect(paused.events.attempts).toHaveLength(0);
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it('stops expired learning time before answer/help and retains daily limits on start', async () => {
    const c = chapter(),
      { state } = startStorySession(c, profile, null, now, 0),
      provider = teacher();
    const expired = await turn(
      c,
      state,
      { type: 'answer', answer: state.active!.item.answer },
      provider,
      '2026-10-20T10:16:00Z',
    );
    expect(expired.state.endedAt).not.toBeNull();
    expect(expired.events.attempts).toHaveLength(0);
    expect(expired.state.states).toEqual(state.states);
    expect(provider.respond).not.toHaveBeenCalled();
    expect(() => startStorySession(c, profile, null, now, 30)).toThrow(
      'dagens øving',
    );
  });

  it('finishes only after all slots and closes the actual session on the final next', async () => {
    const c = chapter();
    let { state } = startStorySession(c, profile, null, now, 0);
    for (let i = 0; i < c.slots.length; i++) {
      const answered = await turn(c, state, {
        type: 'answer',
        answer: state.active!.item.answer,
      });
      expect(freeStoryView(c, answered.state, now).ending).toBeNull();
      const next = await turn(c, answered.state, { type: 'next' });
      expect(next.completed).toBe(i === c.slots.length - 1);
      state = next.state;
    }
    const view = freeStoryView(c, state, now);
    expect(state.endedAt).toBe(now);
    expect(state.freeChapter.index).toBe(c.slots.length);
    expect(view.ending).toBe(c.header!.ending);
    expect(view.task).toBeNull();
    expect(view.playing).toBe(false);
  });

  it.each([
    'mult-telling-grupper',
    'div-med-rest',
    'regneuttrykk-fra-situasjon',
    'algoritme-folg-instruksjon',
  ])(
    'uses the stored %s native answer without regenerating it',
    async (skillId) => {
      const c = chapter();
      c.slots[0].item = generate(skillId, 2, seededRng(15));
      c.missions[0] = reserveMission(c.slots[0], 'Verkstedet');
      const previous = createSession(profile, null, now, 0, 'practice', null);
      previous.states = Object.fromEntries(
        skills.map((s) => [
          s.id,
          { ...initialState(3), masteredAt: '2026-10-19T10:00:00Z' },
        ]),
      );
      const { state } = startStorySession(c, profile, previous, now, 0);
      const publicTask = freeStoryView(c, state, now).task!;
      expect(publicTask.answerType).toBe(c.slots[0].item.answerType);
      expect(publicTask.choices).toEqual(c.slots[0].item.choices ?? []);
      const result = await turn(c, state, {
        type: 'answer',
        answer: c.slots[0].item.answer,
      });
      expect(result.state.correct).toBe(true);
      expect(result.events.attempts[0].answer_parsed).toEqual(
        c.slots[0].item.answer,
      );
    },
  );

  it.each(['figur-2d-egenskaper', 'figur-3d-kanter-hjorner-flater'])(
    'projects only the given %s drawing data',
    (skillId) => {
      const c = chapter();
      const item = generate(skillId, 2, seededRng(20));
      c.slots[0].item = item;
      c.missions[0] = reserveMission(c.slots[0], 'Verkstedet');
      const task = freeStoryView(c, null, now).task!;
      expect(task.showVisual).toBe(true);
      expect(task.illustrationSafe).toBe(true);
      expect(task.visual).toMatchObject({
        type: skillId === 'figur-2d-egenskaper' ? 'figur2d' : 'figur3d',
        count: item.params.count,
        shape: item.params.shape,
        property: item.params.property,
        groups: 0,
        steps: [],
      });
      expect(task).not.toHaveProperty('answer');
      expect(task).not.toHaveProperty('params');
      expect(task).not.toHaveProperty('interaction');
      expect(task.visual).not.toHaveProperty('corners');
      expect(task.visual).not.toHaveProperty('faces');
    },
  );

  it('projects route instructions but never the final coordinate', () => {
    const c = chapter(),
      item = generate('algoritme-folg-instruksjon', 3, seededRng(9));
    c.slots[0].item = item;
    c.missions[0] = reserveMission(c.slots[0], 'Skogskanten');
    const task = freeStoryView(c, null, now).task!;
    expect(task.showVisual).toBe(true);
    expect(task.visual.steps).toEqual(item.params.steps);
    expect(task.visual.count).toBe(0);
    expect(task.visual).not.toHaveProperty('x');
    expect(task.visual).not.toHaveProperty('y');
    expect(task).not.toHaveProperty('answer');
  });

  it('rejects mismatched ownership, persisted maths and active chapter identity', async () => {
    const c = chapter();
    expect(() =>
      startStorySession(c, { ...profile, id: eventId() }, null, now, 0),
    ).toThrow('tilhører');
    const { state } = startStorySession(c, profile, null, now, 0);
    const wrongChapter = { ...c, id: eventId() };
    await expect(turn(wrongChapter, state, { type: 'hint' })).rejects.toThrow(
      'annet kapittel',
    );
    c.missions[0].answer = -999;
    expect(() => freeStoryView(c, state, now)).toThrow('matteplassen');
  });
});
