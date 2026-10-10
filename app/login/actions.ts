'use server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { db, configured } from '@/lib/db/server';
import { authOrigin } from '@/lib/auth/origin';
import { loginErrorMessage } from '@/lib/auth/login-error';
export type LoginState = { message: string };
export async function sendLink(
  _: LoginState,
  form: FormData,
): Promise<LoginState> {
  const email = z.email().safeParse(form.get('email'));
  if (!email.success) return { message: 'Skriv inn en gyldig e-postadresse.' };
  if (!configured())
    return {
      message: 'Innlogging er ikke satt opp ennå. Se oppsettveiledningen.',
    };
  const origin = authOrigin(await headers());
  if (!origin)
    return { message: 'Nettadressen for innlogging mangler i oppsettet.' };
  const { error } = await (
    await db()
  ).auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: new URL('/auth/callback', origin).href },
  });
  return {
    message: error
      ? loginErrorMessage(error)
      : 'Sjekk e-posten din. Trykk på lenken for å logge inn.',
  };
}
