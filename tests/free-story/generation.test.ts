import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChapterFragments,
  missionIssues,
  produceChapter,
  type ChapterSource,
} from '../../lib/free-story/generation';
import type {
  ApprovedMission,
  MathSlot,
  StoryHeader,
  StoryMission,
} from '../../lib/free-story/types';

const header: StoryHeader = {
  title: 'Leos romfart',
  summary: 'Leo følger lyset hjem.',
  setting: 'romfart',
  opening: 'Leo drar på romfart for å finne lyset.',
  ending: 'Reisen ender ved den trygge romhavnen.',
};
const slots: MathSlot[] = Array.from({ length: 20 }, (_, index) => ({
  id: `slot-${index}`,
  index,
  reason: 'learning',
  item: {
    skillId: 'addisjon',
    difficulty: 2,
    params: { a: 20, b: index + 2 },
    answer: 22 + index,
    answerType: 'number',
    expression: `20+${index + 2}`,
    question: `Hvor mange er 20 + ${index + 2}?`,
    representationHints: [],
    commonWrongAnswers: [],
  },
}));
const mission = (index: number): StoryMission => {
  const label = String.fromCharCode(65 + index);
  const slot = slots[index];
  return {
    slotId: slot.id,
    skillId: slot.item.skillId,
    difficulty: slot.item.difficulty,
    text: `Leo undersøker lasterom ${label}.`,
    place: `Romstasjon ${label}`,
    art: 'space',
    question: slot.item.question,
    expression: slot.item.expression,
    answer: slot.item.answer,
    hint: `Tegn lastene fra rom ${label}.`,
    success: `Døren i rom ${label} åpner seg.`,
    retry: `Undersøk lasten i rom ${label} på nytt.`,
  };
};
const allMissions = () => slots.map((_, index) => mission(index));
const response = (missions = allMissions(), h = header) =>
  JSON.stringify({ ...h, missions });
const sourceFor = (value: string): ChapterSource =>
  async function* () {
    yield value;
  };
const run = (
  source: ChapterSource,
  extra: Partial<Parameters<typeof produceChapter>[0]> = {},
) =>
  produceChapter({
    slots,
    interests: ['romfart'],
    previousSummary: 'Leo fant et lys.',
    deadline: Date.now() + 90_000,
    source,
    publish: vi.fn(async () => {}),
    ...extra,
  });

afterEach(() => {
  vi.useRealTimers();
});

describe('incremental chapter fragments', () => {
  it.each([1, 2, 7, 101])(
    'parses escaped quotes, braces and unicode across chunks of %i',
    (width) => {
      const missions = allMissions();
      missions[0].text = 'Leo ser skiltet "åpne {døren}" og en \\ bak pilen.';
      const raw = response(missions),
        parser = new ChapterFragments();
      let actualHeader: Record<string, string> = {};
      const actualMissions: unknown[] = [];
      for (let i = 0; i < raw.length; i += width) {
        const chunk = parser.push(raw.slice(i, i + width));
        actualHeader = chunk.header;
        actualMissions.push(...chunk.missions);
      }
      expect(actualHeader).toEqual(header);
      expect(actualMissions).toEqual(missions);
    },
  );
  it('bounds input and rejects a mismatched JSON structure', () => {
    expect(() => new ChapterFragments().push('x'.repeat(256_001))).toThrow();
    expect(() => new ChapterFragments().push('{]')).toThrow();
  });
});

describe('math and story guards', () => {
  it('requires every given number, the verified expression and answer', () => {
    expect(missionIssues(mission(0), slots[0], new Set())).toEqual([]);
    expect(
      missionIssues(
        { ...mission(0), question: 'Hvor mange blir det?' },
        slots[0],
        new Set(),
      ).join(),
    ).toContain('gitte tall');
    expect(
      missionIssues(
        { ...mission(0), question: 'Hva er 20 + 9?' },
        slots[0],
        new Set(),
      ).join(),
    ).toContain('gitte tall');
    expect(
      missionIssues({ ...mission(0), answer: 99 }, slots[0], new Set()).join(),
    ).toContain('kontrollerte svar');
    expect(
      missionIssues(
        { ...mission(0), expression: '20-2' },
        slots[0],
        new Set(),
      ).join(),
    ).toContain('uttrykk');
  });
  it('rejects a changed visible operation even when copied expression and answer are correct', () => {
    expect(
      missionIssues(
        { ...mission(0), question: 'Hvor mange er 20 − 2?' },
        slots[0],
        new Set(),
      ).join(),
    ).toContain('motorens spørsmål');
  });
  it.each(['text', 'hint', 'retry', 'place'] as const)(
    'rejects an early answer in %s',
    (field) => {
      expect(
        missionIssues(
          { ...mission(0), [field]: 'Leo ser at svaret er 22.' },
          slots[0],
          new Set(),
        ).join(),
      ).toContain('fasit');
    },
  );
  it('rejects an unverified motor item instead of issuing an unverified fallback', async () => {
    const bad = structuredClone(slots);
    bad[0].item.answer = 99;
    await expect(run(sourceFor(''), { slots: bad })).rejects.toThrow(
      'verifiserte motoroppgaver',
    );
  });
});

describe('chapter production', () => {
  it('publishes the first complete scene before the provider finishes', async () => {
    let early = false;
    const publish = vi.fn(
      async (_h: StoryHeader, missions: ApprovedMission[], done: boolean) => {
        if (!done && missions.length === 1) early = true;
      },
    );
    const source: ChapterSource = async function* () {
      yield `${JSON.stringify(header).slice(0, -1)},"missions":[${JSON.stringify(mission(0))},`;
      expect(early).toBe(true);
      yield allMissions()
        .slice(1)
        .map((m) => JSON.stringify(m))
        .join(',') + ']}';
    };
    const result = await run(source, { publish });
    expect(result.missions).toHaveLength(20);
    expect(result.missions.every((m) => m.source === 'model')).toBe(true);
    expect(publish.mock.calls.at(-1)?.[2]).toBe(true);
  });
  it('repairs invalid math and duplicate slots in a single request containing only errors', async () => {
    const bad = allMissions();
    bad[0] = { ...bad[0], answer: 999 };
    const source = vi.fn<ChapterSource>(async function* (phase, payload) {
      if (phase === 'generate')
        yield response([bad[0], bad[0], ...bad.slice(1)]);
      else {
        const repair = payload as {
          slots: MathSlot[];
          errors: { slotId: string; issues: string[] }[];
        };
        expect(repair.slots.map((s) => s.id)).toEqual([slots[0].id]);
        expect(repair.errors[0].issues.join()).toContain('flere ganger');
        yield response([mission(0)]);
      }
    });
    const result = await run(source);
    expect(source.mock.calls.map((call) => call[0])).toEqual([
      'generate',
      'repair',
    ]);
    expect(result.missions.every((m) => m.source === 'model')).toBe(true);
    expect(new Set(result.missions.map((m) => m.slotId)).size).toBe(20);
  });
  it('keeps a published header and prefix immutable through repair', async () => {
    const published: { h: StoryHeader; missions: ApprovedMission[] }[] = [];
    const original = allMissions();
    original[1].answer = 999;
    const source: ChapterSource = async function* (phase) {
      yield phase === 'generate'
        ? response(original)
        : response(
            [
              { ...mission(0), text: 'Leo bytter hele fortellingen.' },
              mission(1),
            ],
            { ...header, opening: 'Leo endrer romfart til en annen historie.' },
          );
    };
    const result = await run(source, {
      publish: async (h, missions) => {
        published.push({ h, missions });
      },
    });
    expect(published[0].missions).toHaveLength(1);
    expect(published[0].missions[0].text).toBe(mission(0).text);
    expect(result.missions[0]).toEqual(published[0].missions[0]);
    expect(result.header).toEqual(header);
    expect(Object.isFrozen(published[0].h)).toBe(true);
    expect(Object.isFrozen(published[0].missions)).toBe(true);
    expect(Object.isFrozen(published[0].missions[0])).toBe(true);
  });
  it('repairs repeated sentences, then falls back if the correction still fails', async () => {
    const missions = allMissions();
    missions[1].hint = missions[0].hint;
    const source = vi.fn<ChapterSource>(async function* (phase, payload) {
      if (phase === 'generate') yield response(missions);
      else {
        expect(
          (payload as { slots: MathSlot[] }).slots.map((s) => s.id),
        ).toEqual([slots[1].id]);
        yield response([missions[1]]);
      }
    });
    const result = await run(source);
    expect(source).toHaveBeenCalledTimes(2);
    expect(result.missions[1].source).toBe('generator');
    expect(result.missions.filter((m) => m.source === 'model')).toHaveLength(
      19,
    );
  });
  it('uses fallback for missing slots without asking for a repair', async () => {
    const source = vi.fn<ChapterSource>(async function* () {
      yield response([mission(0)]);
    });
    const result = await run(source);
    expect(source).toHaveBeenCalledTimes(1);
    expect(result.missions[0].source).toBe('model');
    expect(
      result.missions.slice(1).every((m) => m.source === 'generator'),
    ).toBe(true);
    expect(result.missions[1].place).toBe(mission(0).place);
  });
  it('checks injected safety before publishing and falls back after one rejected repair', async () => {
    const validateSafety = vi.fn(
      async (value: StoryHeader | StoryMission, kind: string) =>
        kind === 'header' ||
        ('slotId' in value && value.slotId !== slots[1].id),
    );
    const source = vi.fn<ChapterSource>(async function* (phase) {
      yield response(phase === 'generate' ? allMissions() : [mission(1)]);
    });
    const result = await run(source, { validateSafety });
    expect(validateSafety.mock.calls[0][1]).toBe('header');
    expect(result.missions[1].source).toBe('generator');
    expect(source).toHaveBeenCalledTimes(2);
  });
  it('uses safe generator text when the header is rejected twice', async () => {
    const source = vi.fn<ChapterSource>(async function* () {
      yield response();
    });
    const result = await run(source, {
      validateSafety: async (_value, kind) => kind !== 'header',
    });
    expect(result.header.title).toBe('Leo utforsker romfart');
    expect(result.missions.every((m) => m.source === 'model')).toBe(true);
    expect(source).toHaveBeenCalledTimes(2);
  });
  it('does not hang on next() or return() that ignores the signal', async () => {
    vi.useFakeTimers();
    const next = vi.fn(() => new Promise<IteratorResult<string>>(() => {}));
    const close = vi.fn(() => new Promise<IteratorResult<string>>(() => {}));
    const source = vi.fn<ChapterSource>(() => ({
      [Symbol.asyncIterator]: () => ({ next, return: close }),
    }));
    const pending = run(source);
    await vi.advanceTimersByTimeAsync(65_000);
    const result = await pending;
    expect(result.missions.every((m) => m.source === 'generator')).toBe(true);
    expect(source).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('bounds a hanging repair to 20 seconds after 65 seconds of generation', async () => {
    vi.useFakeTimers();
    const started = Date.now();
    const source = vi.fn<ChapterSource>(async function* (phase) {
      if (phase === 'generate')
        yield response([{ ...mission(0), answer: 999 }]);
      await new Promise(() => {});
    });
    const pending = run(source, { deadline: started + 900_000 });
    await vi.advanceTimersByTimeAsync(85_000);
    const result = await pending;
    expect(Date.now() - started).toBe(85_000);
    expect(source.mock.calls.map((c) => c[0])).toEqual(['generate', 'repair']);
    expect(result.missions[0].source).toBe('generator');
  });
  it('honors the earlier absolute deadline during repair and never retries it', async () => {
    vi.useFakeTimers();
    const started = Date.now();
    const source = vi.fn<ChapterSource>(async function* (phase) {
      if (phase === 'generate')
        yield response([{ ...mission(0), answer: 999 }]);
      await new Promise(() => {});
    });
    const pending = run(source, { deadline: started + 75_000 });
    await vi.advanceTimersByTimeAsync(70_000);
    expect((await pending).missions).toHaveLength(20);
    expect(source).toHaveBeenCalledTimes(2);
    expect(Date.now() - started).toBe(70_000);
  });
  it('bounds an injected safety validator which ignores abort', async () => {
    vi.useFakeTimers();
    const source = vi.fn<ChapterSource>(async function* () {
      yield response();
    });
    const pending = run(source, {
      validateSafety: async () => new Promise(() => {}),
    });
    await vi.advanceTimersByTimeAsync(85_000);
    expect(
      (await pending).missions.every((m) => m.source === 'generator'),
    ).toBe(true);
    expect(source).toHaveBeenCalledTimes(2);
  });
  it('times out an unconfirmed prefix write without sending a competing fallback', async () => {
    vi.useFakeTimers();
    const publish = vi.fn<Parameters<typeof produceChapter>[0]['publish']>(
      () => new Promise<void>(() => {}),
    );
    const pending = run(sourceFor(response()), { publish });
    const rejected = expect(pending).rejects.toThrow('lagringen');
    await vi.advanceTimersByTimeAsync(65_000);
    await rejected;
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][2]).toBe(false);
  });
  it('bounds final storage to the remaining five seconds and consumes late rejection', async () => {
    vi.useFakeTimers();
    let rejectWrite!: (reason: Error) => void;
    const publish = vi.fn<Parameters<typeof produceChapter>[0]['publish']>(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectWrite = reject;
        }),
    );
    const source: ChapterSource = async function* () {
      await new Promise(() => {});
    };
    const pending = run(source, { publish, deadline: Date.now() + 70_000 });
    const rejected = expect(pending).rejects.toThrow('lagringen');
    await vi.advanceTimersByTimeAsync(65_000);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][2]).toBe(true);
    await vi.advanceTimersByTimeAsync(5_000);
    await rejected;
    rejectWrite(new Error('Late database rejection'));
    await vi.advanceTimersByTimeAsync(0);
  });
  it('propagates a storage failure instead of silently replacing an uncertain prefix', async () => {
    const publish = vi.fn(async () => {
      throw Error('Database unavailable');
    });
    await expect(run(sourceFor(response()), { publish })).rejects.toThrow(
      'lagringen',
    );
    expect(publish).toHaveBeenCalledTimes(1);
  });
  it('does not start a source after its absolute deadline', async () => {
    const source = vi.fn(sourceFor(''));
    await expect(run(source, { deadline: Date.now() - 1 })).rejects.toThrow(
      'lagringen',
    );
    expect(source).not.toHaveBeenCalled();
  });
});
