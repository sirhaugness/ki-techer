import { authOrigin } from '@/lib/auth/origin';
import { leoAccess } from '@/lib/learning/access';
import { logAi } from '@/lib/learning/repository';
import { fixtureEnabled } from '@/lib/learning/fixture';
import { openaiVoice } from '@/lib/voice/openai';
import { openaiProvider } from '@/lib/ai/openai';
import { approved } from '@/lib/ai/moderation';
import { MAX_AUDIO_BYTES, validAudio } from '@/lib/voice/contracts';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  if (
    request.headers.get('origin') !== authOrigin(request.headers, request.url)
  )
    return new Response(null, { status: 403 });
  if (
    Number(request.headers.get('content-length') ?? 0) >
    MAX_AUDIO_BYTES + 10_000
  )
    return Response.json(
      { message: 'Opptaket er for stort. Prøv en kortere setning.' },
      { status: 413 },
    );
  try {
    const mock = fixtureEnabled();
    const access = mock ? null : await leoAccess();
    const form = await request.formData(),
      file = form.get('audio');
    if (!(file instanceof File) || !validAudio(file))
      return Response.json(
        { message: 'Prøv et kort taleopptak på nytt.' },
        { status: 400 },
      );
    if (mock)
      return Response.json(
        { text: 'Tolv.' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL_STT)
      return Response.json(
        { message: 'Tale er ikke tilgjengelig nå. Bruk tastaturet.' },
        { status: 503 },
      );
    const log = (call: Parameters<typeof logAi>[1]) =>
      logAi(access!.profile.householdId, call);
    const text = await openaiVoice(log).transcribe(
      file,
      process.env.OPENAI_MODEL_STT,
    );
    if (text.length > 600 || !(await approved(openaiProvider(log), text)))
      return Response.json(
        {
          message:
            'Vi kunne ikke bruke det som ble sagt. Prøv et kort mattesvar.',
        },
        { status: 400 },
      );
    return Response.json(
      { text },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      {
        message: 'Vi kunne ikke høre svaret. Prøv igjen eller bruk tastaturet.',
      },
      { status: 503 },
    );
  }
}
