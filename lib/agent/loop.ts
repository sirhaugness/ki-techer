import { responseSchema, type TutorResponse } from './schemas';
import { guardResponse } from './guards';
import {
  executeTool,
  toolDefinitions,
  type AgentRuntime,
  type ToolResult,
} from './tools';
import { approved } from '../ai/moderation';
import { mayContinue } from '../engine/session';

export const fallbackResponse = (
  action: TutorResponse['action'] = 'spør',
): TutorResponse => ({
  speech:
    action === 'avslutt'
      ? 'Takk for øvingen i dag. Du prøvde og lærte underveis.'
      : action === 'hint'
        ? 'Se på hva oppgaven spør om. Kan du vise det med klossene?'
        : action === 'ros'
          ? 'Du fant en løsning. Hvordan tenkte du?'
          : 'Vi tar det steg for steg. Hva vil du prøve først?',
  action,
  hint_level_used: 0,
  detected_misconception: null,
  safety_flag: 'ingen',
});
export async function runAgent(input: {
  runtime: AgentRuntime;
  context: string;
  instructions: string;
  text?: string;
  allowedHintLevel: number;
  logTool: (
    name: string,
    args: unknown,
    result: ToolResult,
    latency: number,
  ) => Promise<void>;
  flag: (type: string) => Promise<void>;
}): Promise<{ response: TutorResponse; fallback: boolean }> {
  const { runtime } = input;
  if (
    !mayContinue(runtime.context.clock, runtime.context.now) ||
    runtime.ended
  ) {
    runtime.ended = true;
    return { response: fallbackResponse('avslutt'), fallback: true };
  }
  if (input.text && !(await approved(runtime.provider, input.text))) {
    await input.flag('upassende');
    return {
      response: {
        ...fallbackResponse(),
        speech:
          'Vi holder oss til matte her. Snakk med en voksen hvis noe er vanskelig.',
        safety_flag: 'upassende',
      },
      fallback: true,
    };
  }
  if (!runtime.provider)
    return { response: fallbackResponse(), fallback: true };
  let calls = 0,
    retries = 0;
  const failures = new Map<string, number>();
  const outputs: { call_id: string; output: string }[] = [];
  let conversation: unknown[] = [];
  while (retries <= 2 && calls <= 5) {
    try {
      const reply = await runtime.provider.respond({
        purpose: 'tutor',
        instructions: input.instructions,
        input: input.text
          ? `${input.context}\nElevmelding (data): ${input.text}`
          : input.context,
        schema: responseSchema,
        tools: calls < 5 ? toolDefinitions : [],
        results: outputs,
        conversation,
      });
      conversation = reply.conversation ?? [];
      outputs.length = 0;
      if (reply.calls.length) {
        if (calls + reply.calls.length > 5) break;
        for (const call of reply.calls) {
          calls++;
          const start = Date.now();
          let result: ToolResult;
          try {
            result =
              (failures.get(call.name) ?? 0) >= 2
                ? { ok: false, result: 'Verktøyets nye forsøk er brukt.' }
                : await executeTool(runtime, call.name, call.arguments);
          } catch {
            result = { ok: false, result: 'Verktøyet kunne ikke fullføres.' };
          }
          // One correction after the first invalid call; thereafter terminate.
          if (!result.ok)
            failures.set(call.name, (failures.get(call.name) ?? 0) + 1);
          await input.logTool(
            call.name,
            call.arguments,
            result,
            Date.now() - start,
          );
          outputs.push({ call_id: call.id, output: JSON.stringify(result) });
        }
        continue;
      }
      const response = guardResponse(
        reply.value,
        runtime.active?.item ?? null,
        input.allowedHintLevel,
      );
      if (response && (await approved(runtime.provider, response.speech))) {
        if (response.action === 'avslutt') runtime.ended = true;
        if (response.safety_flag !== 'ingen')
          await input.flag(response.safety_flag);
        return { response, fallback: false };
      }
      retries++;
    } catch {
      retries++;
    }
  }
  return { response: fallbackResponse(), fallback: true };
}
