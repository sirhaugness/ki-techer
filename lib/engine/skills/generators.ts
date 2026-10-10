import { z } from 'zod';
import { integer, pick, type Rng } from '../random';
import { skillById, type Difficulty } from './graph';
import { type MisconceptionCode } from '../misconceptions';
export const answerSchema = z.union([
  z.number().finite(),
  z.string().min(1),
  z.array(z.string()),
  z
    .object({
      quotient: z.number().int(),
      remainder: z.number().int().nonnegative(),
    })
    .strict(),
  z.object({ x: z.number().int(), y: z.number().int() }).strict(),
]);
export type Answer = z.infer<typeof answerSchema>;
export const generatedSchema = z.object({
  skillId: z.string(),
  difficulty: z.number().int().min(1).max(5),
  params: z.record(
    z.string(),
    z.union([z.number().finite(), z.string(), z.array(z.string())]),
  ),
  answer: answerSchema,
  answerType: z.enum([
    'number',
    'choice',
    'remainder',
    'sequence',
    'coordinate',
  ]),
  expression: z.string().nullable(),
  question: z.string().min(1),
  choices: z.array(z.string()).optional(),
  representationHints: z.array(z.string()),
  commonWrongAnswers: z.array(
    z.object({ value: answerSchema, misconceptionCode: z.string() }),
  ),
});
export type GeneratedItem = Omit<
  z.infer<typeof generatedSchema>,
  'commonWrongAnswers'
> & {
  commonWrongAnswers: { value: Answer; misconceptionCode: MisconceptionCode }[];
};
export const shapes2d = [
  { name: 'trekant', sides: 3, corners: 3, rightAngles: 0 },
  { name: 'kvadrat', sides: 4, corners: 4, rightAngles: 4 },
  { name: 'rektangel', sides: 4, corners: 4, rightAngles: 4 },
  { name: 'regulær sekskant', sides: 6, corners: 6, rightAngles: 0 },
  { name: 'regulær åttekant', sides: 8, corners: 8, rightAngles: 0 },
] as const;
export const shapes3d = [
  { name: 'kube', edges: 12, corners: 8, faces: 6 },
  { name: 'rett firkantet prisme', edges: 12, corners: 8, faces: 6 },
  { name: 'trekantet prisme', edges: 9, corners: 6, faces: 5 },
  { name: 'firkantet pyramide', edges: 8, corners: 5, faces: 5 },
  { name: 'trekantet pyramide', edges: 6, corners: 4, faces: 4 },
] as const;
function shuffled(rng: Rng, values: string[]): string[] {
  const list = [...new Set(values)];
  for (let i = list.length - 1; i > 0; i--) {
    const j = integer(rng, 0, i);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
function generateOne(
  skillId: string,
  difficulty: Difficulty,
  rng: Rng,
): GeneratedItem {
  skillById(skillId);
  z.number().int().min(1).max(5).parse(difficulty);
  let a = integer(rng, 2, 2 + difficulty * 2);
  const b = integer(rng, 2, 3 + difficulty);
  const c = integer(rng, 2, 2 + difficulty * 2);
  let params: GeneratedItem['params'] = { a, b, c };
  let answer: Answer = 0,
    answerType: GeneratedItem['answerType'] = 'number',
    expression: string | null = null,
    question = '',
    choices: string[] | undefined;
  let wrong: GeneratedItem['commonWrongAnswers'] = [];
  let hints = ['konkret', 'bilde', 'tall'];
  const numeric = (text: string, expr: string, value: number) => {
    question = text;
    expression = expr;
    answer = value;
  };
  const division = (text: string) => {
    const total = a * b;
    params = { a, b, total };
    numeric(text.replaceAll('{total}', String(total)), `${total}/${b}`, a);
    wrong = [
      { value: total + b, misconceptionCode: 'DIV_SOM_ADD' },
      { value: b, misconceptionCode: 'DELING_VS_MAALING' },
      { value: b / total, misconceptionCode: 'DIV_KOMMUTATIV' },
    ];
  };
  const choice = (text: string, value: string, alternatives: string[]) => {
    question = text;
    answer = value;
    answerType = 'choice';
    choices = shuffled(rng, [value, ...alternatives]);
  };
  switch (skillId) {
    case 'mult-telling-grupper':
      numeric(
        `Du har ${a} grupper med ${b} klosser. Hvor mange klosser har du?`,
        `${a}*${b}`,
        a * b,
      );
      break;
    case 'mult-tabell-2-5-10':
    case 'mult-tabell-3-4':
    case 'mult-tabell-6-9':
      a = pick(
        rng,
        skillId === 'mult-tabell-2-5-10'
          ? [2, 5, 10]
          : skillId === 'mult-tabell-3-4'
            ? [3, 4]
            : [6, 7, 8, 9],
      );
      params = { a, b };
      numeric(`Hva er ${a} · ${b}?`, `${a}*${b}`, a * b);
      break;
    case 'mult-kommutativ-strategi':
      params = { a, b };
      numeric(`${a} · ${b} = ${b} · ?. Hvilket tall mangler?`, `${a}`, a);
      break;
    case 'dobling-halvering': {
      const mode = pick(rng, ['doble', 'halvere']);
      params = { a, mode };
      numeric(
        mode === 'doble'
          ? `Hva er det dobbelte av ${a}?`
          : `Hva er halvparten av ${a * 2}?`,
        mode === 'doble' ? `${a}*2` : `${a * 2}/2`,
        mode === 'doble' ? a * 2 : a,
      );
      break;
    }
    case 'likhetstegn':
      params = { a, b, c };
      numeric(
        `${a + b + c} = ${c} + ?. Hvilket tall mangler?`,
        `${a + b + c}-${c}`,
        a + b,
      );
      break;
    case 'div-deling-konkret':
      division(
        `Fordel {total} klosser likt på ${b} barn. Hvor mange får hvert barn?`,
      );
      break;
    case 'div-maaling-konkret':
      division(
        `Lag grupper på ${b} av {total} klosser. Hvor mange grupper får du?`,
      );
      break;
    case 'div-representasjoner':
      division(
        `Tegningen viser {total} prikker i ${b} like grupper. Hvor mange prikker er i hver gruppe?`,
      );
      hints = ['grupper'];
      break;
    case 'div-som-omvendt-mult':
      division(`${b} · ? = {total}. Hva er {total} : ${b}?`);
      break;
    case 'div-rutenett':
      division(
        `Et rutenett har {total} ruter og ${b} rader. Hvor mange kolonner har det?`,
      );
      hints = ['rutenett'];
      break;
    case 'div-tallinje':
      division(
        `Du hopper ${b} om gangen fra 0 til {total}. Hvor mange hopp trenger du?`,
      );
      hints = ['tallinje'];
      break;
    case 'div-ukjent-faktor':
      division(`? · ${b} = {total}. Finn tallet som mangler.`);
      break;
    case 'div-med-rest': {
      const remainder = integer(rng, 1, b - 1),
        total = a * b + remainder;
      params = { a, b, total, remainder };
      question = `Del ${total} på ${b}. Skriv antall hele grupper og rest.`;
      answer = { quotient: a, remainder };
      answerType = 'remainder';
      expression = `${total}/${b}`;
      wrong = [
        {
          value: { quotient: a, remainder: 0 },
          misconceptionCode: 'DIV_REST_IGNORERT',
        },
      ];
      break;
    }
    case 'div-strategier-hoderegning':
      a *= 5;
      division(`Regn {total} : ${b} i hodet. Du kan dele tallet i to deler.`);
      break;
    case 'div-distributiv': {
      const total = (a + c) * b;
      params = { a, b, c, total };
      numeric(
        `Del ${a * b} og ${c * b} på ${b}. Hva blir summen av svarene?`,
        `(${a * b}+${c * b})/${b}`,
        a + c,
      );
      break;
    }
    case 'fire-regnearter-sammenheng': {
      const operation = pick(rng, ['+', '-', '*', '/']);
      params = { a, b, operation };
      const lhs = operation === '+' ? a + b : operation === '-' ? a + b : a * b;
      const result =
        operation === '+'
          ? a + b
          : operation === '-'
            ? a
            : operation === '*'
              ? a * b
              : a;
      numeric(
        `Hva er ${operation === '+' || operation === '*' ? a : lhs} ${operation === '*' ? '·' : operation === '/' ? ':' : operation} ${b}?`,
        `${operation === '+' || operation === '*' ? a : lhs}${operation}${b}`,
        result,
      );
      break;
    }
    case 'omvendt-operasjon-kontroll':
      division(
        `Du vil sjekke {total} : ${b} med ganging. Hvilket tall ganger du med ${b}?`,
      );
      break;
    case 'div-skriftlig':
      a = integer(rng, 12, 20 + difficulty * 15);
      division(`Del {total} på ${b} steg for steg.`);
      hints = ['tierblokker'];
      break;
    case 'overslag': {
      const number = integer(rng, 11, 20 + difficulty * 100);
      params = { number };
      numeric(
        `Rund ${number} av til nærmeste tier. Ved fem runder vi opp.`,
        `${Math.round(number / 10)}*10`,
        Math.round(number / 10) * 10,
      );
      break;
    }
    case 'regneuttrykk-fra-situasjon': {
      const total = a * b;
      params = { a, b, total };
      choice(
        `${total} bær deles likt i ${b} skåler. Hvilket uttrykk viser antall i hver skål?`,
        `${total} / ${b}`,
        [`${total} + ${b}`, `${b} / ${total}`],
      );
      expression = `${total}/${b}`;
      break;
    }
    case 'situasjon-fra-regneuttrykk': {
      const total = a * b;
      params = { a, b, total };
      choice(
        `Hvilken fortelling passer til ${total} : ${b}?`,
        `Del ${total} kort likt på ${b} barn.`,
        [
          `Legg ${b} kort til ${total} kort.`,
          `Lag ${total} grupper med ${b} kort.`,
        ],
      );
      expression = `${total}/${b}`;
      break;
    }
    case 'tekstoppgaver-flertrinn':
      params = { a, b, c };
      numeric(
        `Du har ${a} poser med ${b} bær. Du får ${c} bær til. Hvor mange bær har du?`,
        `${a}*${b}+${c}`,
        a * b + c,
      );
      break;
    case 'forklare-tenkemaate': {
      const total = (a + c) * b;
      params = { a, b, c, total };
      choice(
        `Velg en måte å regne ${total} : ${b} på. Forklar deretter hvorfor den virker.`,
        `Del ${a * b} og ${c * b} på ${b}, og legg sammen.`,
        [`Legg ${b} til ${total}.`, `Gang ${total} med ${b}.`],
      );
      expression = `${total}/${b}`;
      break;
    }
    case 'hverdag-handel': {
      const budget = a * b + c;
      params = { a, b, c, budget };
      numeric(
        `Du har ${budget} kroner. Du kjøper ${a} varer til ${b} kroner. Hvor mye har du igjen?`,
        `${budget}-${a}*${b}`,
        c,
      );
      break;
    }
    case 'vurdere-modell': {
      const total = a * b;
      params = { a, b, total };
      choice(
        `${total} epler deles likt på ${b} barn. Hvilken løsning passer?`,
        `Hvert barn får ${a} epler.`,
        [
          `Hvert barn får ${total + b} epler.`,
          `Hvert barn får ${total * b} epler.`,
        ],
      );
      expression = `${total}/${b}`;
      break;
    }
    case 'hverdag-ukjent':
      params = { a, b, c };
      numeric(
        `Du sparer ${b} kroner hver dag. Du har spart ${a * b} kroner. Hvor mange dager har du spart?`,
        `${a * b}/${b}`,
        a,
      );
      break;
    case 'figur-2d-egenskaper': {
      const shape = pick(rng, shapes2d),
        property = pick(
          rng,
          difficulty < 3
            ? (['sides', 'corners'] as const)
            : (['sides', 'corners', 'rightAngles'] as const),
        );
      const label = {
        sides: 'sider',
        corners: 'hjørner',
        rightAngles: 'rette vinkler',
      }[property];
      const count = difficulty >= 4 ? integer(rng, 2, difficulty) : 1;
      params = { shape: shape.name, property, count };
      numeric(
        `Du ser ${count} ${shape.name}${count === 1 ? '' : 'er'}. Trekanter her har ingen rette vinkler. Hvor mange ${label} har figurene til sammen?`,
        `${shape[property]}*${count}`,
        shape[property] * count,
      );
      hints = ['figur2d'];
      wrong = [
        { value: shape[property] + 1, misconceptionCode: 'FIGUR_KANT_HJORNE' },
      ];
      break;
    }
    case 'figur-3d-kanter-hjorner-flater': {
      const shape = pick(rng, shapes3d),
        property = pick(
          rng,
          difficulty < 3
            ? (['faces', 'corners'] as const)
            : (['faces', 'corners', 'edges'] as const),
        );
      const count = difficulty >= 4 ? integer(rng, 2, difficulty) : 1;
      params = { shape: shape.name, property, count };
      const label = { faces: 'flater', corners: 'hjørner', edges: 'kanter' }[
        property
      ];
      numeric(
        `Du ser ${count} figurer av typen ${shape.name}. Hvor mange ${label} har de til sammen?`,
        `${shape[property]}*${count}`,
        shape[property] * count,
      );
      hints = ['figur3d'];
      wrong = [
        { value: shape[property] + 1, misconceptionCode: 'FIGUR_KANT_HJORNE' },
      ];
      break;
    }
    case 'volum-maaleenheter': {
      const layers = integer(rng, 2, difficulty + 2);
      const unit = difficulty < 3 ? 'klosser' : 'liter';
      params = { a, b, layers, unit };
      numeric(
        `En kasse rommer ${a} · ${b} ${unit} i hvert lag. Den har ${layers} lag. Hvor mange ${unit} rommer den?`,
        `${a}*${b}*${layers}`,
        a * b * layers,
      );
      hints = ['klosser'];
      break;
    }
    case 'monster-spill':
      params = { a, b, c };
      numeric(
        `Mønsteret starter med ${a}. Vi legger til ${b} hver gang. Hva er tall nummer ${c}?`,
        `${a}+${b}*(${c}-1)`,
        a + b * (c - 1),
      );
      break;
    case 'algoritme-folg-instruksjon': {
      const steps = Array.from({ length: 2 + difficulty }, () =>
        pick(rng, ['høyre', 'opp']),
      );
      params = { steps };
      answer = {
        x: steps.filter((s) => s === 'høyre').length,
        y: steps.filter((s) => s === 'opp').length,
      };
      answerType = 'coordinate';
      question = `Start i (0, 0). Gå ett felt for hvert steg: ${steps.join(', ')}. Hvor ender du?`;
      hints = ['rutenett'];
      break;
    }
    case 'algoritme-lag-med-lokke': {
      const repeats = integer(rng, 2, difficulty + 3),
        step = integer(rng, 2, difficulty + 2);
      params = { a, repeats, step };
      numeric(
        `Variabelen x starter på ${a}. Gjenta ${repeats} ganger: legg ${step} til x. Hva blir x?`,
        `${a}+${repeats}*${step}`,
        a + repeats * step,
      );
      wrong = [{ value: a + step, misconceptionCode: 'ALGORITME_LOKKE' }];
      hints = ['rutenett'];
      break;
    }
    case 'algoritme-vilkaar': {
      const threshold = integer(rng, 3, 3 + difficulty * 3);
      params = { a, b, c, threshold };
      numeric(
        `x er ${a}. Hvis x er større enn ${threshold}, legg til ${b}. Ellers legger du til ${c}. Hva blir x?`,
        `${a}+${a > threshold ? b : c}`,
        a + (a > threshold ? b : c),
      );
      hints = ['rutenett'];
      break;
    }
    default:
      throw new Error('Generator mangler.');
  }
  if (skillId.startsWith('mult-tabell') || skillId === 'mult-telling-grupper')
    wrong = [
      { value: a + b, misconceptionCode: 'MULT_SOM_ADD' },
      { value: a * (b - 1), misconceptionCode: 'NABOFAKTA' },
    ];
  wrong = wrong.filter(
    (w) => JSON.stringify(w.value) !== JSON.stringify(answer),
  );
  const item = {
    skillId,
    difficulty,
    params,
    answer,
    answerType,
    expression,
    question,
    choices,
    representationHints: hints,
    commonWrongAnswers: wrong,
  };
  generatedSchema.parse(item);
  return item;
}
export function generate(
  skillId: string,
  difficulty: Difficulty,
  rng: Rng,
  previous?: GeneratedItem,
): GeneratedItem {
  for (let i = 0; i < 32; i++) {
    const item = generateOne(skillId, difficulty, rng);
    if (
      !previous ||
      previous.skillId !== skillId ||
      JSON.stringify(item.params) !== JSON.stringify(previous.params)
    )
      return item;
  }
  throw new Error('Kan ikke lage en ny oppgave med denne tilfeldighetskilden.');
}
export function checkAnswer(item: GeneratedItem, value: unknown): boolean {
  const parsed = answerSchema.safeParse(value);
  if (!parsed.success) return false;
  const actual = parsed.data;
  const expected = item.answer;
  if (typeof expected === 'number' && typeof actual === 'number')
    return Math.abs(expected - actual) < 1e-9;
  if (Array.isArray(expected))
    return Array.isArray(actual) && expected.length === actual.length && expected.every((v, i) => v === actual[i]);
  if (typeof expected === 'object')
    return typeof actual === 'object' && !Array.isArray(actual) && Object.entries(expected).every(([k, v]) => Reflect.get(actual, k) === v);
  return expected === actual;
}
