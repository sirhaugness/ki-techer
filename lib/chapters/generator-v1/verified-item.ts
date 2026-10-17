// Frozen chapter generator v1. Changes require a new generator version.
import { parse, type MathNode } from 'mathjs';
import { generatedSchema, type GeneratedItem } from './skills/generators';

/** Walk a restricted arithmetic tree; never execute an expression as code. */
export function arithmeticValue(node: MathNode): number {
  if (node.type === 'ConstantNode') {
    const value = Number(Reflect.get(node, 'value'));
    if (!Number.isFinite(value)) throw new Error('Ugyldig tall.');
    return value;
  }
  if (node.type === 'ParenthesisNode')
    return arithmeticValue(Reflect.get(node, 'content'));
  if (node.type === 'OperatorNode') {
    const args = Reflect.get(node, 'args') as MathNode[];
    if (args.length !== 2) throw new Error('Bare binær regning.');
    const a = arithmeticValue(args[0]),
      b = arithmeticValue(args[1]);
    switch (Reflect.get(node, 'op')) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        if (b !== 0) return a / b;
    }
  }
  throw new Error('Uttrykket er ikke tillatt.');
}
export function verifyGeneratedItem(item: GeneratedItem): boolean {
  if (!generatedSchema.safeParse(item).success) return false;
  try {
    if (typeof item.answer === 'number')
      return (
        !!item.expression &&
        Number.isSafeInteger(item.answer) &&
        item.answer >= 0 &&
        arithmeticValue(parse(item.expression)) === item.answer
      );
    const p = item.params;
    if (
      item.answerType === 'coordinate' &&
      typeof item.answer === 'object' &&
      !Array.isArray(item.answer) &&
      'x' in item.answer &&
      Array.isArray(p.steps)
    )
      return (
        item.answer.x === p.steps.filter((s) => s === 'høyre').length &&
        item.answer.y === p.steps.filter((s) => s === 'opp').length
      );
    if (
      item.answerType === 'remainder' &&
      typeof item.answer === 'object' &&
      !Array.isArray(item.answer) &&
      'quotient' in item.answer
    )
      return (
        item.answer.quotient === Math.floor(Number(p.total) / Number(p.b)) &&
        item.answer.remainder === Number(p.total) % Number(p.b)
      );
    if (item.answerType === 'choice' && typeof item.answer === 'string') {
      if (
        !item.choices?.includes(item.answer) ||
        new Set(item.choices).size !== item.choices.length
      )
        return false;
      const answers: Record<string, string> = {
        'regneuttrykk-fra-situasjon': `${p.total} / ${p.b}`,
        'situasjon-fra-regneuttrykk': `Del ${p.total} kort likt på ${p.b} barn.`,
        'forklare-tenkemaate': `Del ${Number(p.a) * Number(p.b)} og ${Number(p.c) * Number(p.b)} på ${p.b}, og legg sammen.`,
        'vurdere-modell': `Hvert barn får ${p.a} epler.`,
      };
      return item.answer === answers[item.skillId];
    }
    return false;
  } catch {
    return false;
  }
}
