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
      return !!word && new RegExp(`\\b${word}\\b`, 'u').test(normalized);
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
): TutorResponse | null {
  const result = responseSchema.safeParse(value);
  if (!result.success) return null;
  const response = result.data;
  if (
    !conciseNorwegian(response.speech) ||
    response.hint_level_used > allowedHintLevel
  )
    return null;
  // Any mathematical claim might encode the answer indirectly. Before full solution,
  // numeric/equality statements in conversational speech are conservatively rejected.
  if (
    item &&
    allowedHintLevel < 4 &&
    (leaksAnswer(response.speech, item) || /\d|[=÷×]/.test(response.speech))
  )
    return null;
  return response;
}
