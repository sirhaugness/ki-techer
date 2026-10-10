'use server';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { parentOnly, currentDevice } from '@/lib/auth/session';
import { pinSchema, hashPin, verifyPin } from '@/lib/auth/pin';
import { adminDb } from '@/lib/db/server';
export type FormState = { message: string };
export async function createLearner(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const ctx = await parentOnly();
  const parsed = z
    .object({
      first_name: z.string().trim().min(1).max(40),
      tutor_name: z.string().trim().min(1).max(40),
      grade: z.coerce.number().int().min(1).max(13),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: 'Skriv inn navn og et gyldig trinn.' };
  const household = await ctx.client.rpc('ensure_household', {});
  if (household.error) return { message: 'Kunne ikke opprette husholdningen.' };
  const { error } = await ctx.client
    .from('learners')
    .insert({ ...parsed.data, household_id: household.data });
  if (error) return { message: 'Kunne ikke lagre profilen. Prøv igjen.' };
  revalidatePath('/forelder');
  return { message: 'Profilen er lagret.' };
}
export async function setPin(_: FormState, form: FormData): Promise<FormState> {
  const { user } = await parentOnly();
  const pin = pinSchema.safeParse(form.get('pin'));
  if (!pin.success) return { message: 'PIN må ha fire sifre.' };
  const { error } = await adminDb()
    .from('parent_secrets')
    .upsert({
      parent_id: user.id,
      pin_hash: hashPin(pin.data),
      failed_attempts: 0,
      locked_until: null,
    });
  return {
    message: error
      ? 'Kunne ikke lagre PIN. Kontroller serveroppsettet.'
      : 'PIN er lagret. Du kan starte Leo-modus.',
  };
}
export async function lockLeo(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { client, user } = await parentOnly();
  const learnerId = z.uuid().safeParse(form.get('learner_id'));
  if (!learnerId.success) return { message: 'Velg en profil.' };
  const { data: learner } = await client
    .from('learners')
    .select('*')
    .eq('id', learnerId.data)
    .single();
  if (!learner) return { message: 'Fant ikke profilen.' };
  const admin = adminDb();
  const { data: secret } = await admin
    .from('parent_secrets')
    .select('parent_id')
    .eq('parent_id', user.id)
    .maybeSingle();
  if (!secret) return { message: 'Lagre PIN først.' };
  const jar = await cookies();
  const old = z.uuid().safeParse(jar.get('leo-device')?.value);
  const id = old.success ? old.data : randomUUID();
  // Verify existing device ownership before reusing a cookie ID.
  if (old.success) {
    const existing = await admin
      .from('devices')
      .select('parent_id')
      .eq('id', id)
      .maybeSingle();
    if (
      existing.error ||
      (existing.data && existing.data.parent_id !== user.id)
    )
      return { message: 'Enheten må kobles til på nytt.' };
  }
  const { error } = await admin
    .from('devices')
    .upsert({
      id,
      parent_id: user.id,
      household_id: learner.household_id,
      learner_id: learner.id,
      leo_mode_locked: true,
    });
  if (error) return { message: 'Kunne ikke starte Leo-modus.' };
  jar.set('leo-device', id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect('/leo');
}
export async function unlockLeo(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { user, device } = await currentDevice();
  if (!device?.leo_mode_locked) redirect('/forelder');
  const pin = pinSchema.safeParse(form.get('pin'));
  if (!pin.success) return { message: 'Skriv inn fire sifre.' };
  const admin = adminDb();
  const { data: secret, error } = await admin
    .from('parent_secrets')
    .select('*')
    .eq('parent_id', user.id)
    .single();
  if (error || !secret) return { message: 'Kunne ikke kontrollere PIN.' };
  if (secret.locked_until && Date.parse(secret.locked_until) > Date.now())
    return {
      message: 'For mange forsøk. Vent 15 minutter før du prøver igjen.',
    };
  const success = verifyPin(pin.data, secret.pin_hash);
  const result = await admin.rpc('record_pin_attempt', {
    target_parent: user.id,
    success,
  });
  if (result.error || !result.data || !success)
    return { message: 'Feil PIN eller midlertidig sperre. Prøv igjen senere.' };
  const update = await admin
    .from('devices')
    .update({ leo_mode_locked: false })
    .eq('id', device.id)
    .eq('parent_id', user.id);
  if (update.error) return { message: 'Kunne ikke låse opp.' };
  redirect('/forelder');
}
export async function signOut() {
  const { client } = await parentOnly();
  await client.auth.signOut();
  redirect('/login');
}
