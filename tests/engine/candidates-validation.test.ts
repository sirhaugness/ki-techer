import { describe, it, expect } from 'vitest';
import {
  getCandidates,
  zpdDifficulty,
  validateItemRequest,
  mixingAllowed,
  needsPauseOffer,
  type CandidateContext,
  type PracticeEvent,
} from '@/lib/engine/candidates';
import { initialState, probability } from '@/lib/engine/mastery';
import { skills, type Difficulty } from '@/lib/engine/skills/graph';
import { seededRng } from '@/lib/engine/random';
import { defaultSessionSettings, startSession } from '@/lib/engine/session';
import {
  validateProposal,
  validateContextualized,
} from '@/lib/engine/validate';
const now = '2026-10-10T09:04:00Z';
const ctx = (extra: Partial<CandidateContext> = {}): CandidateContext => ({
  states: {},
  now,
  clock: startSession(defaultSessionSettings, '2026-10-10T09:00:00Z', 0),
  phase: 'hovedøkt',
  history: [],
  focusSkillId: null,
  ...extra,
});
const event = (
  skillId = 'dobling-halvering',
  correct = true,
  difficulty: Difficulty = 2,
): PracticeEvent => ({
  skillId,
  correct,
  difficulty,
  representation: 'tall',
  phase: 'hovedøkt',
});
describe('candidate selection and enforceable task requests', () => {
  it('targets the ZPD whenever the discrete levels allow it', () => {
    for (const theta of [-1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3]) {
      const p = probability(theta, zpdDifficulty(theta));
      expect(p).toBeGreaterThanOrEqual(0.7);
      expect(p).toBeLessThanOrEqual(0.85);
    }
    expect(zpdDifficulty(-9)).toBe(1);
    expect(zpdDifficulty(9)).toBe(5);
    const list = getCandidates(ctx(), seededRng(1));
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.length).toBeLessThanOrEqual(6);
    expect(list.every((c) => !c.skill_id.startsWith('div-'))).toBe(true);
  });
  it('prioritizes due reviews, misconceptions, chosen parts and confident unexpired school topics', () => {
    const states = Object.fromEntries(
      skills.map((s) => [
        s.id,
        { ...initialState(3), masteredAt: '2026-10-01T09:00:00Z' },
      ]),
    );
    states['div-med-rest'].nextReviewAt = '2026-10-09T09:00:00Z';
    const list = getCandidates(
      ctx({ states, misconceptions: ['mult-tabell-6-9'] }),
      seededRng(2),
    );
    expect(list[0].grunn).toBe('forfalt_repetisjon');
    expect(list.some((c) => c.grunn === 'aktiv_misoppfatning')).toBe(true);
    const school = {
      skillIds: ['dobling-halvering'],
      confidence: 0.9,
      expiresAt: '2026-10-11T09:00:00Z',
    };
    expect(
      getCandidates(ctx({ schoolTopics: [school] }), seededRng(1))[0].grunn,
    ).toBe('skoletema');
    expect(
      getCandidates(
        ctx({ schoolTopics: [{ ...school, confidence: 0.5 }] }),
        seededRng(1),
      )[0].grunn,
    ).not.toBe('skoletema');
    expect(
      getCandidates(
        ctx({ schoolTopics: [{ ...school, expiresAt: now }] }),
        seededRng(1),
      )[0].grunn,
    ).not.toBe('skoletema');
  });
  it('rejects unmet prerequisites, bad schemas, extreme levels and unjustified choices', () => {
    const context = ctx(),
      list = getCandidates(context, seededRng(1));
    expect(
      validateItemRequest(
        {
          skillId: 'div-deling-konkret',
          difficulty: 2,
          representation: 'konkret',
        },
        context,
        list,
      ).ok,
    ).toBe(false);
    expect(
      validateItemRequest(
        {
          skillId: 'mult-telling-grupper',
          difficulty: 5,
          representation: 'konkret',
        },
        context,
        list,
      ).ok,
    ).toBe(false);
    expect(
      validateItemRequest(
        { skillId: 'monster-spill', difficulty: 2, representation: 'konkret' },
        context,
        [],
      ).ok,
    ).toBe(false);
    expect(
      validateItemRequest(
        {
          skillId: 'monster-spill',
          difficulty: 2,
          representation: 'konkret',
          reason: 'Leo ønsker å utforske et mønster.',
        },
        context,
        [],
      ).ok,
    ).toBe(true);
    expect(
      validateItemRequest(
        { skillId: 'missing', difficulty: 2, representation: 'konkret' },
        context,
        list,
      ).ok,
    ).toBe(false);
    expect(
      validateItemRequest(
        {
          skillId: 'mult-telling-grupper',
          difficulty: 2,
          representation: 'bilde',
        },
        context,
        list,
      ).ok,
    ).toBe(false);
    expect(
      validateItemRequest(
        {
          skillId: 'mult-telling-grupper',
          difficulty: 2,
          representation: 'konkret',
        },
        context,
        list,
      ).ok,
    ).toBe(true);
  });
  it('enforces 30% mixing at ten items and does not include warmups', () => {
    const history = [
      ...Array.from({ length: 7 }, () => event()),
      event('likhetstegn'),
      event('monster-spill'),
    ];
    expect(
      mixingAllowed(history, 'dobling-halvering', 'dobling-halvering'),
    ).toBe(false);
    expect(mixingAllowed(history, 'likhetstegn', 'dobling-halvering')).toBe(
      true,
    );
    const context = ctx({
      states: { 'dobling-halvering': { ...initialState(), attempts: 4 } },
      history,
      focusSkillId: 'dobling-halvering',
    });
    expect(
      validateItemRequest(
        {
          skillId: 'dobling-halvering',
          difficulty: 2,
          representation: 'tall',
          reason: 'Dette er en relevant oppgave.',
        },
        context,
        [],
      ).reason,
    ).toContain('30 %');
  });
  it('enforces change after two errors, easy task after three, then pause offer', () => {
    const states = { 'dobling-halvering': { ...initialState(), attempts: 5 } },
      history = [
        event('dobling-halvering', false),
        event('dobling-halvering', false),
      ];
    const two = ctx({ states, history });
    expect(
      validateItemRequest(
        {
          skillId: 'dobling-halvering',
          difficulty: 2,
          representation: 'tall',
          reason: 'Dette er en relevant oppgave.',
        },
        two,
        [],
      ).ok,
    ).toBe(false);
    expect(
      validateItemRequest(
        {
          skillId: 'dobling-halvering',
          difficulty: 1,
          representation: 'tall',
          reason: 'Dette er en relevant oppgave.',
        },
        two,
        [],
      ).ok,
    ).toBe(true);
    const three = ctx({
      states,
      history: [...history, event('dobling-halvering', false)],
    });
    expect(
      validateItemRequest(
        {
          skillId: 'dobling-halvering',
          difficulty: 2,
          representation: 'bilde',
          reason: 'Dette er en relevant oppgave.',
        },
        three,
        [],
      ).ok,
    ).toBe(false);
    expect(
      validateItemRequest(
        {
          skillId: 'dobling-halvering',
          difficulty: 1,
          representation: 'bilde',
          reason: 'Dette er en relevant oppgave.',
        },
        three,
        [],
      ).ok,
    ).toBe(true);
    expect(
      getCandidates(three, seededRng(3)).every(
        (c) => c.foreslått_vanskegrad === 1,
      ),
    ).toBe(true);
    expect(
      needsPauseOffer([...three.history, event('dobling-halvering', true, 1)]),
    ).toBe(true);
  });
  it('rejects all task generation after the hard deadline', () => {
    const expired = ctx({ now: '2026-10-10T09:15:00Z' });
    expect(getCandidates(expired, seededRng(1))).toEqual([]);
    expect(
      validateItemRequest(
        {
          skillId: 'mult-telling-grupper',
          difficulty: 1,
          representation: 'konkret',
        },
        expired,
        [],
      ).reason,
    ).toContain('ferdig');
  });
});
describe('model proposals are arithmetic data, never executable programs', () => {
  const good = {
    skillId: 'div-deling-konkret',
    text: 'Fordel 24 kort likt på 4 barn. Hvor mange får hvert barn?',
    expression: '24 / 4',
    answer: 6,
    representation: 'konkret',
  };
  it('verifies arithmetic, rejects false answers and mismatched textual numbers', () => {
    expect(validateProposal(good).ok).toBe(true);
    expect(validateProposal({ ...good, answer: 7 }).ok).toBe(false);
    expect(
      validateProposal({ ...good, text: 'Fordel 28 kort på 4 barn.' }).ok,
    ).toBe(false);
    expect(validateContextualized(good.text, good.expression, 6, [24, 4])).toBe(
      true,
    );
    expect(
      validateContextualized('Fordel 99 kort.', good.expression, 6, [24, 4]),
    ).toBe(false);
  });
  it('rejects functions, assignment, power, object access, zero division and unbounded operands', () => {
    for (const expression of [
      'sqrt(36)',
      'a=6',
      '2^100000',
      '[1,2]',
      'import("x")',
      '(4).constructor',
      '1000000 / 4',
      '1 / 0',
      '-24 / -4',
    ])
      expect(validateProposal({ ...good, expression }).ok).toBe(false);
    expect(
      validateProposal({ ...good, skillId: 'figur-2d-egenskaper' }).ok,
    ).toBe(false);
    expect(
      validateProposal({
        ...good,
        text: 'Dette er en lang setning med mange ord som forsøker å gjøre oppgaven unødvendig vanskelig å lese for et barn.',
      }).ok,
    ).toBe(false);
    expect(validateProposal({ ...good, text: 'En. To. Tre. Fire.' }).ok).toBe(
      false,
    );
  });
});

it('every recommendation respects introduction order and recovery guards', () => {
  for (const failures of [0, 2, 3])
    for (let seed = 0; seed < 20; seed++) {
      const states = Object.fromEntries(
        skills.map((s) => [s.id, { ...initialState(), attempts: s.order % 5 }]),
      );
      const context = ctx({
        states,
        history: Array.from({ length: failures }, () => ({
          ...event('dobling-halvering', false, 1),
          representation: 'konkret' as const,
        })),
      });
      for (const candidate of getCandidates(context, seededRng(seed)))
        expect(
          validateItemRequest(
            {
              skillId: candidate.skill_id,
              difficulty: candidate.foreslått_vanskegrad,
              representation: candidate.anbefalt_strategi.representasjon,
            },
            context,
            getCandidates(context, seededRng(seed)),
          ).ok,
        ).toBe(true);
    }
});
it('rejects malformed schemas, wrong skill domains, fractional answers and syntax errors', () => {
  const request = {
    skillId: 'mult-tabell-2-5-10',
    text: 'Regn 2 ganger 5.',
    expression: '2*5',
    answer: 10,
    representation: 'konkret',
  };
  expect(validateProposal(request).ok).toBe(true);
  for (const changed of [
    { expression: '3*3', answer: 9 },
    { expression: '2*13', answer: 26 },
    { expression: '2+5', answer: 7 },
    { expression: 'true+5', answer: 6 },
    { expression: '(', answer: 0 },
    { skillId: 'missing' },
  ])
    expect(validateProposal({ ...request, ...changed }).ok).toBe(false);
  expect(
    validateProposal({
      skillId: 'div-deling-konkret',
      text: 'Del 24 på 5.',
      expression: '24/5',
      answer: 4.8,
      representation: 'konkret',
    }).ok,
  ).toBe(false);
  expect(
    validateProposal({
      skillId: 'div-deling-konkret',
      text: 'Legg til 24 og 4.',
      expression: '24+4',
      answer: 28,
      representation: 'konkret',
    }).ok,
  ).toBe(false);
  expect(
    validateProposal({
      skillId: 'tekstoppgaver-flertrinn',
      text: 'Regn med 1000.',
      expression: '1000*1000*1000',
      answer: 1000000000,
      representation: 'tall',
    }).ok,
  ).toBe(false);
  expect(validateProposal(null).ok).toBe(false);
  expect(validateItemRequest(null, ctx(), []).ok).toBe(false);
});
