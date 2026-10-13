import { parse, type MathNode } from 'mathjs';

/** Arithmetic only. Never evaluate user functions, symbols or assignments. */
export function checkMultiplicationExpression(
  text: string,
  a: number,
  b: number,
): boolean {
  if (text.length > 120) return false;
  const normalized = text
    .replaceAll(/[×·x]/g, '*')
    .replaceAll(':', '/')
    .replaceAll(',', '.');
  const sides = normalized.split('=');
  if (sides.length > 2) return false;
  const expressions = sides.filter((s) => !/^\s*\d+\s*$/.test(s));
  if (expressions.length !== 1) return false;
  try {
    const root = parse(expressions[0]);
    const operands: number[] = [];
    const operators: string[] = [];
    let valid = true;
    root.traverse((node: MathNode) => {
      if (node.type === 'ConstantNode') {
        const value = Number((node as unknown as { value: number }).value);
        if (!Number.isSafeInteger(value) || value < 0) valid = false;
        operands.push(value);
      } else if (node.type === 'OperatorNode') {
        const op = node as unknown as { op: string; args: MathNode[] };
        if (!['+', '*'].includes(op.op) || op.args.length !== 2) valid = false;
        operators.push(op.op);
      } else if (node.type !== 'ParenthesisNode') valid = false;
    });
    if (!valid || operators.length === 0) return false;
    const multiplied =
      operators.every((op) => op === '*') &&
      operands.length === 2 &&
      ((operands[0] === a && operands[1] === b) ||
        (operands[0] === b && operands[1] === a));
    const added =
      operators.every((op) => op === '+') &&
      ((operands.length === a && operands.every((n) => n === b)) ||
        (operands.length === b && operands.every((n) => n === a)));
    if (!multiplied && !added) return false;
    const result = root.compile().evaluate();
    return (
      result === a * b &&
      sides.every((s) => !/^\s*\d+\s*$/.test(s) || Number(s) === result)
    );
  } catch {
    return false;
  }
}
