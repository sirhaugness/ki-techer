import 'server-only';
import { z } from 'zod';
import { parentOnly } from '../auth/session';
import { adminDb } from '../db/server';
import { fixtureEnabled, fixture } from '../learning/fixture';
import { parentFixture } from './fixture';
import type { Dashboard } from './contracts';
export async function parentLearner(learnerId: string) {
  if (!z.uuid().safeParse(learnerId).success)
    throw new Error('Ugyldig profil.');
  if (fixtureEnabled() && learnerId === fixture().profile.id)
    return {
      learner: parentFixture().learner,
      householdId: fixture().profile.householdId,
      mock: true,
    };
  const { client, user } = await parentOnly();
  const { data, error } = await client
    .from('learners')
    .select('*')
    .eq('id', learnerId)
    .single();
  if (error || !data) throw new Error('Fant ikke profilen.');
  return {
    learner: data,
    householdId: data.household_id,
    mock: false,
    user: { id: user.id, email: user.email, created_at: user.created_at },
  };
}
export async function dashboard(learnerId: string, offset: number = 0) {
  const access = await parentLearner(learnerId);
  if (access.mock) return parentFixture();
  const { data, error } = await adminDb().rpc('parent_dashboard', {
    target_learner: learnerId,
    page_offset: offset,
  });
  if (error || !data) throw new Error('Kunne ikke hente oversikten.');
  return data as unknown as Dashboard;
}
export async function clearHousehold(householdId: string) {
  const db = adminDb();
  const start = await db.rpc('begin_data_clear', {
    target_household: householdId,
  });
  if (start.error || !start.data)
    throw new Error('Kunne ikke starte sletting.');
  // List storage independently of the cache index to include orphaned uploads.
  let offset = 0;
  const paths: string[] = [];
  for (;;) {
    const { data, error } = await db.storage.from('leo-tts').list(householdId, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) {
      const buckets = await db.storage.listBuckets();
      if (!buckets.error && !buckets.data.some((b) => b.name === 'leo-tts'))
        break;
      throw new Error(
        'Kunne ikke kontrollere lydlageret. Sletting kan prøves igjen.',
      );
    }
    paths.push(...(data ?? []).map((o) => `${householdId}/${o.name}`));
    if (!data || data.length < 100) break;
    offset += 100;
  }
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage
      .from('leo-tts')
      .remove(paths.slice(i, i + 100));
    if (error)
      throw new Error('Kunne ikke slette lyden. Prøv sletting på nytt.');
  }
  const result = await db.rpc('clear_app_data', {
    target_household: householdId,
  });
  if (result.error || !result.data)
    throw new Error('Sletting kunne ikke fullføres. Prøv igjen.');
}
