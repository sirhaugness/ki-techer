import type { AiCall } from '../ai/provider';
export interface VoiceProvider {
  speak(text: string, model: string, voice: string): Promise<Uint8Array>;
  transcribe(file: File, model: string): Promise<string>;
}
export interface SpeechCache {
  get(hash: string, voice: string): Promise<Uint8Array | null>;
  put(
    hash: string,
    voice: string,
    path: string,
    bytes: Uint8Array,
  ): Promise<void>;
}
export type VoiceLog = (call: AiCall) => Promise<void>;
export const MAX_AUDIO_BYTES = 4_000_000;
export function audioMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return (
    [
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
    ].find((m) => MediaRecorder.isTypeSupported(m)) ?? null
  );
}
export function validAudio(file: File): boolean {
  return (
    file.size > 0 &&
    file.size <= MAX_AUDIO_BYTES &&
    [
      'audio/mp4',
      'audio/x-m4a',
      'audio/m4a',
      'audio/webm',
      'audio/ogg',
      'audio/wav',
      'audio/mpeg',
    ].includes(file.type.split(';')[0])
  );
}
