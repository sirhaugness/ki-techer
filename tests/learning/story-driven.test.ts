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
  storyProblemExample,
  bindStoryProblem,
} from '../../lib/engine/story-problem';
import { generate } from '../../lib/engine/skills/generators';
import { seededRng } from '../../lib/engine/random';
import type { StoryChapter } from '../../lib/learning/story-contract';
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
  it('offers a verified template example without binding a hidden answer or geometry dimension', () => {
    const geometry = generate(
      'figur-3d-kanter-hjorner-flater',
      1,
      seededRng(27),
    );
    const example = storyProblemExample(geometry)!;
    expect(example).toContain('{{count}}');
    expect(bindStoryProblem(example, geometry)).toBe(geometry.question);
    const item = generate('mult-telling-grupper', 5, seededRng(12));
    expect(Object.values(storyQuantities(item))).not.toContain(item.answer);
    expect(
      storyProblemExample({
        ...item,
        question: `${item.question} Svaret er ${item.answer}.`,
      }),
    ).toBeUndefined();
  });
  it.each(['uses', 'consumes', 'alternatives'] as const)(
    'rejects spending the choice raw material again through payoff %s',
    async (field) => {
      const provider = storyFixtureProvider();
      const respond = provider.respond.bind(provider);
      let reviews = 0;
      provider.respond = async (request) => {
        const input = JSON.parse(request.input);
        if (input.plan) reviews++;
        const reply = await respond(request);
        if (input.items) {
          const plan = reply.value as StoryChapter;
          plan.missions
            .find((m) => m.id === plan.decision.afterMission)!
            .gains.push(plan.decision.resource);
          const payoff = plan.missions.find(
            (m) => m.id === plan.decision.payoffMission,
          )!;
          if (field === 'alternatives')
            payoff.uses.push(
              ...plan.decision.options.map((option) => option.assetName),
            );
          else payoff[field].push(plan.decision.resource);
        }
        return reply;
      };
      const original = createSession(profile, null, now, 0, 'practice', null);
      const unchanged = structuredClone(original);
      await expect(
        learningTurn(
          original,
          { type: 'mood', mood: 'rolig' },
          randomUUID(),
          now,
          profile,
          [{ id: randomUUID(), label: 'Star Wars', active: true }],
          provider,
          'Bokmål.',
        ),
      ).rejects.toThrow('Fremdriften din er beholdt');
      expect(original).toEqual(unchanged);
      expect(reviews).toBe(0);
    },
  );
  it('rejects a choice funded by resources the preceding mission has already spent', async () => {
    const provider = storyFixtureProvider();
    const respond = provider.respond.bind(provider);
    provider.respond = async (request) => {
      const reply = await respond(request);
      if (JSON.parse(request.input).items) {
        const plan = reply.value as StoryChapter;
        plan.missions.find(
          (m) => m.id === plan.decision.afterMission,
        )!.resourceEffect = 'use';
      }
      return reply;
    };
    const original = createSession(profile, null, now, 0, 'practice', null);
    const unchanged = structuredClone(original);
    await expect(
      learningTurn(
        original,
        { type: 'mood', mood: 'rolig' },
        randomUUID(),
        now,
        profile,
        [{ id: randomUUID(), label: 'Dinosaurer', active: true }],
        provider,
        'Bokmål.',
      ),
    ).rejects.toThrow('Fremdriften din er beholdt');
    expect(original).toEqual(unchanged);
  });
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
    let selectedFigure: unknown;
    provider.respond = async (request) => {
      const input = JSON.parse(request.input);
      if (input.items) {
        expect(request.timeoutMs).toBeGreaterThan(1000);
        expect(request.timeoutMs).toBeLessThanOrEqual(120000);
        plans++;
        if (plans > 1) {
          expect(input.rejectedPlan.missions[0].questionTemplate).toContain(
            '{{unknown}}',
          );
          expect(input.correction.length).toBeGreaterThan(0);
        }
        const result = await respond(request);
        const plan = result.value as StoryChapter;
        const geometry = input.items.find(
          (item: { skill: string }) =>
            item.skill === 'figur-3d-kanter-hjorner-flater',
        );
        selectedFigure = geometry.figure;
        expect(selectedFigure).toMatchObject({
          shape: expect.any(String),
          property: expect.any(String),
          count: expect.any(Number),
        });
        plan.missions[1].itemIndex = geometry.index;
        plan.missions[1].questionTemplate = geometry.question.replace(
          /^Du ser \d+/,
          'Du ser {{count}}',
        );
        plan.missions[1].clueTemplate =
          'C‑3PO undersøker {{count}} 3D-figurer.';
        if (plans < 2)
          (
            result.value as { missions: { questionTemplate: string }[] }
          ).missions[0].questionTemplate += ' {{unknown}}';
        return result;
      }
      if (input.plan) {
        expect(request.purpose).toBe('story-review');
        expect(request.timeoutMs).toBeLessThanOrEqual(60000);
        expect(input.history).toBeUndefined();
        expect(input.immutableHistory.chapters).toEqual([]);
        expect(input.problems[1].figure).toEqual(selectedFigure);
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
    const secondTask = Object.values(result.state.adventures!)[0].tasks[1];
    expect(secondTask.scene!.clue).toContain('3D-figurer');
    expect(secondTask.scene!.clue).not.toContain('{{');
  });
  it('continues a saved legacy story after its current answer without replaying unstarted old tasks', async () => {
    const interest = { id: randomUUID(), label: 'Star Wars', active: true };
    const old = await learningTurn(
      createSession(profile, null, now, 0, 'practice', null),
      { type: 'next' },
      randomUUID(),
      now,
      profile,
      [interest],
      null,
      'Bokmål.',
    );
    const active = old.state.active!;
    const solved = await learningTurn(
      old.state,
      {
        type: 'answer',
        itemId: active.id,
        answer: active.expressionRequired
          ? {
              value: Number(active.item.answer),
              expression: active.item.expression!,
            }
          : active.item.answer,
        inputMode: 'tastatur',
      },
      randomUUID(),
      now,
      profile,
      [interest],
      null,
      'Bokmål.',
    );
    expect(solved.state.correct).toBe(true);
    const continued = await learningTurn(
      solved.state,
      { type: 'next' },
      randomUUID(),
      now,
      profile,
      [interest],
      storyFixtureProvider(),
      'Bokmål.',
    );
    const adventure = continued.state.adventures![interest.id];
    expect(adventure.number).toBe(2);
    expect(adventure.source).toBe('model');
    expect(adventure.saga!.chapters[0].events).toHaveLength(1);
    expect(adventure.saga!.chapters[0].events[0].outcome).toContain(
      solved.state.adventures![interest.id].memory[0],
    );
    expect(continued.state.history).toEqual(solved.state.history);
    expect(continued.events.items).toHaveLength(1);
  });
  for (const label of ['Star Wars', 'Dinosaurer'])
    it(`${label}: preserves all chapters, actual choices, quantities, pause point and continuity`, async () => {
      const interest = { id: randomUUID(), label, active: true };
      const provider = storyFixtureProvider();
      const research = vi.spyOn(provider, 'research');
      let state = createSession(profile, null, now, 0, 'practice', null);
      const respond = provider.respond.bind(provider);
      let historicalChoicesChecked = 0;
      provider.respond = async (request) => {
        const input = JSON.parse(request.input);
        if (input.plan && input.immutableHistory.chapters.length) {
          expect(input.immutableHistory.lastActualEvent).toEqual(
            state.adventures![interest.id].saga!.chapters.at(-1)!.events.at(-1),
          );
          expect(
            input.immutableHistory.chapters.map(
              (c: { choices: string[] }) => c.choices,
            ),
          ).toEqual(
            state.adventures![interest.id].saga!.chapters.map((c) => c.choices),
          );
          historicalChoicesChecked++;
        }
        return respond(request);
      };
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
          if (view.task?.scene?.branch) {
            const base =
              state.adventures![interest.id].tasks[mission].scene!.success;
            expect(view.task.scene.success).toContain(base);
            expect(
              state
                .adventures![interest.id].saga!.chapters.at(-1)!
                .events.at(-1)!.outcome,
            ).toContain(base);
          }
          const latest = state.adventures![interest.id];
          records.push(latest.saga!.chapters.at(-1)!.events.at(-1)!.id);
          if (latest.pendingChoice) {
            const choice = view.adventure!.choice!;
            // The quantity being spent can differ from the scene's subject.
            latest.story!.decision.resource = 'tau-lengder';
            expect(publicView(state).adventure!.choice!.unit).toBe(
              'tau-lengder',
            );
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
            expect(
              state
                .adventures![interest.id].saga!.chapters.at(-1)!
                .choices.at(-1),
            ).toContain('tau-lengder');
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
      expect(historicalChoicesChecked).toBe(2);
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
