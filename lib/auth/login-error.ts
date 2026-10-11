import 'server-only';
import type { AuthError } from '@supabase/supabase-js';

export function loginErrorMessage(
  error: Pick<AuthError, 'code' | 'status'>,
): string {
  // Never log the raw message, email address, URL, session or credentials.
  const code =
    error.code && /^[a-z_]{1,64}$/.test(error.code) ? error.code : 'unknown';
  console.error('Innloggingslenke kunne ikke sendes', {
    code,
    status: error.status,
  });
  switch (code) {
    case 'email_address_not_authorized':
      return 'E-posttjenesten kan foreløpig bare sende til Supabase-prosjektets medlemmer. Bruk e-postadressen til Supabase-kontoen din, eller sett opp egen e-posttjeneste (SMTP) i Supabase.';
    case 'over_email_send_rate_limit':
      return 'Grensen for innloggings-e-poster er nådd. Vent før du ber om en ny lenke.';
    case 'email_provider_disabled':
    case 'otp_disabled':
      return 'Innlogging med e-post er slått av i Supabase. Aktiver e-postinnlogging i prosjektets innstillinger.';
    case 'signup_disabled':
      return 'Nye kontoer er slått av i Supabase. Prosjekteieren må tillate nye foreldre å registrere seg.';
    case 'email_address_invalid':
      return 'Supabase godtar ikke denne e-postadressen. Bruk en ekte e-postadresse som kan motta meldinger.';
    case 'captcha_failed':
      return 'Supabase krever en sikkerhetskontroll som ikke er satt opp på innloggingssiden. Prosjekteieren må kontrollere CAPTCHA-oppsettet.';
    case 'over_request_rate_limit':
      return 'For mange innloggingsforsøk. Vent litt før du prøver igjen.';
  }
  if (error.status === 429)
    return 'For mange innloggingsforsøk. Vent litt før du prøver igjen.';
  if (error.status === 401 || code === 'bad_jwt')
    return 'Innlogging er feil konfigurert. Kontroller at Supabase-adressen og publishable key i Vercel tilhører samme prosjekt.';
  return 'E-posttjenesten klarte ikke sende lenken. Prosjekteieren kan finne årsaken i Supabase sine Auth-logger.';
}
