# Beslutninger

## Grunnlag (10. oktober 2026)
`docs/SPEC.md` var tom og `docs/PROGRESS.md` manglet. Den fullstendige rotfilen `SPEC.md` er kopiert til `docs/SPEC.md`, som er arbeidsgrunnlaget. M0 var ikke implementert: nødvendige M0-verktøy bygges sammen med M1, med egen testbar grunnmur. Ingen ekte KI-kall trengs før M4.

## M1
- Magisk lenke med Supabase Auth og PKCE/SSR. Forelder oppretter husholdning atomisk via RPC. Leo trenger ingen egen konto.
- PIN hashes med scrypt og tilfeldig salt, i separat `parent_secrets`-tabell uten klienttilgang. Fire sifre etter spesifikasjonen. Fem feil gir 15 minutters sperre. PIN-innstillinger, låsing og opplåsing kjøres bare på serveren.
- En tilfeldig, HttpOnly enhets-ID knytter Leo-modus til nettleseren. Låsen lagres i databasen, overlever refresh, og kontrolleres også ved server actions. Ny nettleser starter som forelder. PIN er UI-lås, ikke en erstatning for Auth/RLS.
- Alle tabeller har RLS. Husholdningsgrenser gjelder også på fremmednøkler. Referansedata er lesbare for innloggede, kun serveren kan endre dem. `ai_calls` får husholdnings-ID; PIN- og driftsdata er ikke klientlesbare.
- RLS testes på ekte PostgreSQL-semantikk via PGlite (Postgres i WASM), med lokal testimplementasjon av `auth.uid()` og rollene fra Supabase. GitHub CI kjører også mot lokal Supabase gjennom CLI.

## M2
- 35 ferdigheter: 7 i Basecamp og 7 i hver medaljongdel. Intern DAG; del 4 har ingen avhengighet til andre deler. Deltilgang (Basecamp → 1 → 2, 1 → 3, 4 alltid tilgjengelig) håndheves i M3 i tillegg til enkeltferdighetenes forkunnskaper.
- MAT01-06 kontrollert mot Udirs aktuelle sider. Volum og mønstre legges i del 4. Areal hører til 3. trinn. Modellering omfatter overslag og kritisk vurdering; dette dekkes med egne ferdigheter. Lokale mål-ID-er merkes som lokale. Kilder og komplett måltekst for 3.–5. trinn i `docs/curriculum/mat01-06.md`.
- Alle generatorer er rene, seedbare og har fem nivåer. Svar støtter tall, flervalg, rest, sekvens og koordinat. Forklaringsferdigheten har et kontrollerbart strategivalg; fritekstforståelse skal vurderes separat i M4 og kan ikke godkjennes som forståelse=2 fra flervalget alene.
- Generatorene varierer tall, representasjoner eller algoritmelengde etter nivå. Dette er en startkalibrering, ikke empirisk validerte vanskelighetsparametere. Generering avviser gjentatte parametere; hvis RNG ikke gir variasjon, feiler den eksplisitt etter 32 forsøk.
- Læreplan og graf lagres i en SQL-migrasjon, ikke bare `seed.sql`, slik at `supabase db push` installerer referansedata også i prod. En drift-test kontrollerer at SQL-snapshot og TypeScript stemmer overens.
