import { setupServer } from 'msw/node';
// Fremtidige Supabase/OpenAI-kall får eksplisitte mock-handlere her.
export const server = setupServer();
