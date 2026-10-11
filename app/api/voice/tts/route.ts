import { allowDevice, budgetStatus, budgetGuard } from '@/lib/security/limits';
import { boundedJson } from '@/lib/security/body';
import { homeChapter } from '@/lib/profile/home';
import { z } from 'zod';
import { authOrigin } from '@/lib/auth/origin';
import { leoAccess } from '@/lib/learning/access';
import { latestSession, logAi } from '@/lib/learning/repository';
import { fixtureEnabled, fixture } from '@/lib/learning/fixture';
import { speechAudio } from '@/lib/voice/speech';
import { speechCache } from '@/lib/voice/cache';
import { homeSpeech } from '@/lib/voice/text';
import { openaiVoice } from '@/lib/voice/openai';
export const runtime = 'nodejs';
export const maxDuration = 60;
const schema = z
  .object({
    sessionId: z.uuid(),
    revision: z.number().int().nonnegative(),
    source: z.enum(['home', 'speech', 'task', 'all']),
  })
  .strict();
export async function POST(request: Request) {
  if (
    request.headers.get('origin') !== authOrigin(request.headers, request.url)
  )
    return new Response(null, { status: 403 });
  const body = await boundedJson(request);
  if (body.tooLarge) return new Response(null, { status: 413 });
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) return new Response(null, { status: 400 });
  try {
    const mock = fixtureEnabled(),
      access = mock ? null : await leoAccess(),
      profile = mock ? fixture().profile : access!.profile;
    if (profile.settings.voice === false)
      return new Response(null, { status: 403 });
    if (
      !mock &&
      !(await allowDevice(access!.device.id, profile.householdId, 'tts'))
    )
      return new Response(null, {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    const state =
      parsed.data.source === 'home'
        ? null
        : mock
          ? fixture().state
          : await latestSession(profile.id);
    if (
      parsed.data.source !== 'home' &&
      (!state ||
        state.id !== parsed.data.sessionId ||
        state.revision !== parsed.data.revision)
    )
      return new Response(null, { status: 409 });
    const source = parsed.data.source;
    if (source === 'home' && parsed.data.sessionId !== profile.id)
      return new Response(null, { status: 403 });
    const story = source === 'home' ? await homeChapter(profile) : null;
    const text =
      source === 'home'
        ? `${homeSpeech(profile.tutorName)} ${story!.title}. Kapittel ${story!.number}. ${story!.text}`
        : [
            source !== 'task' ? state!.response.speech : '',
            source !== 'speech' && !state!.endedAt
              ? (state!.active?.text ?? '')
              : '',
          ]
            .filter(Boolean)
            .join(' ');
    if (!text || text.length > 1200) return new Response(null, { status: 400 });
    if (mock) {
      // A short PCM WAV fixture exercises actual browser playback without API calls.
      const bytes = Buffer.alloc(44 + 1600);
      bytes.write('RIFF', 0);
      bytes.writeUInt32LE(bytes.length - 8, 4);
      bytes.write('WAVEfmt ', 8);
      bytes.writeUInt32LE(16, 16);
      bytes.writeUInt16LE(1, 20);
      bytes.writeUInt16LE(1, 22);
      bytes.writeUInt32LE(8000, 24);
      bytes.writeUInt32LE(16000, 28);
      bytes.writeUInt16LE(2, 32);
      bytes.writeUInt16LE(16, 34);
      bytes.write('data', 36);
      bytes.writeUInt32LE(1600, 40);
      return new Response(bytes, {
        headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' },
      });
    }
    const model = process.env.OPENAI_MODEL_TTS,
      voice = process.env.OPENAI_TTS_VOICE;
    if (!model || !voice) return new Response(null, { status: 503 });
    let enabled = false;
    try {
      enabled =
        Boolean(process.env.OPENAI_API_KEY) &&
        !(await budgetStatus(profile.householdId)).fallback;
    } catch {
      /* Cached sound can still be used. */
    }
    const provider = enabled
      ? openaiVoice(
          (call) => logAi(profile.householdId, call),
          budgetGuard(profile.householdId),
        )
      : null;
    const audio = await speechAudio({
      scope: profile.householdId,
      text,
      model,
      voice,
      cache: speechCache(),
      provider,
    });
    return new Response(Buffer.from(audio.bytes), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, no-store',
        'X-Audio-Cache': audio.cached ? 'hit' : 'miss',
      },
    });
  } catch {
    return Response.json(
      { message: 'Opplesingen er utilgjengelig akkurat nå.' },
      { status: 503 },
    );
  }
}
