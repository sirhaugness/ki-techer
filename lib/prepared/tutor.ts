import { z } from 'zod';
import type { AiProvider } from '../ai/provider';
import { approved, privateText } from '../ai/moderation';
import type { Progress } from './contracts';
import { missions } from './content';
import { checkedSolution } from './math';
const decisionSchema = z
  .object({
    intent: z.enum(['groups', 'angles', 'roles', 'example', 'clarify']),
    evidence: z.enum(['not-assessed', 'insufficient', 'partial', 'relevant']),
    quoteA: z.string().max(300),
    quoteB: z.string().max(300),
    safety: z.boolean(),
  })
  .strict();
export async function selectTeaching(input: {
  provider: AiProvider | null;
  instructions: string;
  progress: Progress;
  text: string;
  probe: boolean;
  messages: { role: string; text: string }[];
}) {
  const { provider, progress: p, text } = input;
  const safe = !privateText(text) && (await approved(provider, text));
  if (!safe || !provider)
    return {
      source: 'fallback' as const,
      decision: null,
      accepted: false,
      roles: null,
    };
  try {
    const reply = await provider.respond({
      purpose: input.probe ? 'explanation' : 'help',
      instructions: input.instructions,
      maxOutputTokens: 1000,
      timeoutMs: 15000,
      schema: decisionSchema,
      input: JSON.stringify({
        mission: missions[p.index],
        mode: p.mode,
        actions: p.work,
        checkedAnswer: {
          numericCorrect: p.numericCorrect,
          modelCorrect: p.modelCorrect,
        },
        mathematicalHelpGiven: p.assisted,
        helpLevel: p.helpLevel,
        followUps: p.followUps,
        priorRoleEvidence: p.probeRoles,
        probe: input.probe
          ? { id: 'SW19-divisor-roles', question: missions[2].question }
          : null,
        checkedSolution: p.assisted ? checkedSolution(p.index) : undefined,
        lastSubmission: text,
        messages: input.messages.slice(-6),
      }),
    });
    const d = decisionSchema.parse(reply.value);
    // Persist only validated role coverage, never raw quotes inside progress.
    const reliable = ['partial', 'relevant'].includes(d.evidence);
    // The model rubric interprets natural language; code checks grounding,
    // distinct evidence and excludes quotations that only repeat a result.
    const grounded = (quote: string) => {
      const words = quote.toLocaleLowerCase('nb').match(/\p{L}+/gu) ?? [];
      return (
        !!quote.trim() &&
        text.includes(quote) &&
        words.some(
          (word) =>
            ![
              'begge',
              'blir',
              'er',
              'svaret',
              'svar',
              'lik',
              'seks',
              'tre',
            ].includes(word),
        )
      );
    };
    const distinct =
      !d.quoteA.trim() ||
      !d.quoteB.trim() ||
      d.quoteA.trim().toLocaleLowerCase('nb') !==
        d.quoteB.trim().toLocaleLowerCase('nb');
    const roles = {
      a: reliable && distinct && grounded(d.quoteA),
      b: reliable && distinct && grounded(d.quoteB),
    };
    if (input.probe && !d.safety) {
      const a = p.probeRoles.a || roles.a,
        b = p.probeRoles.b || roles.b;
      if (d.evidence === 'relevant' && !(a && b)) d.evidence = 'not-assessed';
      else if (
        a &&
        b &&
        (roles.a || roles.b) &&
        ['partial', 'relevant'].includes(d.evidence)
      )
        d.evidence = 'relevant';
    }
    return {
      source: 'model-selection' as const,
      decision: d,
      accepted: true,
      roles,
    };
  } catch {
    return {
      source: 'fallback' as const,
      decision: null,
      accepted: true,
      roles: null,
    };
  }
}
