'use server';
import { leoAccess } from '@/lib/learning/access';
import { fixtureEnabled } from '@/lib/learning/fixture';
import { demoTurn } from '@/lib/chapters/demo';

export async function playDemo(state: unknown, command: unknown) {
  // Every turn checks the same authenticated household + locked device as /leo.
  if (!fixtureEnabled()) await leoAccess();
  return demoTurn(state, command);
}
