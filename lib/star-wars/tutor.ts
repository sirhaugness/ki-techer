import { z } from 'zod';
import { approved, privateText } from '../ai/moderation';
import type { AiProvider } from '../ai/provider';
import type { Mission, Progress } from './contracts';
import { checkedSolution, checkWork, workFeedback, missionWork } from './math';
import { whyExplanations } from './explanations';
export function recordHelp(
  p: Progress,
  kind: 'ask' | 'hint' | 'example' | 'solution',
  strategy?: NonNullable<Progress['helpHistory']>[number]['strategy'],
) {
  p.assisted = true;
  p.helpHistory = [
    ...(p.helpHistory ?? []),
    {
      kind,
      level: p.helpLevel,
      strategy:
        strategy ?? (kind === 'hint' ? 'step' : kind === 'ask' ? 'step' : kind),
    },
  ].slice(-8);
  if (kind === 'solution' || (kind === 'hint' && p.helpLevel >= 3)) {
    p.solutionShown = true;
    p.helpHistory.at(-1)!.strategy = 'solution';
  }
}
export function questionIntent(text: string) {
  if (
    /^(?:kan du |vil du )?(?:vis|gi|fortell)(?: meg)?(?: og forklar)? (?:løsningen|fasiten|svaret)\b|^hva er (?:løsningen|fasiten|svaret)\b/i.test(
      text,
    )
  )
    return 'solution';
  if (
    /fortsatt|fremdeles|igjen|annen måte|skjønner ikke|forstår ikke/i.test(text)
  )
    return 'another-way';
  if (/hvorfor|hvordan kan/i.test(text)) return 'why';
  return 'next-step';
}
// Also used by the durable API claim. This stores no unmoderated learner text.
export function prepareQuestion(p: Progress, text: string) {
  const intent = questionIntent(text);
  // K2's third hint was already a full authored solution.
  p.solutionShown ??= p.helpLevel >= 3;
  const previous = p.helpHistory?.at(-1);
  const strategy =
    intent === 'solution'
      ? 'solution'
      : intent === 'why'
        ? 'why'
        : intent === 'another-way' &&
            previous &&
            previous.strategy !== 'example' &&
            previous.kind !== 'example'
          ? 'example'
          : p.status === 'incorrect' &&
              [0, 5, 16].includes(p.index) &&
              !previous &&
              intent !== 'another-way'
            ? 'feedback'
            : 'step';
  p.helpLevel = intent === 'solution' ? 3 : Math.max(1, p.helpLevel);
  recordHelp(p, intent === 'solution' ? 'solution' : 'ask', strategy);
}
export function fallbackSpeech(mission: Mission, p: Progress, text: string) {
  const intent = questionIntent(text);
  if (intent === 'solution') return checkedSolution(p.index);
  if (intent === 'why')
    return `${whyExplanations[p.index]} ${mission.hints[1]}`;
  const strategy = p.helpHistory?.at(-1)?.strategy;
  if (strategy === 'example') return mission.example;
  if (strategy === 'feedback') return workFeedback(p.index, p.work);
  return mission.hints[1];
}
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
export function groundedSpeech(
  text: string,
  context: string,
  observedNumbers: number[] = [],
) {
  if (privateText(text) || /https?:|www\.|<[^>]+>/i.test(text)) return false;
  // Only this exact attribution may quote an observed error. It does not make
  // the learner's number available for equations or other mathematical claims.
  text = text.replace(
    /(^|[.!?]\s+)Du skrev «(\d+)»\./g,
    (quote, prefix: string, n: string) =>
      observedNumbers.includes(Number(n))
        ? `${prefix}Du skrev et tall.`
        : quote,
  );
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
  const work = missionWork(mission, p.work);
  const submittedWork = (p.submittedWork ?? []).map((attempt) =>
    missionWork(mission, attempt),
  );
  const mathematicalContext = JSON.stringify({
    mission,
    checkedSolution: checkedSolution(p.index),
  });
  const fallback = {
    speech: fallbackSpeech(mission, p, text),
    source: 'fallback' as const,
    accepted: false,
  };
  if (!provider || !(await approved(provider, text))) return fallback;
  const context = JSON.stringify({
    mission,
    work,
    assessment: checkWork(p.index, work),
    checkedSolution: checkedSolution(p.index),
    mathematicalHelpGiven: p.assisted,
    helpLevel: p.helpLevel,
    learnerMessage: text,
    requestIntent: questionIntent(text),
    submittedAttempts: submittedWork.map((work) => ({
      work,
      assessment: checkWork(p.index, work),
    })),
    helpHistory: p.helpHistory ?? [],
    solutionShown: p.solutionShown ?? p.helpLevel >= 3,
    suggestedNextStep: fallback.speech,
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
      (!checkWork(p.index, p.work).correct &&
        /svaret ditt (?:er|var) riktig|du har (?:løst|klart|mestret) (?:oppgaven|oppdraget)|gå (?:videre )?til neste/i.test(
          speech,
        )) ||
      (questionIntent(text) === 'another-way' &&
        input.messages.at(-1)?.text.trim() === speech.trim()) ||
      !groundedSpeech(
        speech,
        mathematicalContext,
        [work, ...submittedWork].flatMap((w) =>
          [...w.numbers, ...w.groups, ...w.corners].filter(
            (n): n is number => n !== null,
          ),
        ),
      ) ||
      !(await approved(provider, speech))
    )
      return { ...fallback, accepted: true };
    return { speech, source: 'model' as const, accepted: true };
  } catch {
    return { ...fallback, accepted: true };
  }
}
