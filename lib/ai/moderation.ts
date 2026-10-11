import type { AiProvider } from './provider';
export function privateText(text: string): boolean {
  return /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+47\s*)?\b(?:\d[ -]?){8,}\b|\b(?:jeg bor|adressen min|skolen min heter|etternavnet mitt)\b/i.test(
    text,
  );
}
/** Unavailable moderation is a rejection, never permission to send/display free text. */
export async function approved(
  provider: AiProvider | null,
  text: string,
): Promise<boolean> {
  if (privateText(text) || !provider) return false;
  try {
    return await provider.moderate(text);
  } catch {
    return false;
  }
}
