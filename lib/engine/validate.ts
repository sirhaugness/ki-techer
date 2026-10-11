import { z } from 'zod';
import { parse, type MathNode } from 'mathjs';
import { skillById } from './skills/graph';
const proposalSchema = z
  .object({
    skillId: z.string(),
    text: z.string().min(1).max(600),
    expression: z.string().min(1).max(120),
    answer: z.number().finite(),
    representation: z.enum(['konkret', 'bilde', 'tall']),
  })
  .strict();
export type TaskProposal = z.infer<typeof proposalSchema>;
function literalValue(node: MathNode): number | null {
  if (node.type === 'ConstantNode') {
    const value: unknown = Reflect.get(node, 'value');
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
  return null;
}
/** Allow only scalar arithmetic. No functions, symbols, powers, assignment, units or accessors. */
export function validateProposal(input: unknown): {
  ok: boolean;
  reason: string;
  proposal?: TaskProposal;
} {
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'Ugyldig oppgaveformat.' };
  const proposal = parsed.data;
  let skill;
  try {
    skill = skillById(proposal.skillId);
  } catch {
    return { ok: false, reason: 'Ukjent ferdighet.' };
  }
  if (skill.part === 4 || skill.id === 'div-med-rest')
    return {
      ok: false,
      reason:
        'Egne oppgaver i geometri og algoritmer trenger en fagspesifikk validator.',
    };
  const sentences = proposal.text.match(/[^.!?]+[.!?]?/g) ?? [];
  if (
    sentences.length > 3 ||
    sentences.some((s) => s.trim().split(/\s+/).length > 15)
  )
    return { ok: false, reason: 'Oppgaveteksten er for lang.' };
  try {
    const ast = parse(proposal.expression);
    let valid = true;
    let operands = 0;
    const numbers = new Set<number>();
    const operators: string[] = [];
    ast.traverse((node) => {
      if (node.type === 'ConstantNode') {
        const value = literalValue(node);
        operands++;
        if (
          value === null ||
          !Number.isInteger(value) ||
          value < 0 ||
          value > skill.maxOperand
        )
          valid = false;
        else numbers.add(value);
      } else if (node.type === 'OperatorNode') {
        const op = String(Reflect.get(node, 'op'));
        operators.push(op);
        const args = Reflect.get(node, 'args') as unknown[];
        if (!skill.operations.includes(op) || args.length !== 2) valid = false;
      } else if (node.type !== 'ParenthesisNode') valid = false;
    });
    if (!valid || operands < 2 || operands > 12)
      return {
        ok: false,
        reason: 'Uttrykket bruker tall eller operasjoner utenfor ferdigheten.',
      };
    if (skill.id.startsWith('div-') && !operators.includes('/'))
      return {
        ok: false,
        reason: 'En divisjonsoppgave må inneholde divisjon.',
      };
    if (skill.id.startsWith('mult-tabell')) {
      const values = [...numbers];
      const allowed =
        skill.id === 'mult-tabell-2-5-10'
          ? [2, 5, 10]
          : skill.id === 'mult-tabell-3-4'
            ? [3, 4]
            : [6, 7, 8, 9];
      if (
        operands !== 2 ||
        operators.length !== 1 ||
        !values.some((v) => allowed.includes(v)) ||
        values.some((v) => v < 2 || v > 12)
      )
        return { ok: false, reason: 'Tallene passer ikke gangetabellen.' };
    }
    const value = ast.compile().evaluate();
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value < 0 ||
      Math.abs(value - proposal.answer) > 1e-9
    )
      return { ok: false, reason: 'Fasit stemmer ikke med regneuttrykket.' };
    if (Math.abs(value) > skill.maxOperand * skill.maxOperand)
      return { ok: false, reason: 'Svaret er utenfor det tillatte området.' };
    const textNumbers = proposal.text.match(/\d+(?:[.,]\d+)?/g) ?? [];
    if (textNumbers.some((n) => !numbers.has(Number(n.replace(',', '.')))))
      return {
        ok: false,
        reason: 'Tallene i teksten stemmer ikke med uttrykket.',
      };
    return {
      ok: true,
      reason:
        'Fasit er verifisert. Moderering og semantisk kontroll kreves før visning.',
      proposal,
    };
  } catch {
    return { ok: false, reason: 'Uttrykket kunne ikke verifiseres.' };
  }
}
export function validateContextualized(
  text: string,
  expression: string,
  expected: number,
  params: readonly number[],
): boolean {
  if (
    text.length > 600 ||
    (text.match(/[^.!?]+[.!?]?/g) ?? []).some(
      (s) => s.trim().split(/\s+/).length > 15,
    ) ||
    (text.match(/[.!?]/g) ?? []).length > 3
  )
    return false;
  if (
    (text.match(/\d+(?:[.,]\d+)?/g) ?? []).some(
      (n) => !params.includes(Number(n.replace(',', '.'))),
    )
  )
    return false;
  return validateProposal({
    skillId: 'tekstoppgaver-flertrinn',
    text,
    expression,
    answer: expected,
    representation: 'tall',
  }).ok;
}
