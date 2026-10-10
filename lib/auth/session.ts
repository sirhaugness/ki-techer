import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db, configured } from '@/lib/db/server';
export async function signedIn() {
  if (!configured()) redirect('/login');
  const client = await db();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect('/login');
  return { client, user };
}
export async function currentDevice() {
  const { client, user } = await signedIn();
  const jar = await cookies();
  const id = z.uuid().safeParse(jar.get('leo-device')?.value);
  if (!id.success) return { client, user, device: null };
  const { data: device, error } = await client
    .from('devices')
    .select('*')
    .eq('id', id.data)
    .eq('parent_id', user.id)
    .maybeSingle();
  if (error) throw new Error('Kunne ikke kontrollere Leo-låsen.');
  return { client, user, device };
}
export async function parentOnly() {
  const ctx = await currentDevice();
  if (ctx.device?.leo_mode_locked) redirect('/leo');
  return ctx;
}
