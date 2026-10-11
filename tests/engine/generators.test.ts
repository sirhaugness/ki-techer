import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from 'mathjs';
import {
  skills,
  validateGraph,
  type Difficulty,
} from '@/lib/engine/skills/graph';
import { curriculum } from '@/lib/engine/skills/curriculum';
import {
  generate,
  checkAnswer,
  type GeneratedItem,
  type Answer,
} from '@/lib/engine/skills/generators';
import { seededRng } from '@/lib/engine/random';
import {
  detectMisconception,
  misconceptions,
} from '@/lib/engine/misconceptions';
import { curriculumSql } from '../../scripts/curriculum-snapshot';
// Independent oracle: no production answer-building helpers or shape tables.
function oracle(item: GeneratedItem): Answer {
  const p = item.params,
    a = Number(p.a),
    b = Number(p.b),
    c = Number(p.c);
  switch (item.skillId) {
    case 'mult-telling-grupper':
    case 'mult-tabell-2-5-10':
    case 'mult-tabell-3-4':
    case 'mult-tabell-6-9':
      return Array.from({ length: a }, () => b).reduce((sum, n) => sum + n, 0);
    case 'mult-kommutativ-strategi':
      return a;
    case 'dobling-halvering':
      return p.mode === 'doble' ? a + a : a;
    case 'likhetstegn':
      return a + b;
    case 'div-deling-konkret':
    case 'div-maaling-konkret':
    case 'div-representasjoner':
    case 'div-som-omvendt-mult':
    case 'div-rutenett':
    case 'div-tallinje':
    case 'div-ukjent-faktor':
    case 'div-strategier-hoderegning':
    case 'omvendt-operasjon-kontroll':
    case 'div-skriftlig': {
      let rest = Number(p.total),
        q = 0;
      while (rest >= b) {
        rest -= b;
        q++;
      }
      return q;
    }
    case 'div-med-rest':
      return {
        quotient: Math.floor(Number(p.total) / b),
        remainder: Number(p.total) % b,
      };
    case 'div-distributiv':
      return a + c;
    case 'fire-regnearter-sammenheng':
      return p.operation === '+' ? a + b : p.operation === '*' ? a * b : a;
    case 'overslag':
      return Math.floor((Number(p.number) + 5) / 10) * 10;
    case 'regneuttrykk-fra-situasjon':
      return `${p.total} / ${b}`;
    case 'situasjon-fra-regneuttrykk':
      return `Del ${p.total} kort likt på ${b} barn.`;
    case 'tekstoppgaver-flertrinn':
      return a * b + c;
    case 'forklare-tenkemaate':
      return `Del ${a * b} og ${c * b} på ${b}, og legg sammen.`;
    case 'hverdag-handel':
      return Number(p.budget) - a * b;
    case 'vurdere-modell':
      return `Hvert barn får ${a} epler.`;
    case 'hverdag-ukjent':
      return a;
    case 'figur-2d-egenskaper': {
      const facts: Record<string, Record<string, number>> = {
        trekant: { sides: 3, corners: 3, rightAngles: 0 },
        kvadrat: { sides: 4, corners: 4, rightAngles: 4 },
        rektangel: { sides: 4, corners: 4, rightAngles: 4 },
        'regulær sekskant': { sides: 6, corners: 6, rightAngles: 0 },
        'regulær åttekant': { sides: 8, corners: 8, rightAngles: 0 },
      };
      return facts[String(p.shape)][String(p.property)] * Number(p.count);
    }
    case 'figur-3d-kanter-hjorner-flater': {
      const facts: Record<string, Record<string, number>> = {
        kube: { edges: 12, corners: 8, faces: 6 },
        'rett firkantet prisme': { edges: 12, corners: 8, faces: 6 },
        'trekantet prisme': { edges: 9, corners: 6, faces: 5 },
        'firkantet pyramide': { edges: 8, corners: 5, faces: 5 },
        'trekantet pyramide': { edges: 6, corners: 4, faces: 4 },
      };
      return facts[String(p.shape)][String(p.property)] * Number(p.count);
    }
    case 'volum-maaleenheter':
      return Array.from({ length: Number(p.layers) }, () => a * b).reduce(
        (s, n) => s + n,
        0,
      );
    case 'monster-spill': {
      let result = a;
      for (let i = 1; i < c; i++) result += b;
      return result;
    }
    case 'algoritme-folg-instruksjon': {
      let x = 0,
        y = 0;
      for (const step of p.steps as string[]) {
        if (step === 'høyre') x++;
        else y++;
      }
      return { x, y };
    }
    case 'algoritme-lag-med-lokke': {
      let x = a;
      for (let i = 0; i < Number(p.repeats); i++) x += Number(p.step);
      return x;
    }
    case 'algoritme-vilkaar':
      return a + (a > Number(p.threshold) ? b : c);
    default:
      throw new Error(`Oracle missing: ${item.skillId}`);
  }
}
describe('curriculum and graph', () => {
  it('has 35 acyclic skills, equal parts and coverage of all grade-4 aims', () => {
    expect(skills).toHaveLength(35);
    expect(() => validateGraph()).not.toThrow();
    for (const part of [null, 1, 2, 3, 4])
      expect(skills.filter((s) => s.part === part)).toHaveLength(7);
    for (const aim of Object.keys(curriculum).filter((a) => a.startsWith('4-')))
      expect(skills.some((s) => s.aim === aim)).toBe(true);
    expect(() =>
      validateGraph([{ ...skills[0], prerequisites: [skills[0].id] }]),
    ).toThrow('Syklus');
    expect(() =>
      validateGraph([{ ...skills[0], prerequisites: ['missing'] }]),
    ).toThrow('Ukjent');
  });
  it('keeps the SQL migration consistent with the TypeScript graph', () => {
    expect(
      readFileSync('supabase/migrations/20261010000200_curriculum.sql', 'utf8'),
    ).toBe(curriculumSql());
  });
});
for (const skill of skills)
  describe(skill.id, () => {
    for (const difficulty of [1, 2, 3, 4, 5] as Difficulty[])
      it(`independently verifies 1000 tasks at level ${difficulty}`, () => {
        const rng = seededRng(1000 + skill.order * 5 + difficulty);
        let previous: GeneratedItem | undefined;
        for (let i = 0; i < 1000; i++) {
          const item = generate(skill.id, difficulty, rng, previous),
            expected = oracle(item);
          expect(item.answer).toEqual(expected);
          expect(checkAnswer(item, expected)).toBe(true);
          expect(checkAnswer(item, null)).toBe(false);
          if (previous) {
            expect(item.params).not.toEqual(previous.params);
            expect(item.question).not.toBe(previous.question);
          }
          if (typeof expected === 'number' && item.expression)
            expect(evaluate(item.expression)).toBeCloseTo(expected, 9);
          if (item.answerType === 'choice') {
            expect(item.choices).toContain(expected);
            expect(new Set(item.choices).size).toBe(item.choices?.length);
          }
          for (const wrong of item.commonWrongAnswers) {
            expect(checkAnswer(item, wrong.value)).toBe(false);
            expect(misconceptions[wrong.misconceptionCode]).toBeDefined();
            expect(detectMisconception(wrong.value, [wrong])).toBe(
              wrong.misconceptionCode,
            );
          }
          previous = item;
        }
      });
  });
it('is reproducible and rejects invalid difficulty, unknown skills and stuck RNG', () => {
  expect(generate('div-med-rest', 3, seededRng(77))).toEqual(
    generate('div-med-rest', 3, seededRng(77)),
  );
  expect(() => generate('missing', 3, seededRng(1))).toThrow();
  expect(() =>
    generate('likhetstegn', 0 as Difficulty, seededRng(1)),
  ).toThrow();
  const previous = generate('likhetstegn', 1, () => 0.5);
  expect(() => generate('likhetstegn', 1, () => 0.5, previous)).toThrow(
    'tilfeldighetskilden',
  );
});

it('checks coordinate, remainder and ordered sequence answers without loose coercion', () => {
  const base = generate('algoritme-folg-instruksjon', 3, seededRng(4));
  expect(checkAnswer(base, { x: 99, y: 99 })).toBe(false);
  expect(checkAnswer(base, { ...(base.answer as object), extra: 1 })).toBe(
    false,
  );
  const sequence: GeneratedItem = {
    ...base,
    answerType: 'sequence',
    answer: ['høyre', 'opp'],
  };
  expect(checkAnswer(sequence, ['høyre', 'opp'])).toBe(true);
  expect(checkAnswer(sequence, ['opp', 'høyre'])).toBe(false);
  expect(checkAnswer(sequence, ['høyre'])).toBe(false);
  expect(checkAnswer(sequence, 'høyre,opp')).toBe(false);
  const numeric = generate('mult-telling-grupper', 1, seededRng(4));
  expect(checkAnswer(numeric, String(numeric.answer))).toBe(false);
  expect(checkAnswer(numeric, NaN)).toBe(false);
  expect(() => validateGraph([skills[0], skills[0]])).toThrow('Duplikate');
});
