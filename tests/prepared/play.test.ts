import { describe, it, expect, vi } from 'vitest';
import {
  preparedTurn,
  preparedView,
  startPrepared,
} from '../../lib/prepared/play';
import { createSession } from '../../lib/learning/session';
import { workSchema } from '../../lib/prepared/contracts';
import { preparedSpeech } from '../../lib/prepared/speech';
import type { Snapshot, LearnerProfile } from '../../lib/learning/types';
import type { AiProvider } from '../../lib/ai/provider';
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
const start = () => startPrepared(profile, null, now, 0);
async function turn(
  state: Snapshot,
  event: unknown,
  provider: AiProvider | null = null,
  requestId = crypto.randomUUID(),
) {
  return preparedTurn({
    state,
    event,
    requestId,
    itemId: state.preparedChapter!.itemId,
    now,
    provider,
    instructions: 'Testprompt',
  });
}
async function toProbe() {
  let s = start();
  for (let i = 0; i < 2; i++) {
    s = (await turn(s, { type: 'solution' })).state;
    s = (await turn(s, { type: 'guided-complete' })).state;
    s = (await turn(s, { type: 'next' })).state;
  }
  return s;
}
function model(
  evidence = 'relevant',
  quoteA = 'tre sendere',
  quoteB = 'tre i hver pakke',
): AiProvider {
  return {
    moderate: vi.fn(async () => true),
    respond: vi.fn(async () => ({
      calls: [],
      value: { intent: 'roles', evidence, quoteA, quoteB, safety: false },
    })),
  };
}
describe('prepared chapter authority and teaching', () => {
  it('retains an unequal but numerically complete distribution after feedback and help', async () => {
    let s = start();
    s = (
      await turn(s, {
        type: 'work',
        work: { ...s.preparedChapter!.work, value: 6, groups: [5, 6, 6, 7] },
      })
    ).state;
    const result = await turn(s, { type: 'answer' });
    expect(result.state.preparedChapter).toMatchObject({
      status: 'incorrect',
      numericCorrect: true,
      modelCorrect: false,
      work: { groups: [5, 6, 6, 7] },
    });
    expect(
      (await turn(result.state, { type: 'hint' })).state.preparedChapter!.work
        .groups,
    ).toEqual([5, 6, 6, 7]);
  });
  it('completes shield action once, keeps teaching assisted and leaves mastery unchanged', async () => {
    let s = start();
    s = (
      await turn(s, {
        type: 'work',
        work: { ...s.preparedChapter!.work, groups: [6, 6, 6, 6] },
      })
    ).state;
    const id = crypto.randomUUID();
    const r = await turn(s, { type: 'answer' }, null, id);
    expect(r.state.preparedChapter!.completed).toEqual([
      { missionId: 'SW01', assisted: true, evidence: 'not-assessed' },
    ]);
    expect(r.state.states).toEqual(s.states);
    expect(r.events.attempts[0]).toMatchObject({
      credit: 0,
      hint_level_used: 4,
    });
    expect((await turn(r.state, { type: 'answer' }, null, id)).replayed).toBe(
      true,
    );
  });
  it('rejects fabricated quantities, duplicate corners and advancing before completion', async () => {
    const s = start();
    expect(
      workSchema.safeParse({
        ...s.preparedChapter!.work,
        groups: [24, 24, 0, 0],
      }).success,
    ).toBe(false);
    expect(
      workSchema.safeParse({
        ...s.preparedChapter!.work,
        corners: [0, 0, 1, 2],
      }).success,
    ).toBe(false);
    await expect(turn(s, { type: 'next' })).rejects.toThrow('Fullfør');
  });
  it('requires the rectangle and all four corners; a four-corner parallelogram is wrong', async () => {
    let s = start();
    s = (await turn(s, { type: 'solution' })).state;
    s = (await turn(s, { type: 'guided-complete' })).state;
    s = (await turn(s, { type: 'next' })).state;
    s = (
      await turn(s, {
        type: 'work',
        work: { ...s.preparedChapter!.work, plate: 'C', corners: [0, 1, 2, 3] },
      })
    ).state;
    expect(
      (await turn(s, { type: 'answer' })).state.preparedChapter!.status,
    ).toBe('incorrect');
    s = (
      await turn(s, {
        type: 'work',
        work: { ...s.preparedChapter!.work, plate: 'B', corners: [0, 1, 2, 3] },
      })
    ).state;
    expect(
      (await turn(s, { type: 'answer' })).state.preparedChapter!.status,
    ).toBe('correct');
  });
  it('preserves partial work, probe progress and assistance across pause and ordinary practice', async () => {
    let s = await toProbe();
    s = (
      await turn(s, {
        type: 'probe',
        probeId: 'SW19-divisor-roles',
        text: 'Begge blir seks',
      })
    ).state;
    const p = structuredClone(s.preparedChapter);
    s = (await turn(s, { type: 'pause' })).state;
    const practice = createSession(profile, s, now, 0, 'practice', null);
    expect(practice.preparedChapter).toEqual(p);
    expect(practice.preparedActive).toBeUndefined();
    practice.endedAt = now;
    const resumed = startPrepared(profile, practice, now, 0);
    expect(resumed.preparedChapter).toEqual(p);
    expect(resumed.id).not.toBe(s.id);
  });
  it('does not accept an ordinary question as evidence and caps probe follow-ups', async () => {
    let s = await toProbe();
    const provider = model();
    s = (
      await turn(
        s,
        { type: 'ask', text: 'Hvordan kan jeg vise dette?' },
        provider,
      )
    ).state;
    expect(s.preparedChapter).toMatchObject({
      assisted: true,
      evidence: 'not-assessed',
      status: 'working',
    });
    const weak = model('insufficient', '', '');
    for (let i = 0; i < 3; i++)
      s = (
        await turn(
          s,
          {
            type: 'probe',
            probeId: 'SW19-divisor-roles',
            text: 'Begge blir seks',
          },
          weak,
        )
      ).state;
    expect(s.preparedChapter).toMatchObject({
      followUps: 1,
      helpLevel: 3,
      evidence: 'insufficient',
      status: 'working',
    });
    s = (await turn(s, { type: 'guided-complete' })).state;
    expect(s.preparedChapter!.completed.at(-1)).toMatchObject({
      assisted: true,
      evidence: 'insufficient',
    });
  });
  it('grounds semantic model assessment in actual learner quotes; fallback awards nothing', async () => {
    const s = await toProbe();
    const response = {
      type: 'probe',
      probeId: 'SW19-divisor-roles',
      text: 'A har tre sendere. B har tre i hver pakke.',
    };
    expect(
      (await turn(s, response, model())).state.preparedChapter,
    ).toMatchObject({
      evidence: 'relevant',
      status: 'correct',
      assisted: false,
    });
    expect(
      (await turn(s, response, model('relevant', 'oppspinn', 'finnes ikke')))
        .state.preparedChapter,
    ).toMatchObject({ evidence: 'not-assessed', status: 'working' });
    expect((await turn(s, response)).state.preparedChapter!.evidence).toBe(
      'not-assessed',
    );
    await expect(
      preparedTurn({
        state: s,
        event: response,
        requestId: crypto.randomUUID(),
        itemId: crypto.randomUUID(),
        now,
        provider: model(),
      }),
    ).rejects.toThrow('endret');
  });
  it('accepts grounded alternative wording classified by the role rubric', async () => {
    const s = await toProbe();
    const result = await turn(
      s,
      {
        type: 'probe',
        probeId: 'SW19-divisor-roles',
        text: 'A er hvor mange som deler. B er hvor mange i hver.',
      },
      model('relevant', 'hvor mange som deler', 'hvor mange i hver'),
    );
    expect(result.state.preparedChapter).toMatchObject({
      evidence: 'relevant',
      status: 'correct',
      assisted: false,
      probeRoles: { a: true, b: true },
    });
  });
  it('rejects result-only or identical quotations even if the model claims relevant', async () => {
    const s = await toProbe();
    for (const [text, a, b] of [
      ['6 og 6', '6', '6'],
      ['Begge blir seks', 'Begge blir', 'seks'],
      ['Begge blir seks', 'Begge blir seks', 'Begge blir seks'],
    ]) {
      const result = await turn(
        s,
        {
          type: 'probe',
          probeId: 'SW19-divisor-roles',
          text,
        },
        model('relevant', a, b),
      );
      expect(result.state.preparedChapter).toMatchObject({
        evidence: 'not-assessed',
        status: 'working',
        probeRoles: { a: false, b: false },
      });
    }
  });
  it('combines short role answers on the same probe without treating them as help', async () => {
    let state = await toProbe();
    state = (
      await turn(
        state,
        {
          type: 'probe',
          probeId: 'SW19-divisor-roles',
          text: 'A har tre sendere',
        },
        model('partial', 'tre sendere', ''),
      )
    ).state;
    expect(state.preparedChapter).toMatchObject({
      probeRoles: { a: true, b: false },
      followUps: 1,
      assisted: false,
    });
    state = (await turn(state, { type: 'pause' })).state;
    state = startPrepared(profile, state, now, 0);
    state = (
      await turn(
        state,
        {
          type: 'probe',
          probeId: 'SW19-divisor-roles',
          text: 'Tre i hver pakke',
        },
        model('partial', '', 'Tre i hver pakke'),
      )
    ).state;
    expect(state.preparedChapter).toMatchObject({
      probeRoles: { a: true, b: true },
      evidence: 'relevant',
      status: 'correct',
      assisted: false,
    });
  });
  it('accepts structured roles and a meaningful demonstration without requiring writing', async () => {
    let s = await toProbe();
    s = (
      await turn(s, {
        type: 'work',
        work: {
          ...s.preparedChapter!.work,
          roleA: 'recipients',
          roleB: 'size',
          demonstration: 'three-recipients',
        },
      })
    ).state;
    expect(
      (await turn(s, { type: 'answer' })).state.preparedChapter!.status,
    ).toBe('incorrect');
    s = (
      await turn(s, {
        type: 'work',
        work: { ...s.preparedChapter!.work, demonstration: 'one-pack' },
      })
    ).state;
    expect(
      (await turn(s, { type: 'answer' })).state.preparedChapter!.evidence,
    ).toBe('relevant');
  });
  it('enforces time, blocks another open experience and protects the public projection', async () => {
    const s = start();
    await expect(
      Promise.resolve().then(() =>
        startPrepared(
          profile,
          createSession(profile, null, now, 0, 'practice', null),
          now,
          0,
        ),
      ),
    ).rejects.toThrow('vanlige');
    const late = await preparedTurn({
      state: s,
      event: { type: 'answer' },
      requestId: crypto.randomUUID(),
      itemId: s.preparedChapter!.itemId,
      now: '2026-10-20T11:00:00Z',
    });
    expect(late.state.preparedActive).toBe(false);
    expect(late.events.attempts).toHaveLength(0);
    const view = preparedView(s);
    expect(view).not.toHaveProperty('checkedSolution');
    expect(view).not.toHaveProperty('completed');
    expect(preparedSpeech(view)).toContain('24 energibrikker');
  });
});
