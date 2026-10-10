'use server';
import { z } from 'zod';
import { db, configured } from '@/lib/db/server';
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
  const origin = z.url().safeParse(process.env.APP_URL);
  if (!origin.success)
    return { message: 'Nettadressen for innlogging mangler i oppsettet.' };
  const { error } = await (
    await db()
  ).auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: new URL('/auth/callback', origin.data).href },
  });
  return {
    message: error
      ? 'Kunne ikke sende lenken. Vent litt og prøv igjen.'
      : 'Sjekk e-posten din. Trykk på lenken for å logge inn.',
  };
}
