import 'server-only';
import OpenAI from 'openai';
import type { VoiceProvider, VoiceLog } from './contracts';
import type { BudgetGuard } from '../security/limits';
export function openaiVoice(log: VoiceLog, budget: BudgetGuard): VoiceProvider {
  if (!budget) throw new Error('Ekte tale-KI krever budsjettvakt.');
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 20_000,
    maxRetries: 0,
  });
  return {
    async speak(text, model, voice) {
      const started = Date.now();
      const ceiling = Math.max(0.5, (text.length / 1000) * 0.3);
      const reservation = await budget.reserve(ceiling);
      if (!reservation) throw new Error('KI-budsjettet er brukt opp.');
      let ok = false;
      try {
        const response = await client.audio.speech.create({
          model,
          voice,
          input: text,
          response_format: 'mp3',
          instructions:
            'Snakk rolig og tydelig på norsk bokmål. Vennlig mattelærer for et barn.',
        });
        const bytes = new Uint8Array(await response.arrayBuffer());
        ok = true;
        return bytes;
      } finally {
        const call = {
          purpose: 'tts',
          model,
          input_tokens: Math.ceil(text.length / 4),
          output_tokens: 0,
          cost_estimate: ok ? (text.length / 1000) * 0.3 : 0,
          latency_ms: Date.now() - started,
          ok,
        };
        await budget.settle(reservation, ceiling, call);
        await log(call);
      }
    },
    async transcribe(file, model) {
      const started = Date.now();
      const ceiling = Math.max(0.5, (file.size / 1_000_000) * 2);
      const reservation = await budget.reserve(ceiling);
      if (!reservation) throw new Error('KI-budsjettet er brukt opp.');
      let ok = false;
      try {
        const response = await client.audio.transcriptions.create({
          model,
          file,
          language: 'no',
          response_format: 'json',
        });
        ok = true;
        return response.text;
      } finally {
        const call = {
          purpose: 'stt',
          model,
          input_tokens: 0,
          output_tokens: 0,
          cost_estimate: ok ? (file.size / 1_000_000) * 2 : 0,
          latency_ms: Date.now() - started,
          ok,
        };
        await budget.settle(reservation, ceiling, call);
        await log(call);
      }
    },
  };
}
