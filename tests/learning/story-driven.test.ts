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
