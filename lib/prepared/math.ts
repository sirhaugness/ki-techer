import type { Work } from './contracts';
/** Independent, deterministic mathematical model. Never accepts a model-supplied answer. */
export function checkWork(index: number, work: Work) {
  if (index === 0) {
    const sum = work.groups.reduce((a, b) => a + b, 0);
    const correct =
      sum === 24 && work.groups.every((n) => n === 24 / work.groups.length);
    return {
      correct: correct && (work.value === null || work.value === 6),
      numericCorrect:
        work.value === null ? (correct ? true : null) : work.value === 6,
      modelCorrect: correct,
    };
  }
  if (index === 1) {
    // B is the authored rectangle. Four distinct corners are required.
    const correct = work.plate === 'B' && new Set(work.corners).size === 4;
    return { correct, numericCorrect: null, modelCorrect: correct };
  }
  const correct =
    work.roleA === 'recipients' &&
    work.roleB === 'size' &&
    work.demonstration === 'one-pack';
  return { correct, numericCorrect: null, modelCorrect: correct };
}
export function checkedSolution(index: number) {
  return index === 0
    ? {
        expression: '24 : 4 = 6',
        groups: [6, 6, 6, 6],
        unit: 'brikker per skjold',
      }
    : index === 1
      ? { plate: 'B', sides: 4, rightAngles: 4, corners: [0, 1, 2, 3] }
      : {
          expression: '18 : 3 = 6',
          a: { recipients: 3, perRecipient: 6 },
          b: { perPack: 3, packs: 6 },
        };
}
