import { createHash } from 'node:crypto';
import type { SpeechCache, VoiceProvider } from './contracts';
export function speechHash(
  scope: string,
  text: string,
  model: string,
  voice: string,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        scope,
        text,
        model,
        voice,
        locale: 'nb-NO',
        version: 1,
      }),
    )
    .digest('hex');
}
export async function speechAudio({
  scope,
  text,
  model,
  voice,
  cache,
  provider,
}: {
  scope: string;
  text: string;
  model: string;
  voice: string;
  cache: SpeechCache;
  provider: VoiceProvider | null;
}) {
  const hash = speechHash(scope, text, model, voice);
  try {
    const cached = await cache.get(hash, voice);
    if (cached) return { bytes: cached, cached: true };
  } catch {
    /* Cache outage does not block playback. */
  }
  if (!provider) throw new Error('Opplesing er ikke konfigurert.');
  const bytes = await provider.speak(text, model, voice);
  try {
    await cache.put(hash, voice, `${scope}/${hash}.mp3`, bytes);
  } catch {
    /* Return generated audio even if caching is unavailable. */
  }
  return { bytes, cached: false };
}
