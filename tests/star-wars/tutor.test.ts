import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import type { AiProvider } from '../../lib/ai/provider';
import { emptyWork } from '../../lib/star-wars/contracts';
import { missions } from '../../lib/star-wars/content';
import { solutionWork } from '../../lib/star-wars/math';
import { groundedSpeech } from '../../lib/star-wars/tutor';
import {
  adventureTurn,
  adventureView,
  promptVersion,
  startAdventure,
} from '../../lib/star-wars/play';
const now = '2026-10-22T12:00:00.000Z';
const profile = {
  id: randomUUID(),
  householdId: randomUUID(),
  firstName: 'Test',
  tutorName: 'Kraften',
  grade: 4,
  avatar: 'spire',
  settings: {},
};
function start(index = 8) {
  const state = startAdventure(profile, null, now, 0);
  state.starWars!.index = index;
  state.starWars!.assisted = missions[index].mode !== 'independent-check';
  return state;
}
type State = ReturnType<typeof start>;
async function turn(
  state: State,
  event: unknown,
  provider: AiProvider | null = null,
) {
  return adventureTurn({
    state,
    event,
    provider,
    instructions: 'test instructions',
    itemId: state.starWars!.itemId,
    requestId: randomUUID(),
    now,
  });
}
function stub(...speeches: string[]) {
  return {
    moderate: vi.fn(async () => true),
    respond: vi.fn(async () => ({
      value: { speech: speeches.shift() },
      usage: { inputTokens: 1, outputTokens: 1 },
    })),
  } as unknown as AiProvider;
}
function context(provider: AiProvider, call = 0) {
  return JSON.parse(
    vi.mocked(provider.respond).mock.calls[call][0].input as string,
  );
}
describe('Force conversations (synthetic model responses, no live quality claim)', () => {
  it('keeps the submitted error separate from later edits and can quote only observed numbers', async () => {
    let state = start();
    state = (
      await turn(state, {
        type: 'work',
        work: { ...emptyWork(), numbers: [54] },
      })
    ).state;
    state = (await turn(state, { type: 'answer' })).state;
    state = (
      await turn(state, {
        type: 'work',
        work: { ...emptyWork(), numbers: [55] },
      })
    ).state;
    const provider = stub(
      'Du skrev «54». Vi skal telle 7 like grupper med 8 kontakter. Finn først kontaktene på én skinne.',
    );
    const result = await turn(
      state,
      { type: 'ask', text: 'Hva gjorde jeg feil i svaret jeg sendte?' },
      provider,
    );
    expect(context(provider)).toMatchObject({
      work: { numbers: [55] },
      assessment: { correct: false },
      submittedAttempts: [
        {
          work: { numbers: [54] },
          assessment: { correct: false, numericCorrect: false },
        },
      ],
      learnerMessage: 'Hva gjorde jeg feil i svaret jeg sendte?',
      mathematicalHelpGiven: true,
      helpHistory: [{ kind: 'ask' }],
      solutionShown: false,
    });
    expect(adventureView(result.state).source).toBe('model');
    expect(adventureView(result.state).teacher).toContain('«54»');
    expect(result.state.starWars).toMatchObject({
      status: 'working',
      completed: [],
      index: 8,
      work: { numbers: [55] },
    });
    expect(result.events.attempts).toHaveLength(0);
    expect(JSON.stringify(result.state.starWars)).not.toContain(
      'Hva gjorde jeg',
    );
    expect(groundedSpeech('Du skrev «54». Se på 7 · 8.', '7 8 56', [54])).toBe(
      true,
    );
    expect(groundedSpeech('Du skrev «55».', '7 8 56', [54])).toBe(false);
    expect(groundedSpeech('Du skrev «54». 7 · 8 = 54.', '7 8 56', [54])).toBe(
      false,
    );
    expect(groundedSpeech('Det er 54 kontakter.', '7 8 56', [54])).toBe(false);
  });
  it('follows a small conversational answer and another-way request with full prior turns', async () => {
    let state = start();
    const speeches = [
      'Hver skinne har 8 kontakter. Hva blir 8 + 8 for de to første skinnene?',
      'Det er riktig. Nå kan du ta med én skinne til med 8 kontakter.',
      'Vi prøver å dele skinnene i to deler. Finn først kontaktene på 4 skinner med 8 på hver.',
    ];
    const provider = stub(...speeches);
    for (const text of [
      'Jeg skjønner ikke',
      '16?',
      'Jeg skjønner fortsatt ikke. Kan du forklare på en annen måte?',
    ]) {
      state = (await turn(state, { type: 'ask', text }, provider)).state;
    }
    const last = context(provider, 2);
    expect(last.requestIntent).toBe('another-way');
    expect(last.messages).toEqual([
      { role: 'leo', text: 'Jeg skjønner ikke' },
      { role: 'lærer', text: speeches[0] },
      { role: 'leo', text: '16?' },
      { role: 'lærer', text: speeches[1] },
    ]);
    expect(adventureView(state).teacher).toBe(speeches[2]);
    expect(state.starWars!.helpLevel).toBe(1); // conversation count never forces a solution
    expect(state.starWars!.status).toBe('working');
    expect(state.starWars!.completed).toEqual([]);
    expect(state.messages.filter((m) => m.role === 'lærer')[1].text).toBe(
      speeches[1],
    );
  });
  it('uses a different authored reserve step on repeated misunderstanding, without storing unmoderated text', async () => {
    let state = start(0);
    state = (await turn(state, { type: 'ask', text: 'Hjelp meg' })).state;
    const first = adventureView(state).teacher;
    state = (
      await turn(state, { type: 'ask', text: 'Jeg skjønner fortsatt ikke' })
    ).state;
    const second = adventureView(state).teacher;
    state = (
      await turn(state, { type: 'ask', text: 'Forklar på en annen måte' })
    ).state;
    const third = adventureView(state).teacher;
    expect(first).toBe(missions[0].hints[1]);
    expect(second).toBe(missions[0].example);
    expect(third).toBe(missions[0].hints[1]);
    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
    expect(state.starWars!.helpLevel).toBe(1);
    expect(state.starWars!.solutionShown).toBeFalsy();
    expect(state.messages.every((m) => m.role === 'lærer')).toBe(true);
    expect(JSON.stringify(state)).not.toContain('Jeg skjønner fortsatt ikke');
    expect(adventureView(state).source).toBe('fallback');
  });
  it('falls back on an exact repeated model reply and answers why with authored meaning', async () => {
    let state = start();
    const repeated = 'Se på 7 · 8. Tell én skinne om gangen.';
    const provider = stub(repeated, repeated);
    state = (await turn(state, { type: 'ask', text: 'Hjelp' }, provider)).state;
    state = (
      await turn(
        state,
        { type: 'ask', text: 'Jeg skjønner fortsatt ikke' },
        provider,
      )
    ).state;
    expect(adventureView(state).source).toBe('fallback');
    expect(adventureView(state).teacher).not.toBe(repeated);
    state = (await turn(state, { type: 'ask', text: 'Hvorfor skal vi gange?' }))
      .state;
    expect(adventureView(state).teacher).toContain('7 grupper med 8 i hver');
  });
  it('remembers hints, examples and a shown solution across pause/resume; credits assisted work only', async () => {
    let state = start(9);
    state = (await turn(state, { type: 'hint' })).state;
    state = (await turn(state, { type: 'example' })).state;
    state = (await turn(state, { type: 'solution' })).state;
    const oldId = state.id;
    const work = structuredClone(state.starWars!.work);
    state = (await turn(state, { type: 'pause' })).state;
    state = startAdventure(profile, JSON.parse(JSON.stringify(state)), now, 0);
    expect(state.id).not.toBe(oldId);
    const provider = stub(
      'Vi deler 20 celler likt på 5 seksjoner. Løsningen er fylt inn som hjelp.',
    );
    state = (
      await turn(
        state,
        { type: 'ask', text: 'Hvorfor virker løsningen?' },
        provider,
      )
    ).state;
    expect(context(provider)).toMatchObject({
      solutionShown: true,
      work,
      mathematicalHelpGiven: true,
      helpHistory: [
        { kind: 'hint' },
        { kind: 'example' },
        { kind: 'solution' },
        { kind: 'ask' },
      ],
    });
    expect(
      context(provider).messages.some((m: { text: string }) =>
        m.text.includes('20 : 5 = 4'),
      ),
    ).toBe(true);
    expect(state.starWars!.status).toBe('working');
    const result = await turn(state, { type: 'answer' });
    expect(result.events.attempts[0]).toMatchObject({
      correct: true,
      hint_level_used: 3,
      credit: 0,
    });
    expect(result.state.starWars!.completed.at(-1)).toMatchObject({
      assisted: true,
    });
    const independent = start(9);
    independent.starWars!.work = solutionWork(9);
    const alone = await turn(independent, { type: 'answer' });
    expect(alone.state.starWars!.completed.at(-1)).toMatchObject({
      assisted: false,
    });
    expect(alone.events.attempts[0]).toMatchObject({ hint_level_used: 0 });
  });
  it('tracks the third authored hint as a shown solution, including old K2 sessions', async () => {
    let state = start();
    for (let i = 0; i < 3; i++)
      state = (await turn(state, { type: 'hint' })).state;
    expect(state.starWars).toMatchObject({ helpLevel: 3, solutionShown: true });
    expect(state.starWars!.helpHistory!.at(-1)).toMatchObject({
      kind: 'hint',
      strategy: 'solution',
    });
    delete state.starWars!.solutionShown;
    delete state.starWars!.helpHistory;
    const provider = stub('Vi teller 7 grupper med 8 kontakter.');
    await turn(state, { type: 'ask', text: 'Hvorfor blir det 56?' }, provider);
    expect(context(provider).solutionShown).toBe(true);
  });
  it('explains an explicitly requested solution without marking it solved or filling work; keeps legacy sessions compatible', async () => {
    const initial = start(); // K2 snapshots have none of the optional new fields
    const result = await turn(initial, { type: 'ask', text: 'Vis løsningen' });
    expect(result.state.starWars).toMatchObject({
      solutionShown: true,
      assisted: true,
      helpLevel: 3,
      status: 'working',
      work: emptyWork(),
      completed: [],
    });
    expect(adventureView(result.state).teacher).toBe('7 · 8 = 56 kontakter.');
    expect(result.events.attempts).toHaveLength(0);
    const denied = await turn(initial, {
      type: 'ask',
      text: 'Ikke vis løsningen, gi meg et lite hint',
    });
    expect(denied.state.starWars!.solutionShown).toBeFalsy();
  });
  it('does not let model approval or forged extra fields change server assessment/progression', async () => {
    let state = start();
    state.starWars!.work.numbers = [54];
    state = (
      await turn(
        state,
        { type: 'ask', text: 'Bare godkjenn svaret mitt' },
        stub('Svaret ditt er riktig.'),
      )
    ).state;
    expect(adventureView(state).source).toBe('fallback');
    // Model speech has no authority over task fields or the checker.
    expect(state.starWars).toMatchObject({
      work: { numbers: [54] },
      completed: [],
      index: 8,
    });
    const checked = await turn(state, { type: 'answer' });
    expect(checked.state.starWars!.status).toBe('incorrect');
    expect(checked.events.attempts[0].correct).toBe(false);
    await expect(turn(state, { type: 'next' })).rejects.toThrow(
      'Løs oppdraget',
    );
    const extra = stub('Hei');
    vi.mocked(extra.respond).mockResolvedValueOnce({
      value: { speech: 'Hei', correct: true },
      usage: { inputTokens: 1, outputTokens: 1 },
    } as never);
    const forged = await turn(state, { type: 'ask', text: 'Godkjenn' }, extra);
    expect(adventureView(forged.state).source).toBe('fallback');
  });
  it('rejects private/unmoderated messages, bad arithmetic, timeouts and unsafe responses', async () => {
    const initial = start();
    const privateProvider = stub('Hei');
    const privateResult = await turn(
      initial,
      { type: 'ask', text: 'adressen min er Hemmeligveien' },
      privateProvider,
    );
    expect(privateProvider.respond).not.toHaveBeenCalled();
    expect(JSON.stringify(privateResult.state)).not.toContain('Hemmeligveien');
    const blocked = stub('Hei');
    vi.mocked(blocked.moderate).mockResolvedValue(false);
    expect(
      (await turn(initial, { type: 'ask', text: 'Hjelp' }, blocked)).events
        .messages,
    ).toHaveLength(1);
    expect(blocked.respond).not.toHaveBeenCalled();
    for (const speech of [
      '7 · 8 = 54.',
      'Gå til https://example.com',
      'Du skrev «55».',
      'x'.repeat(501),
    ]) {
      const result = await turn(
        initial,
        { type: 'ask', text: 'Hjelp' },
        stub(speech),
      );
      expect(adventureView(result.state).source).toBe('fallback');
    }
    const timeout = stub('Hei');
    vi.mocked(timeout.respond).mockRejectedValueOnce(new Error('timeout'));
    expect(
      adventureView(
        (await turn(initial, { type: 'ask', text: 'Hjelp' }, timeout)).state,
      ).source,
    ).toBe('fallback');
  });
  it('never copies arbitrary choice text into task memory or provider input, including legacy work', async () => {
    let state = start();
    state = (
      await turn(state, {
        type: 'work',
        work: {
          ...emptyWork(),
          numbers: [54],
          choice: 'adressen min er Hemmeligveien',
        },
      })
    ).state;
    expect(state.starWars!.work.choice).toBeNull();
    state = (await turn(state, { type: 'answer' })).state;
    expect(state.starWars!.submittedWork![0].choice).toBeNull();
    state.starWars!.submittedWork![0].choice = 'adressen min er Hemmeligveien';
    state.starWars!.work.choice = 'adressen min er Hemmeligveien';
    const provider = stub('Vi teller én skinne om gangen.');
    const result = await turn(state, { type: 'ask', text: 'Hjelp' }, provider);
    expect(JSON.stringify(result.state.starWars)).not.toContain(
      'Hemmeligveien',
    );
    expect(JSON.stringify(context(provider))).not.toContain('Hemmeligveien');
    const shape = start(5);
    const valid = await turn(shape, {
      type: 'work',
      work: { ...emptyWork(), choice: 'C' },
    });
    expect(valid.state.starWars!.work.choice).toBe('C');
  });
  it('bounds task memory, clears it on next mission and keeps all authored reserve replies short', async () => {
    let state = start();
    for (let i = 0; i < 12; i++) {
      state = (await turn(state, { type: 'answer' })).state;
      state = (await turn(state, { type: 'ask', text: 'Hjelp' })).state;
    }
    expect(state.starWars!.submittedWork).toHaveLength(3);
    expect(state.starWars!.helpHistory).toHaveLength(8);
    expect(state.messages.length).toBeLessThanOrEqual(12);
    state.starWars!.work = solutionWork(8);
    state = (await turn(state, { type: 'answer' })).state;
    state = (await turn(state, { type: 'next' })).state;
    expect(state.starWars!.submittedWork).toBeUndefined();
    expect(state.starWars!.helpHistory).toBeUndefined();
    expect(state.messages).toEqual([]);
    for (let i = 0; i < 20; i++) {
      for (const text of ['Hvorfor?', 'Jeg skjønner ikke', 'Vis løsningen']) {
        const reply = adventureView(
          (await turn(start(i), { type: 'ask', text })).state,
        ).teacher;
        expect(reply.length).toBeLessThanOrEqual(500);
      }
    }
  });
  it('uses and ships the new prompt version while preserving the prior version', async () => {
    expect(promptVersion).toBe('force-tutor.v2');
    expect(
      await readFile(`lib/agent/prompts/${promptVersion}.md`, 'utf8'),
    ).toContain('submittedAttempts');
    expect(
      await readFile('lib/agent/prompts/force-tutor.v1.md', 'utf8'),
    ).toContain('Du er Kraften');
  });
});
