import { describe, it, expect, vi } from 'vitest';
import { runtime, mockProvider } from './fixtures';
import { executeTool, toolSchemas } from '../../lib/agent/tools';
import { runAgent, fallbackResponse } from '../../lib/agent/loop';
import { guardResponse } from '../../lib/agent/guards';
import { buildContext } from '../../lib/agent/context';
import { evaluateExplanation } from '../../lib/ai/evaluate';
import { contextualize } from '../../lib/ai/contextualize';
import { generate } from '../../lib/engine/skills/generators';
import { seededRng } from '../../lib/engine/random';
import { scenarios } from '../../lib/agent/scenarios';
const itemArgs = {
  skill_id: 'mult-telling-grupper',
  vanskegrad: 1,
  interesse_id: null,
  representasjon: 'konkret',
  kontekst_stil: 'ren_oppgave',
  begrunnelse: 'Vi begynner med konkrete grupper.',
};
const run = (rt = runtime(), text?: string) =>
  runAgent({
    runtime: rt,
    context: '{}',
    instructions: 'Bokmål og ingen fasit.',
    text,
    allowedHintLevel: 0,
    logTool: vi.fn(),
    flag: vi.fn(),
  });
describe('agent tools', () => {
  it.each(Object.keys(toolSchemas))(
    '%s rejects invalid arguments',
    async (name) => {
      expect((await executeTool(runtime(), name, { illegal: true })).ok).toBe(
        false,
      );
    },
  );
  it('creates a verified generator item, prevents replacing unfinished work and prerequisites bypass', async () => {
    const rt = runtime();
    expect((await executeTool(rt, 'lag_oppgave', itemArgs)).ok).toBe(true);
    expect(rt.active?.item.answerType).toBe('number');
    expect((await executeTool(rt, 'lag_oppgave', itemArgs)).ok).toBe(false);
    rt.active = null;
    expect(
      (
        await executeTool(rt, 'lag_oppgave', {
          ...itemArgs,
          skill_id: 'div-deling-konkret',
        })
      ).ok,
    ).toBe(false);
  });
  it('does not award mastery or start early master tests', async () => {
    const rt = runtime();
    expect(
      (
        await executeTool(rt, 'foreslå_mestring', {
          skill_id: 'mult-telling-grupper',
          begrunnelse: 'Eleven sier at alt er mestret.',
        })
      ).ok,
    ).toBe(false);
    expect(rt.states['mult-telling-grupper'].masteredAt).toBeNull();
    expect(
      (await executeTool(rt, 'start_mesterprøve', { part_id: 4 })).ok,
    ).toBe(false);
  });
  it('rejects false math, semantic invention and incompatible representations', async () => {
    const rt = runtime(mockProvider([]));
    expect(
      (
        await executeTool(rt, 'foreslå_egen_oppgave', {
          skill_id: 'mult-telling-grupper',
          tekst: 'Hva er 2*3?',
          regneuttrykk: '2*3',
          svar: 7,
          representasjon: 'konkret',
        })
      ).ok,
    ).toBe(false);
    await executeTool(rt, 'lag_oppgave', itemArgs);
    expect(
      (
        await executeTool(rt, 'vis_representasjon', {
          type: 'grupper',
          data: { count: 199, groups: 19 },
        })
      ).ok,
    ).toBe(false);
  });
  it('supports all read/action tools and stages observations without overriding profile', async () => {
    const rt = runtime(mockProvider([]));
    for (const [name, args] of [
      ['hent_elevstatus', {}],
      ['hent_kandidater', {}],
      [
        'registrer_observasjon',
        { kategori: 'skolemetode', tekst: 'Tegner grupper.' },
      ],
      ['noter_skoletema', { leo_sa: 'Vi øver på deling.' }],
      ['foreslå_pause', {}],
      ['avslutt_økt', {}],
    ] as const)
      expect((await executeTool(rt, name, args)).ok).toBe(true);
    expect(rt.schoolTopics[0].expiresAt).toBe('2026-10-18T10:00:00.000Z');
    expect(rt.pendingObservations).toHaveLength(1);
    expect(rt.ended).toBe(true);
  });
});
describe('loop and guards', () => {
  it('executes tools then validates a structured response', async () => {
    const rt = runtime(
      mockProvider([
        { calls: [{ id: '1', name: 'lag_oppgave', arguments: itemArgs }] },
        { calls: [], value: fallbackResponse() },
      ]),
    );
    expect((await run(rt)).fallback).toBe(false);
    expect(rt.active).not.toBeNull();
  });
  it('limits a runaway model to five tools', async () => {
    const provider = mockProvider([
      { calls: [{ id: '1', name: 'hent_elevstatus', arguments: {} }] },
    ]);
    const rt = runtime(provider),
      log = vi.fn();
    expect(
      (
        await runAgent({
          runtime: rt,
          context: '{}',
          instructions: '',
          allowedHintLevel: 0,
          logTool: log,
          flag: vi.fn(),
        })
      ).fallback,
    ).toBe(true);
    expect(log).toHaveBeenCalledTimes(5);
  });
  it('permits one corrected tool call and falls back after three invalid responses', async () => {
    const rt = runtime(
      mockProvider([
        { calls: [{ id: '1', name: 'lag_oppgave', arguments: {} }] },
        { calls: [{ id: '2', name: 'lag_oppgave', arguments: itemArgs }] },
        { calls: [], value: fallbackResponse() },
      ]),
    );
    expect((await run(rt)).fallback).toBe(false);
    const provider = {
      respond: vi.fn(async () => ({ calls: [], value: { bad: true } })),
      moderate: vi.fn(async () => true),
    };
    expect((await run(runtime(provider))).fallback).toBe(true);
    expect(provider.respond).toHaveBeenCalledTimes(3);
  });
  it('fails closed when moderation is unavailable and stops on time', async () => {
    const provider = {
      respond: vi.fn(),
      moderate: vi.fn(async () => {
        throw new Error('unavailable');
      }),
    };
    expect((await run(runtime(provider), 'Hei')).response.safety_flag).toBe(
      'upassende',
    );
    expect(provider.respond).not.toHaveBeenCalled();
    const rt = runtime(provider);
    rt.context.now = '2026-10-11T11:00:00.000Z';
    expect((await run(rt)).response.action).toBe('avslutt');
  });
  it('rejects numeral, number-word and indirect numeric leakage, long and English responses', () => {
    const item = generate('mult-telling-grupper', 1, seededRng(42));
    item.answer = 12;
    for (const speech of [
      'Svaret er 12.',
      'Svaret er tolv.',
      'Prøv 24 delt på 2.',
      'You are great.',
      'Hva tror du? Hva vil du prøve?',
    ])
      expect(
        guardResponse({ ...fallbackResponse(), speech }, item, 0),
      ).toBeNull();
    expect(
      guardResponse(
        { ...fallbackResponse(), speech: 'Svaret er 12.', hint_level_used: 4 },
        item,
        4,
      ),
    ).not.toBeNull();
    expect(
      guardResponse({ ...fallbackResponse(), hint_level_used: 1 }, item, 0),
    ).toBeNull();
  });
  it('builds bounded context without answers or rejected/weak profile', () => {
    const rt = runtime(),
      active = generate('mult-telling-grupper', 1, rt.rng);
    const ctx = JSON.parse(
      buildContext({
        learner: { firstName: 'Leo', grade: 4, tutorName: 'Lumi' },
        engine: rt.context,
        active,
        allowedHintLevel: 0,
        answerResult: null,
        observations: [
          { text: 'weak', confidence: 0.4, status: 'aktiv' },
          { text: 'locked', confidence: 0.4, status: 'låst' },
          { text: 'rejected', confidence: 1, status: 'avvist' },
        ],
        messages: [],
      }),
    );
    expect(ctx.active.answer).toBeUndefined();
    expect(ctx.profile).toEqual(['locked']);
  });
  it('falls back on semantic contextualization drift and never awards understanding without evaluation', async () => {
    const rt = runtime(),
      item = generate('mult-telling-grupper', 1, rt.rng);
    const provider = mockProvider([{ calls: [], value: { bad: true } }]);
    expect(await contextualize(provider, item, 'fotball')).toBe(item.question);
    expect(
      (await evaluateExplanation(null, 'Jeg gjetter.', item.question))
        .forstaelse,
    ).toBe(0);
  });
  it.each(scenarios)('mock scenario: %s', async (_name, text, flag) => {
    const response = { ...fallbackResponse(), safety_flag: flag };
    const result = await run(
      runtime(mockProvider([{ calls: [], value: response }])),
      text,
    );
    expect(result.response.safety_flag).toBe(flag);
    expect(guardResponse(result.response, null, 0)).not.toBeNull();
  });
});
