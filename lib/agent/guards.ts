import type { GeneratedItem } from '../engine/skills/generators';
import { responseSchema, type TutorResponse } from './schemas';
const numberWords = [
  'null',
  'en',
  'to',
  'tre',
  'fire',
  'fem',
  'seks',
  'sju',
  'åtte',
  'ni',
  'ti',
  'elleve',
  'tolv',
  'tretten',
  'fjorten',
  'femten',
  'seksten',
  'sytten',
  'atten',
  'nitten',
  'tjue',
];
// Unicode letter boundaries matter for «åtte» and «én». Reject mathematical
// number phrases before a full solution, including compounds such as
// «trettitre» and «ett tusen fire hundre», rather than matching only 0–20.
const numeralAtoms = [
  ...numberWords.filter((word) => word !== 'en'),
  'syv',
  'tyve',
  'tretti',
  'tredve',
  'førti',
  'femti',
  'seksti',
  'sytti',
  'åtti',
  'nitti',
  'hundre',
  'tusen',
  'million',
  'millioner',
  'milliard',
  'milliarder',
  'halv',
  'halve',
  'halvpart',
  'halvparten',
  'kvart',
  'tredel',
  'tredjedel',
  'fjerdedel',
];
const numeralAtomsWithOne = [
  ...numeralAtoms,
  'en',
  'én',
  'et',
  'ett',
  'og',
  'komma',
  'minus',
];
function mathematicalWords(text: string): boolean {
  const words =
    text
      .toLocaleLowerCase('nb-NO')
      .normalize('NFKC')
      .match(/\p{L}+/gu) ?? [];
  return words.some((word) => {
    if (['en', 'én', 'et', 'ett', 'og', 'komma', 'minus'].includes(word))
      return false;
    // Dynamic programming avoids ambiguous regex repetition/backtracking.
    const reachable = new Set([0]);
    for (let i = 0; i < word.length; i++) {
      if (!reachable.has(i)) continue;
      for (const atom of numeralAtomsWithOne)
        if (word.startsWith(atom, i)) reachable.add(i + atom.length);
    }
    return reachable.has(word.length);
  });
}
export function containsMathClaim(text: string): boolean {
  return /[\p{N}=÷×]/u.test(text) || mathematicalWords(text);
}
export function conciseNorwegian(text: string): boolean {
  return (
    text.length <= 360 &&
    (text.match(/[.!?]+(?:\s|$)/g) ?? []).length <= 3 &&
    text.split(/[.!?]/).every((s) => s.trim().split(/\s+/).length <= 20) &&
    (text.match(/\?/g) ?? []).length <= 1 &&
    !/\b(the|you|your|answer|correct|great|smart|flink|dum)\b/i.test(text)
  );
}
export function leaksAnswer(text: string, item: GeneratedItem): boolean {
  const answers =
    typeof item.answer === 'object'
      ? Object.values(item.answer)
      : [item.answer];
  const normalized = text.toLocaleLowerCase('nb-NO').normalize('NFKC');
  return answers.some((answer) => {
    if (typeof answer === 'number') {
      const tokens = normalized.match(/\d+(?:[.,]\d+)?/g) ?? [];
      if (tokens.some((n) => Number(n.replace(',', '.')) === answer))
        return true;
      const word = numberWords[answer];
      return (
        !!word &&
        new RegExp(
          `(?<![\\p{L}\\p{N}])${answer === 1 ? '(?:en|én|et|ett)' : word}(?![\\p{L}\\p{N}])`,
          'iu',
        ).test(normalized)
      );
    }
    return (
      typeof answer === 'string' &&
      normalized.includes(answer.toLocaleLowerCase('nb-NO'))
    );
  });
}
export function guardResponse(
  value: unknown,
  item: GeneratedItem | null,
  allowedHintLevel: number,
  allowTaskQuantities = false,
): TutorResponse | null {
  const result = responseSchema.safeParse(value);
  if (!result.success) return null;
  const response = result.data;
  if (
    !conciseNorwegian(response.speech) ||
    response.hint_level_used > allowedHintLevel
  )
    return null;
  // Help may refer to quantities already visible in a verified task, but must
  // never introduce new numbers, an arithmetic expression or the answer.
  const quantities = new Set(
    Object.values(item?.params ?? {}).filter(
      (value) => typeof value === 'number',
    ),
  );
  const checkedQuantities =
    allowTaskQuantities &&
    !/[=+*/÷×·^]|\d\s*-\s*\d/u.test(response.speech) &&
    (response.speech.match(/\d+(?:[.,]\d+)?/g) ?? []).every((value) =>
      quantities.has(Number(value.replace(',', '.'))),
    ) &&
    !containsMathClaim(response.speech.replaceAll(/\d+(?:[.,]\d+)?/g, ''));
  // Any mathematical claim might encode the answer indirectly. Before full solution,
  // numeric/equality statements in conversational speech are conservatively rejected.
  if (
    item &&
    allowedHintLevel < 4 &&
    (leaksAnswer(response.speech, item) ||
      (containsMathClaim(response.speech) && !checkedQuantities))
  )
    return null;
  return response;
}
