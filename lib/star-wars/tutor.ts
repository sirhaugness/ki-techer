import { z } from 'zod';
import { approved, privateText } from '../ai/moderation';
import type { AiProvider } from '../ai/provider';
import type { Mission, Progress } from './contracts';
import { checkedSolution, checkWork } from './math';
const replySchema = z
  .object({ speech: z.string().trim().min(1).max(500) })
  .strict();
// Restricted arithmetic parser: only integer operands and the four elementary operations.
function calculate(expression: string) {
  const parts =
    expression
      .replace(
        /[×x·:÷−]/g,
        (c) =>
          ({ '×': '*', x: '*', '·': '*', ':': '/', '÷': '/', '−': '-' })[c]!,
      )
      .replace(/\s/g, '')
      .match(/\d+|[+*/-]/g) ?? [];
  if (!parts.length) return NaN;
  const sums: number[] = [];
  let value = Number(parts[0]);
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i + 1]),
      op = parts[i];
    if (op === '*') value *= n;
    else if (op === '/') value /= n;
    else {
      sums.push(value);
      value = op === '-' ? -n : n;
    }
  }
  return sums.reduce((a, b) => a + b, 0) + value;
}
export function groundedSpeech(text: string, context: string) {
  if (privateText(text) || /https?:|www\.|<[^>]+>/i.test(text)) return false;
  const numbers = new Set(['0', '1', '2', ...(context.match(/\d+/g) ?? [])]);
  if ((text.match(/\d+/g) ?? []).some((n) => !numbers.has(n))) return false;
  for (const match of text.matchAll(
    /(\d+(?:\s*[+−\-×x·:÷*/]\s*\d+){1,4})\s*=\s*([-−]?\d+)/gu,
  )) {
    const value = calculate(match[1]);
    if (
      !Number.isFinite(value) ||
      Math.abs(value - Number(match[2].replace('−', '-'))) > 0.00001
    )
      return false;
  }
  return true;
}
export async function forceReply(input: {
  provider: AiProvider | null;
  instructions: string;
  mission: Mission;
  progress: Progress;
  text: string;
  messages: { role: string; text: string }[];
}) {
  const { provider, mission, progress: p, text } = input;
  const mathematicalContext = JSON.stringify({
    mission,
    checkedSolution: checkedSolution(p.index),
  });
  const fallback = {
    speech: mission.hints[Math.min(Math.max(0, p.helpLevel - 1), 2)],
    source: 'fallback' as const,
    accepted: false,
  };
  if (!provider || !(await approved(provider, text))) return fallback;
  const context = JSON.stringify({
    mission,
    work: p.work,
    assessment: checkWork(p.index, p.work),
    checkedSolution: checkedSolution(p.index),
    mathematicalHelpGiven: p.assisted,
    helpLevel: p.helpLevel,
    lastSubmission: text,
    messages: input.messages.slice(-8),
  });
  try {
    const reply = await provider.respond({
      purpose: 'help',
      instructions: input.instructions,
      input: context,
      schema: replySchema,
      maxOutputTokens: 900,
      timeoutMs: 20000,
    });
    const { speech } = replySchema.parse(reply.value);
    if (
      !groundedSpeech(speech, mathematicalContext) ||
      !(await approved(provider, speech))
    )
      return { ...fallback, accepted: true };
    return { speech, source: 'model' as const, accepted: true };
  } catch {
    return { ...fallback, accepted: true };
  }
}
