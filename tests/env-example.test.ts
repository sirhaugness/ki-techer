import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const example = readFileSync('.env.example', 'utf8');
const entries = Object.fromEntries(
  example
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=')),
);
describe('miljømalen', () => {
  it('har nøyaktig de avtalte variablene', () => {
    expect(Object.keys(entries).sort()).toEqual(
      [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
        'SUPABASE_SECRET_KEY',
        'OPENAI_API_KEY',
        'OPENAI_MODEL_TUTOR',
        'OPENAI_MODEL_FAST',
        'OPENAI_MODEL_REFLECT',
        'OPENAI_MODEL_TTS',
        'OPENAI_TTS_VOICE',
        'OPENAI_MODEL_STT',
        'AI_MONTHLY_BUDGET_NOK',
        'APP_URL',
      ].sort(),
    );
  });
  it('inneholder ingen nøkler', () => {
    for (const name of [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_SECRET_KEY',
      'OPENAI_API_KEY',
    ])
      expect(entries[name]).toBe('');
  });
});
