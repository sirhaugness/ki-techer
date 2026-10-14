import 'server-only';
import OpenAI from 'openai';
import { z } from 'zod';
import type { AiProvider, AiCall, ModelRequest } from './provider';
import { estimateCost } from './provider';
import type { BudgetGuard } from '../security/limits';

const wireName = (name: string) =>
  name.replaceAll('ø', 'o').replaceAll('å', 'a').replaceAll('æ', 'ae');

export function openaiProvider(
  log: (call: AiCall) => Promise<void>,
  budget?: BudgetGuard,
): AiProvider {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 20_000,
    maxRetries: 0,
  });
  return {
    async respond(request: ModelRequest) {
      const model =
        request.purpose === 'tutor'
          ? process.env.OPENAI_MODEL_TUTOR
          : request.purpose === 'reflect'
            ? process.env.OPENAI_MODEL_REFLECT
            : process.env.OPENAI_MODEL_FAST;
      if (!model) throw new Error('Modelloppsettet mangler.');
      const started = Date.now();
      const outputLimit = Math.max(
        600,
        Math.min(6000, request.maxOutputTokens ?? 1200),
      );
      const ceiling = estimateCost(
        Buffer.byteLength(
          JSON.stringify({
            instructions: request.instructions,
            input: request.input,
            conversation: request.conversation,
            results: request.results,
            tools: request.tools,
            schema: z.toJSONSchema(request.schema),
          }),
        ) + 1000,
        outputLimit,
      );
      const reservation = budget ? await budget.reserve(ceiling) : null;
      if (budget && !reservation)
        throw new Error('KI-budsjettet er brukt opp.');
      let input = 0,
        output = 0,
        ok = false;
      try {
        const result = await client.responses.create(
          {
            model,
            store: false,
            instructions: request.instructions,
            input: [
              { role: 'user', content: request.input },
              ...(request.conversation ?? []),
              ...(request.results ?? []).map((r) => ({
                type: 'function_call_output',
                call_id: r.call_id,
                output: r.output,
              })),
            ] as OpenAI.Responses.ResponseInputItem[],
            include: ['reasoning.encrypted_content'],
            tools: request.tools?.map((t) => ({
              type: 'function' as const,
              ...t,
              name: wireName(t.name),
              strict: true,
            })),
            parallel_tool_calls: false,
            max_output_tokens: outputLimit,
            text: {
              format: {
                type: 'json_schema',
                name: 'result',
                strict: true,
                schema: z.toJSONSchema(request.schema),
              },
            },
          },
          { timeout: outputLimit > 3200 ? 45000 : 20000 },
        );
        input = result.usage?.input_tokens ?? 0;
        output = result.usage?.output_tokens ?? 0;
        ok = true;
        return {
          conversation: [
            ...(request.conversation ?? []),
            ...(request.results ?? []).map((r) => ({
              type: 'function_call_output',
              call_id: r.call_id,
              output: r.output,
            })),
            ...result.output,
          ],
          calls: result.output
            .filter((o) => o.type === 'function_call')
            .map((o) => ({
              id: o.call_id,
              name:
                request.tools?.find((t) => wireName(t.name) === o.name)?.name ??
                o.name,
              arguments: JSON.parse(o.arguments) as unknown,
            })),
          value: result.output_text
            ? (JSON.parse(result.output_text) as unknown)
            : undefined,
        };
      } finally {
        const call = {
          purpose: request.purpose,
          model,
          input_tokens: input,
          output_tokens: output,
          cost_estimate: estimateCost(input, output),
          latency_ms: Date.now() - started,
          ok,
        };
        if (budget && reservation)
          await budget.settle(reservation, ceiling, call);
        await log(call);
      }
    },
    async moderate(text) {
      const started = Date.now();
      let ok = false;
      try {
        const result = await client.moderations.create({ input: text });
        ok = true;
        return result.results.every((r) => !r.flagged);
      } finally {
        await log({
          purpose: 'moderation',
          model: 'moderation-endpoint',
          input_tokens: 0,
          output_tokens: 0,
          cost_estimate: 0,
          latency_ms: Date.now() - started,
          ok,
        });
      }
    },
  };
}
