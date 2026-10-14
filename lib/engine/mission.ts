import type { GeneratedItem } from './skills/generators';
import { checkAnswer } from './skills/generators';
import { checkMultiplicationExpression } from './expression-answer';
import { verifyGeneratedItem } from './verified-item';
import { parse } from 'mathjs';
import { arithmeticValue } from './verified-item';

export type MissionMath = {
  kind: 'groups' | 'share' | 'measure' | 'missing' | 'double' | 'native';
  mode?: 'doble' | 'halvere';
  groups: number;
  each: number;
  total: number;
  known: number;
  equation: string;
};
export type MissionInteraction = {
  kind:
    | 'quantity'
    | 'grouping'
    | 'compare'
    | 'equation'
    | 'build-expression'
    | 'match-scene'
    | 'native';
  math: MissionMath;
  options: number[];
  object: string;
  container: string;
};

/** The picture uses independently verified generator parameters, never model numbers. */
export function missionMath(item: GeneratedItem): MissionMath {
  const p = item.params;
  const base: MissionMath = {
    kind: 'native',
    groups: 0,
    each: 0,
    total: 0,
    known: 0,
    equation: item.question,
  };
  if (
    ['regneuttrykk-fra-situasjon', 'situasjon-fra-regneuttrykk'].includes(
      item.skillId,
    )
  )
    return {
      kind: 'share',
      groups: Number(p.b),
      each: Number(p.total) / Number(p.b),
      total: Number(p.total),
      known: 0,
      equation: `${p.total} : ${p.b} = ?`,
    };
  if (
    [
      'mult-telling-grupper',
      'mult-tabell-2-5-10',
      'mult-tabell-3-4',
      'mult-tabell-6-9',
    ].includes(item.skillId)
  )
    return {
      kind: 'groups',
      groups: Number(p.a),
      each: Number(p.b),
      total: Number(p.a) * Number(p.b),
      known: 0,
      equation: `${p.a} × ${p.b} = ?`,
    };
  if (
    item.skillId.startsWith('div-') &&
    typeof p.total === 'number' &&
    typeof p.b === 'number' &&
    item.answerType === 'number' &&
    Number(item.answer) * p.b === p.total
  )
    return {
      kind: item.skillId === 'div-maaling-konkret' ? 'measure' : 'share',
      groups: item.skillId === 'div-maaling-konkret' ? 0 : Number(p.b),
      each: item.skillId === 'div-maaling-konkret' ? p.b : Number(item.answer),
      total: p.total,
      known: 0,
      equation: `${p.total} : ${p.b} = ?`,
    };
  if (item.skillId === 'likhetstegn')
    return {
      ...base,
      kind: 'missing',
      total: Number(p.a) + Number(p.b) + Number(p.c),
      known: Number(p.c),
      equation: `${Number(p.a) + Number(p.b) + Number(p.c)} = ${p.c} + ?`,
    };
  if (item.skillId === 'dobling-halvering')
    return {
      ...base,
      kind: 'double',
      mode: p.mode === 'doble' ? 'doble' : 'halvere',
      total: Number(p.a) * 2,
      known: Number(p.a),
      groups: 2,
      each: Number(p.a),
      equation:
        p.mode === 'doble'
          ? `${p.a} + ${p.a} = ?`
          : `${Number(p.a) * 2} : 2 = ?`,
    };
  return base;
}

export function compileInteraction(
  item: GeneratedItem,
  requested: MissionInteraction['kind'],
  object: string,
  container: string,
  index: number,
): MissionInteraction {
  const math = missionMath(item);
  let kind = requested;
  if (item.answerType !== 'number') kind = 'native';
  if (requested !== 'native' && item.skillId === 'regneuttrykk-fra-situasjon')
    kind = 'build-expression';
  if (requested !== 'native' && item.skillId === 'situasjon-fra-regneuttrykk')
    kind = 'match-scene';
  if (kind === 'grouping' && !['groups', 'share'].includes(math.kind))
    kind = 'quantity';
  if (kind === 'equation' && math.kind !== 'groups') kind = 'quantity';
  const n = typeof item.answer === 'number' ? item.answer : 0;
  const values =
    n > 0 ? [n - 1, n, n + Math.max(1, math.each || 2)] : [0, 1, 2];
  const offset = index % 3;
  return {
    kind,
    math,
    object,
    container,
    options: [...values.slice(offset), ...values.slice(0, offset)],
  };
}

/** One authoritative judgement for progress, evidence and teacher feedback. */
export function judgeTaskAnswer(
  task: {
    item: GeneratedItem;
    expressionRequired?: boolean;
    interaction?: MissionInteraction;
  },
  answer: unknown,
) {
  const compound =
    answer &&
    typeof answer === 'object' &&
    !Array.isArray(answer) &&
    'value' in answer
      ? (answer as {
          value: number;
          expression?: string;
          allocations?: number[];
        })
      : null;
  const canonical =
    task.item.skillId === 'regneuttrykk-fra-situasjon' &&
    typeof answer === 'string'
      ? answer
          .replaceAll(/[×·xX]/g, '*')
          .replaceAll(/[÷:]/g, '/')
          .replaceAll('−', '-')
          .replaceAll(/\s+/g, '')
          .replace(/(\d+)([+*/-])(\d+)/, '$1 $2 $3')
      : answer;
  const numericCorrect = checkAnswer(
    task.item,
    compound ? compound.value : canonical,
  );
  const expressionCorrect =
    !task.expressionRequired ||
    (!!compound?.expression &&
      checkMultiplicationExpression(
        compound.expression,
        Number(task.item.params.a),
        Number(task.item.params.b),
      ));
  const allocations = compound?.allocations;
  const m = task.interaction?.math;
  const groupingCorrect =
    !allocations ||
    (!!m &&
      allocations.length === m.groups &&
      allocations.every((n) => Number.isSafeInteger(n) && n === m.each) &&
      allocations.reduce((a, b) => a + b, 0) === m.total);
  return {
    numericCorrect,
    expressionCorrect,
    groupingCorrect,
    correct: numericCorrect && expressionCorrect && groupingCorrect,
    expression: compound?.expression ?? null,
  };
}

/** A selected expression can give a verified resource quantity, too. */
export function missionBudget(item: GeneratedItem): number | null {
  if (typeof item.answer === 'number') return item.answer;
  if (
    item.answerType === 'choice' &&
    item.expression &&
    verifyGeneratedItem(item)
  ) {
    try {
      const result = arithmeticValue(parse(item.expression));
      return Number.isSafeInteger(result) && result >= 0 ? result : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Validate the compiled chapter, including what the player actually does. */
export function validateMissionChapter(
  tasks: { item: GeneratedItem; interaction?: MissionInteraction }[],
) {
  if (
    tasks.length !== 6 ||
    tasks.some(
      (t) =>
        !verifyGeneratedItem(t.item) ||
        !t.interaction ||
        JSON.stringify(t.interaction.math) !==
          JSON.stringify(missionMath(t.item)) ||
        (t.interaction.kind === 'grouping' &&
          !['groups', 'share'].includes(t.interaction.math.kind)) ||
        (t.interaction.kind === 'compare' &&
          (new Set(t.interaction.options).size !== 3 ||
            !t.interaction.options.includes(Number(t.item.answer)))),
    )
  )
    return false;
  return new Set(tasks.map((t) => t.interaction!.kind)).size >= 3;
}
