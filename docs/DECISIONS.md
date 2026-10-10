# Beslutninger

## Grunnlag (10. oktober 2026)
`docs/SPEC.md` var tom og `docs/PROGRESS.md` manglet. Den fullstendige rotfilen `SPEC.md` er kopiert til `docs/SPEC.md`, som er arbeidsgrunnlaget. M0 var ikke implementert: nødvendige M0-verktøy bygges sammen med M1, med egen testbar grunnmur. Ingen ekte KI-kall trengs før M4.

## M1
- Magisk lenke med Supabase Auth og PKCE/SSR. Forelder oppretter husholdning atomisk via RPC. Leo trenger ingen egen konto.
- PIN hashes med scrypt og tilfeldig salt, i separat `parent_secrets`-tabell uten klienttilgang. Fire sifre etter spesifikasjonen. Fem feil gir 15 minutters sperre. PIN-innstillinger, låsing og opplåsing kjøres bare på serveren.
- En tilfeldig, HttpOnly enhets-ID knytter Leo-modus til nettleseren. Låsen lagres i databasen, overlever refresh, og kontrolleres også ved server actions. Ny nettleser starter som forelder. PIN er UI-lås, ikke en erstatning for Auth/RLS.
- Alle tabeller har RLS. Husholdningsgrenser gjelder også på fremmednøkler. Referansedata er lesbare for innloggede, kun serveren kan endre dem. `ai_calls` får husholdnings-ID; PIN- og driftsdata er ikke klientlesbare.
- RLS testes på ekte PostgreSQL-semantikk via PGlite (Postgres i WASM), med lokal testimplementasjon av `auth.uid()` og rollene fra Supabase. GitHub CI kjører også mot lokal Supabase gjennom CLI.
