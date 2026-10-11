import type { Answer, GeneratedItem } from '../engine/skills/generators';
const small = [
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
];
const tens = [
  '',
  '',
  'tjue',
  'tretti',
  'førti',
  'femti',
  'seksti',
  'sytti',
  'åtti',
  'nitti',
];
function number(text: string): number | null {
  const normalized = text
    .replace(/^svaret er\s+/, '')
    .replace(/[.!?]$/, '')
    .trim();
  if (/^-?\d+(?:[.,]\d+)?$/.test(normalized))
    return Number(normalized.replace(',', '.'));
  if (normalized === 'ett') return 1;
  if (normalized === 'syv') return 7;
  for (let i = 0; i < 100; i++) {
    const word =
      i < 20
        ? small[i]
        : tens[Math.floor(i / 10)] + (i % 10 ? small[i % 10] : '');
    if (normalized.replaceAll(' ', '') === word) return i;
  }
  const decimal = normalized.split(' komma ');
  if (decimal.length === 2) {
    const whole = number(decimal[0]),
      fraction = number(decimal[1]);
    if (whole !== null && fraction !== null && fraction < 10)
      return whole + fraction / 10;
  }
  return null;
}
export function parseVoiceAnswer(
  text: string,
  type: GeneratedItem['answerType'],
  choices: string[] = [],
): Answer | null {
  const normalized = text.toLocaleLowerCase('nb-NO').trim();
  if (type === 'number') return number(normalized);
  if (type === 'choice')
    return (
      choices.find(
        (c) =>
          c.toLocaleLowerCase('nb-NO') === normalized.replace(/[.!?]$/, ''),
      ) ?? null
    );
  if (type === 'remainder') {
    const split = normalized.replace(/[.!?]$/, '').split(' rest ');
    if (split.length !== 2) return null;
    const quotient = number(split[0]),
      remainder = number(split[1]);
    return quotient !== null && remainder !== null
      ? { quotient, remainder }
      : null;
  }
  if (type === 'coordinate') {
    const match = /^x\s+(.+?)\s+y\s+(.+?)[.!?]?$/.exec(normalized);
    if (!match) return null;
    const x = number(match[1]),
      y = number(match[2]);
    return x !== null && y !== null ? { x, y } : null;
  }
  return null;
}
