import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  createSession,
  learningTurn,
  publicView,
} from '../../lib/learning/session';
import { storyFixtureProvider } from '../../lib/learning/story-fixture';
import {
  storyQuantities,
  validateStoryProblem,
} from '../../lib/engine/story-problem';
import { generate } from '../../lib/engine/skills/generators';
import { seededRng } from '../../lib/engine/random';
import type { LearningEvent, Snapshot } from '../../lib/learning/types';

const now = '2026-10-14T20:00:00Z';
const profile = {
  id: randomUUID(),
  householdId: randomUUID(),
  firstName: 'Leo',
  tutorName: 'Lumi',
  grade: 4,
  avatar: 'spire',
  settings: {},
};

describe('story-driven saga', () => {
  it('binds quantities without giving away the answer or accepting new mathematical facts', () => {
    const item = generate('div-deling-konkret', 1, seededRng(4));
    expect(storyQuantities(item)).not.toHaveProperty('each');
    expect(storyQuantities(item)).not.toHaveProperty('a');
    expect(
      validateStoryProblem(
        'R2-D2 har {{total}} deler til {{groups}} vinger. Hvor mange får hver?',
        item,
      ),
    ).toBe(true);
    expect(
      validateStoryProblem('Fordel {{total}} deler i 999 vinger.', item),
    ).toBe(false);
    expect(validateStoryProblem('Hver vinge får {{each}} deler.', item)).toBe(
      false,
    );
  });
  it('keeps native remainder and shopping answers out of story quantities', () => {
    const rest = generate('div-med-rest', 2, seededRng(4));
    expect(storyQuantities(rest)).toEqual({
      total: rest.params.total,
      b: rest.params.b,
    });
    expect(
      validateStoryProblem(
        'Fordel {{total}} krystaller med {{b}} i hver pose. Hvor mange fulle poser og hvor mye til overs?',
        rest,
      ),
    ).toBe(true);
    expect(
      validateStoryProblem('{{total}} {{b}} {{a}} {{remainder}}', rest),
    ).toBe(false);
    const trade = generate('hverdag-handel', 2, seededRng(4));
    expect(storyQuantities(trade)).not.toHaveProperty('c');
    expect(
      validateStoryProblem(
        'Du har {{budget}} kreditter og kjøper {{a}} deler til {{b}} hver. Hvor mye har du igjen?',
        trade,
      ),
    ).toBe(true);
    const solid = generate('figur-3d-kanter-hjorner-flater', 2, seededRng(4));
    expect(validateStoryProblem('Undersøk {{count}} 3D-figurer.', solid)).toBe(
      true,
    );
    expect(
      validateStoryProblem(
        'Undersøk {{count}} 3D-figurer med 999 flater.',
        solid,
      ),
    ).toBe(false);
    const unknown = generate('hverdag-ukjent', 2, seededRng(4));
    expect(storyQuantities(unknown)).not.toHaveProperty('a');
    expect(
      validateStoryProblem(
        'Du sparer {{b}} hver dag og har {{total}}. Hvor mange dager?',
        unknown,
      ),
    ).toBe(true);
  });
  it('resumes an existing item after a new session and interest switch without inserting its ID twice', async () => {
    const provider = storyFixtureProvider();
    const interest = { id: randomUUID(), label: 'Star Wars', active: true };
    const dinosaur = { id: randomUUID(), label: 'Dinosaurer', active: true };
    const step = (
      state: Snapshot,
      event: LearningEvent,
      interests = [interest],
    ) =>
      learningTurn(
        state,
        event,
        randomUUID(),
        now,
        profile,
        interests,
        provider,
        'Bokmål.',
      );
    const created = await step(
      createSession(profile, null, now, 0, 'practice', null),
      { type: 'mood', mood: 'rolig' },
    );
    expect(created.events.items).toHaveLength(1);
    const originalItem = created.state.active!.id;
    const ended = await step(created.state, {
      type: 'end',
      mood: 'rolig',
      reflection: '',
    });
    const resumed = await step(
      createSession(profile, ended.state, now, 0, 'practice', null),
      { type: 'mood', mood: 'rolig' },
    );
    expect(resumed.state.active!.id).toBe(originalItem);
    expect(resumed.events.items).toHaveLength(0);
    const switched = await step(resumed.state, { type: 'next' }, [
      { ...interest, active: false },
      dinosaur,
    ]);
    expect(switched.events.items).toHaveLength(1);
    const returned = await step(switched.state, { type: 'next' }, [
      interest,
      { ...dinosaur, active: false },
    ]);
    expect(returned.state.active!.id).toBe(originalItem);
    expect(returned.events.items).toHaveLength(0);
  });
  it('gives the model its rejected draft with the concrete correction and commits only a valid chapter', async () => {
    const provider = storyFixtureProvider();
    const respond = provider.respond.bind(provider);
    let plans = 0;
    provider.respond = async (request) => {
      const input = JSON.parse(request.input);
      if (input.items) {
        plans++;
        if (plans === 2) {
          expect(input.rejectedPlan.missions[0].questionTemplate).toContain(
            '{{unknown}}',
          );
          expect(input.correction.length).toBeGreaterThan(0);
        }
        const result = await respond(request);
        if (plans === 1)
          (
            result.value as { missions: { questionTemplate: string }[] }
          ).missions[0].questionTemplate += ' {{unknown}}';
        return result;
      }
      return respond(request);
    };
    const result = await learningTurn(
      createSession(profile, null, now, 0, 'practice', null),
      { type: 'mood', mood: 'rolig' },
      randomUUID(),
      now,
      profile,
      [{ id: randomUUID(), label: 'Star Wars', active: true }],
      provider,
      'Bokmål.',
    );
    expect(plans).toBe(2);
    expect(publicView(result.state).task!.question).not.toContain('unknown');
    expect(result.events.items).toHaveLength(1);
  });
  for (const label of ['Star Wars', 'Dinosaurer'])
    it(`${label}: preserves all chapters, actual choices, quantities, pause point and continuity`, async () => {
      const interest = { id: randomUUID(), label, active: true };
      const provider = storyFixtureProvider();
      const research = vi.spyOn(provider, 'research');
      let state = createSession(profile, null, now, 0, 'practice', null);
      const turn = async (event: LearningEvent) => {
        state = (
          await learningTurn(
            state,
            event,
            randomUUID(),
            now,
            profile,
            [interest],
            provider,
            'Bokmål.',
          )
        ).state;
        state = JSON.parse(JSON.stringify(state)) as Snapshot;
        return publicView(state);
      };
      await turn({ type: 'mood', mood: 'rolig' });
      expect(state.adventures![interest.id].source).toBe('model');
      const title = state.adventures![interest.id].saga!.title;
      const records: string[] = [];
      for (let chapter = 1; chapter <= 3; chapter++) {
        const adventure = state.adventures![interest.id];
        expect(adventure.number).toBe(chapter);
        expect(
          new Set(adventure.story!.missions.map((m) => m.action)).size,
        ).toBeGreaterThanOrEqual(3);
        if (chapter > 1)
          expect(adventure.story!.missions[0].follows[0]).toBe(records.at(-1));
        for (let mission = 0; mission < 6; mission++) {
          const active = state.active!;
          if (chapter === 1 && mission === 0) {
            active.scene!.retry =
              'Bruk {{groups}} grupper med {{each}} i hver.';
            expect(publicView(state).task!.scene!.retry).not.toMatch(/[{}]/);
            const wrong = await turn({
              type: 'answer',
              itemId: active.id,
              answer: 999,
              inputMode: 'tastatur',
            });
            expect(wrong.correct).toBe(false);
            expect(
              state.adventures![interest.id].saga!.chapters[0].events,
            ).toHaveLength(0);
          }
          const allocations =
            active.interaction?.kind === 'grouping'
              ? Array.from(
                  { length: active.interaction.math.groups },
                  () => active.interaction!.math.each,
                )
              : undefined;
          const answer = active.expressionRequired
            ? {
                value: Number(active.item.answer),
                expression: active.item.expression!.replaceAll('*', 'x'),
              }
            : allocations
              ? { value: Number(active.item.answer), allocations }
              : active.item.answer;
          const view = await turn({
            type: 'answer',
            itemId: active.id,
            answer,
            inputMode: 'manipulativ',
          });
          expect(view.correct).toBe(true);
          const latest = state.adventures![interest.id];
          records.push(latest.saga!.chapters.at(-1)!.events.at(-1)!.id);
          if (latest.pendingChoice) {
            const choice = view.adventure!.choice!;
            await turn({
              type: 'choice',
              itemId: active.id,
              option: 0,
              remaining: 999,
            });
            expect(state.adventures![interest.id].pendingChoice).toBe(true);
            await turn({
              type: 'choice',
              itemId: active.id,
              option: 0,
              remaining: choice.budget - choice.options[0].cost,
            });
          }
          if (mission < 5 || chapter < 3) await turn({ type: 'next' });
        }
      }
      const saga = state.adventures![interest.id].saga!;
      expect(saga.title).toBe(title);
      expect(saga.chapters).toHaveLength(3);
      expect(saga.chapters.flatMap((c) => c.events)).toHaveLength(18);
      expect(saga.chapters.every((c) => c.choices.length === 1)).toBe(true);
      expect(saga.inventory).toContain(
        label === 'Star Wars'
          ? 'Jawaenes adgangsbrikke'
          : 'Et fossil fra elven',
      );
      expect(research).toHaveBeenCalledTimes(1);
      expect(research).toHaveBeenCalledWith(label);
    });
  it('rejects story/quantity errors and retains the original state if generation fails', async () => {
    const interest = { id: randomUUID(), label: 'Star Wars', active: true };
    const provider = storyFixtureProvider();
    const respond = provider.respond;
    provider.respond = async (request) => {
      const reply = await respond(request);
      if (!JSON.parse(request.input).plan)
        (
          reply.value as { missions: { questionTemplate: string }[] }
        ).missions[0].questionTemplate = 'Du trenger 999 deler. Hvor mange?';
      return reply;
    };
    const state = createSession(profile, null, now, 0, 'practice', null);
    await expect(
      learningTurn(
        state,
        { type: 'mood', mood: 'rolig' },
        randomUUID(),
        now,
        profile,
        [interest],
        provider,
        '',
      ),
    ).rejects.toThrow('Eventyret ble ikke klart');
    expect(state.adventures).toEqual({});
    expect(state.active).toBeNull();
  });
});
