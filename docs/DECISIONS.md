# Beslutninger

## M0

- `docs/SPEC.md` var tom (ett linjeskift). Rotfilen `SPEC.md` inneholdt hele
  spesifikasjonen og er kopiert uendret til `docs/SPEC.md`, som er kanonisk fremover.
- M0 lager bare grunnmuren og en ærlig startside. Ingen API-kall, innlogging,
  databasemigrasjoner eller læringsmotor før de respektive milepælene.
- Tailwind 4 og shadcn/ui med CSS-variabler, aliaser og en Button-komponent.
  Systemskrift brukes slik at bygg og visning ikke trenger Google Fonts.
- Modellverdiene i `.env.example` er forslag, ikke bekreftet tilgang eller priser.
  GPT-5.2 foreslås til tutor/refleksjon; GPT-5 mini til korte oppgaver. Tale har
  egne modeller. Valgene må vurderes med scenarioevaluering i M4/M6 og kan endres
  kun i miljøvariabler. Ingen modellnavn er hardkodet i appen.
- Vitest bruker MSW og avviser alle umockede HTTP-kall. Playwright tillater bare
  den lokale appen og blokkerer eksterne forespørsler. Ingen test krever nøkler.
- `simulate` og `eval:agent` dokumenteres, men implementeres først i M3/M4.
  Ekte modellevaluering skal være et eksplisitt, separat valg og aldri del av CI.
- Læreplantekster og kontroll mot Udir hører til M2. M0 oppretter kildemappen.
- Installerte stabile versjoner er låst i `package.json` og `package-lock.json`,
  blant annet Next.js 16.4.0 og React 19.3.0. CI bruker Node.js 24 fordi de nyeste
  testverktøyene krever minst Node.js 22.22.2 eller 24.15.0.
- Playwright kan bruke en ferdig installert Chromium via testverktøyets
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Dette er ikke en appvariabel i `.env.example`.
  I skymiljøet var Playwrights nedlastingsdomene blokkert; lokal Chromium ble brukt.

---

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

## Integrasjon med M0 som ble merget under arbeidet

Da arbeidsmiljøet startet, var main fremdeles på `7b5af4b` uten M0. Mens M3 ble implementert, var M0-mergen `4c4126c` tilgjengelig. Den er merget inn i arbeidsgrenen. M0s historikk, regler, MSW/React Testing Library og miljøkontrakt beholdes; forside-testene følger nå M1s innlogging. Pakkeversjonene låses, med eksisterende M0-versjoner på felles avhengigheter.

M0s Supabase-navn (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) beholdes også i M1-koden og oppsettveiledningen. `APP_URL` er én nødvendig ekstra variabel for kontrollert callback-adresse. Lokale Supabase JWT-testnøkler kan brukes som verdier i de samme variablene. Ingen ekte OpenAI-kall er lagt til. Full CI-e2e bruker lokal Supabase, mens den eksplisitt bestilte migrasjonsworkflowen er den eneste jobben med ekte Supabase-hemmeligheter.

## M3

- Motoren er ren og får klokke, hendelses-ID og RNG som argumenter. Oslo-kalenderdager brukes for mestring og mesterutfordringer, også rundt sommertid. Idempotente forsøk og hint-hendelser hindrer dobbel bokføring.
- K er 0,6 for de første fem forsøkene, deretter en eksponentielt avtagende verdi mot 0,2. Mestring trenger sannsynlighet, siste fem forsøk, minst to hintfrie dager og vurdering/forståelse. En bekreftet ferdighet beholdes, mens feil fortsatt senker theta og styrer repetisjon og misoppfatningsarbeid.
- FSRS har fuzz av for reproduserbarhet. Kort serialiseres som JSON med ISO-tider. Også ferdigheter i tildelte deler får repetisjon.
- Kandidater respekterer både deltilgang og DAG. ZPD velges blant fem diskrete nivåer; dersom ingen nivåer gir 70–85 %, brukes nivået nærmest 77,5 %, uten å påstå at intervallet alltid kan nås. 3–6 kandidater gis når nok trygge oppgaver finnes; ellers færre eller ingen.
- Blandet øving håndheves fra første hovedferdighet i økta, med en rullerende blokk på ti oppgaver. Før en blokk er full er minstekravet `floor(0,3 × antall)`; ved ti er minst tre fra andre ferdigheter. Oppvarming teller ikke i denne kvoten.
- Etter to feil kreves lettere nivå eller ny representasjon. Etter tre feil kreves nivå 1 med forventet treff minst 85 %, deretter tilbud om pause/gåte. Konkret → bilde → tall gjelder ved introduksjon. Hvis ingen oppgave møter harde regler, får agenten ingen kandidat og må håndtere pause/fallback i M4.
- Første feil gir åpent spørsmål på hintnivå 0. Neste feil eller eksplisitt hintønske kan heve nivået. Nivå 4 er øvre grense. Fasit-lekkasjekontroll av KI-tekst kommer i M4, siden det ikke finnes KI-dialog i M3.
- En mesterutfordring har 8–10 unike oppgaver, dekker alle ferdigheter i delen, bruker nivå 3, krever null hint og minst 80 % riktig. Tidligst neste Oslo-dag etter siste mestring; nytt forsøk tidligst neste dag. Feil gir målrettede ferdigheter. Tildeling tas aldri tilbake.
- Egne modelloppgaver begrenses til skalar heltallsaritmetikk med en AST-tillatelsesliste. Funksjoner, opphøying, variabler, tilordning, matriser og objektoppslag avvises før evaluering. Gangetabeller har egne tallgrenser. Rest-, geometri- og algoritmeoppgaver bruker foreløpig generatorene. Matematisk kontroll erstatter ikke moderering eller semantisk tekstkontroll i M4.
- Simuleringen har tre separate forsøk, alle med 200 økter: kalibrering av stasjonære skjulte ferdigheter (tre elevprofiler), preferanselæring med syntetiske signaler, og en lærende elev med eksplisitt vekstkurve. Svar trekkes fra skjult sannsynlighet og kontrolleres med generatorfasit; de tvinges ikke til å bli riktige. Progresjonseleven bruker kandidat-/oppgaveregler og mesterutfordringer. Statistikken er en reproducerbar regresjonstest, ikke dokumentasjon på effekt for virkelige barn.
- M3-migrasjonen legger til felt for datoer, hendelses-ID-er, forståelse og mesterutfordringsstatus. M4 skal koble disse til serverens persisteringslag; motoren er ennå ikke koblet til matteøkter i UI.

## Rettelser fra full CI

- Auth-callback bruker den validerte `APP_URL` både ved suksess og feil. Next.js 16 normaliserte `request.url` til localhost i lokal kjøring selv om nettleseren brukte 127.0.0.1. Det skiftet cookie-domene og mistet sesjonen. En reell nettlesertest og en enhetstest med ulik intern/ekstern vert kontrollerer regresjonen. Manglende/ugyldig APP_URL gir 503; kun HTTP/HTTPS godtas.
- Hele 200-økters simuleringen har 120 sekunders testgrense. En delt GitHub-runner brukte 31,6 sekunder og overskred den opprinnelige grensen på 30 sekunder; resultatkravene er uendret. Full Auth-e2e starter bare de lokale tjenestene den bruker: PostgreSQL, Auth, REST, Kong og Mailpit.

## Automatisk innloggingsadresse på Preview og produksjon

`APP_URL` er nå valgfri etter at Preview stoppet uten denne variabelen. Felles server-only `authOrigin` brukes både for e-postlenken og callback-redirect: gyldig eksplisitt APP_URL → forespørselens eksterne Host → innebygd VERCEL_URL → request.url hvis ingen andre kilder finnes. Vercels forwarded host godtas bare på Vercel; andre miljøer bruker Host. Eksterne adresser bruker HTTPS, og localhost/127.0.0.1/IPv6-loopback støtter lokal HTTP. Vert med URL, sti, brukerinfo eller komma avvises. En feil eksplisitt overstyring avvises i stedet for å skjules. Supabase Redirect URLs må fortsatt tillate callback på adressen brukeren åpner. Full Auth-e2e og smoke-test kjører med tom APP_URL for å kontrollere den automatiske flyten.

## Feil ved sending av innloggings-e-post

Supabase Auth-feilkoder gir konkrete norske meldinger ved SMTP-begrensning, sendegrense, deaktivert e-post/OTP, avslått registrering, ugyldig adresse, CAPTCHA og feil API-nøkkel. Ukjente feil henviser til Auth-loggen. Bare kode i formatet `[a-z_]{1,64}` og HTTP-status logges; rå provider-melding, e-post, nøkler og lenker eksponeres ikke. Skjermbildet med den tidligere generiske meldingen bekrefter ikke én bestemt årsak. Ekte e-postlevering kan ikke fastslås fra CI med lokal Mailpit; hosted Supabase må også ha fungerende e-postoppsett.
