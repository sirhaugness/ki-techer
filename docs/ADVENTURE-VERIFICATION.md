# Matteeventyr med læreren ved pulten

Dato: 2026-10-12. Produksjon er ikke endret.

## Leveransen

1. **Innlogging:** Supabase SSR har allerede vedvarende, HTTP-only cookies, PKCE og `getUser()` på serveren. SDK 0.12.7 bruker opptil 400 dagers cookielevetid og roterende refresh-tokener. Ingen egen inaktivitetsgrense er lagt til. Proxyen viderefører nå SDK-ens cachevern ved tokenfornyelse. Foreldre-PIN og utlogging beholdes.
2. **Arbeidsflate:** Oppgaven, svaret og lærerens siste beskjed er samlet. Svarfelter og tastatur beholdes etter vurdering. Reservert tilbakemeldingsplass og lærerpanel reduserer sidehopp. På brede skjermer står læreren ved siden av svarene; på smale skjermer kan hjelp åpnes i tastaturets plass uten å dekke svar eller hovedknapp. Tale av skjuler mikrofonene.
3. **Tilgjengelig lærer:** «Spør læreren» støtter fritekst, foreldrevalgt tale og fire snarveier. Konteksten inneholder oppgave, siste svar og tidligere hjelp. Spørsmål lagres som egne meldinger og skaper ikke svar- eller forståelsesevidens. KI-hjelp kan bruke tall som allerede er vist og kontrollert i oppgaven; nye tall, tidlig fasit og ferdige regneuttrykk avvises. Tegnehjelp viser kontrollerte grupper uten å kunne sende et oppgavesvar. Regelstyrt hjelp blir mer konkret ved gjentatte forespørsler. Mesterutfordringer tillater hjelp; hjulpne svar trekkes ut av selvstendig poengsum.
4. **Feiring:** Uavhengig sjekket riktig svar gir tydelig bekreftelse, interesseikon og varm, variert respons. «Fortsett eventyret» er tilgjengelig umiddelbart. Dekorasjonen spiller én gang per oppgave og respekterer redusert bevegelse. Eksisterende større mestringsfeiringer beholdes uten å flytte oppgaveflaten.
5. **Flyt:** Oppgaven byttes bare ved neste-handlingen. Hjelp beholder svar og fremgang. Nettverksfeil beholder samme request-ID for trygt gjentatt forsøk. Neste oppgave bringes til en forutsigbar plass når det er nødvendig. Lange tekster brytes uten klipping.
6. **Engasjement:** AGENTS.md, begge SPEC-filene, lærerprompten og beslutningene angir moro, engasjement og faktisk læring som hovedmål. Fasit, hjelperegistrering, pauser og muligheten til å avslutte kontrolleres fortsatt i kode.
7. **Ett eventyr:** Star Wars er et klikkbart valg. Valgt interesse beholdes til eleven selv bytter. Databaseindeks og atomisk RPC hindrer flere aktive interesser. Fortellingen bruker figurer, sted, mål og oppdragsfaser. Progresjon lagres per interesse i samme transaksjon som svaret, føres videre mellom økter og gir nytt kapittel etter fire fullførte oppdrag. Hjemmets Start/Fortsett tar eleven til sist brukt område. Interessen følger Basecamp og resten av kartet. Multiplikasjonsoppdrag har både tall og uttrykk som kontrolleres uavhengig av KI.

## Verifisering

- Vitest dekker fasit, uttrykk med multiplikasjon og gjentatt addisjon, avvisning av usikre/irrelevante uttrykk, oppdragsprogresjon, idempotens, samtale uten oppgavebytte og riktig hjelperegistrering i mesterutfordringer.
- PGlite kjører hele migrasjonshistorikken, kontrollerer RLS, serverfunksjoner, direkte forsøk på to aktive interesser og avvisning av fremmed interesse-ID.
- Playwright gjennomfører valg av Star Wars, feil svar, hjelp, beholdt svar, riktig svar, neste oppgave og gjenlasting i Chromium ved 390×844, 768×1024 og 1440×1000. Tester måler at hovedhandlingen beholder plasseringen ved hjelp og vurdering. Interessebytte og redusert bevegelse testes separat.
- Eksisterende flyter for kartlegging, øving, mesterutfordring, foreldredashbord og tale kjøres med mocks.
- Ekte lokal Auth-test er gjennomført i GitHub CI og lukker og gjenåpner en faktisk Chromium-profil, kontrollerer Leo-lås/PIN, fremprovoserer automatisk fornyelse ved utløpt lagret økttid og kontrollerer eksplisitt utlogging. Dette endrer ingen hosted token- eller øktinnstillinger. Testen venter ikke på naturlig JWT-utløp.

Resultat: 407 Vitest-tester og 15 Playwright-flyter med mocks bestått. Lint, typecheck, formatering, simulering og bygg er grønne. Lighthouse gir 100/100 på alle seks kontrollerte sider. Ekte lokal Supabase Auth og full foreldre-/læringsflyt passerer i GitHub CI. Dev-migrasjonen er brukt og kontrollert med SQL. Preview er READY; innloggingssiden og uautorisert omdirigering er testet. Innlogget hosted Preview er ikke bekreftet. Se PROGRESS.md og PR #8 for commit og CI-resultater.

## Miljø og begrensninger

- Leo dev (`tabddnhkrugkejjxbctv`) og Leo Prod er identifisert som separate miljøer. En lesekontroll av dev viser tre Auth-økter uten `not_after`. Dette beviser ikke globale Auth-innstillinger for timebox/inaktivitet; connectoren eksponerer ikke denne konfigurasjonen. Ny interesseindeks og RPC er kontrollert i dev: null elever med flere aktive interesser; kun serverrollen kan kjøre valgfunksjonen. Ingen produksjonsinnstillinger er endret.
- Nettleserdata er knyttet til samme nettleserprofil og domene. Privat modus, slettede data, nettleserens cookiebegrensninger, eksplisitt utlogging og tilbakekalt tilgang kan kreve ny lenke. En annen Preview-adresse har egne cookies.
- Automatiske skjermstørrelser verifiserer Chromium. Fysisk Safari/iPad og operativsystemets skjermtastatur krever enhetsprøve; se IPAD-TESTPLAN.md. Ny taleinngang gjenbruker den eksisterende transkripsjons- og foreldrekontrollen.
- Ingen ekte OpenAI-kall inngår i kvalitetstestene. Semantisk kvalitet med ekte modell må vurderes i et godkjent testmiljø. Ved bortfall av KI/moderering skjermes fritekst, mens faste hjelpesnarveier og kontrollerte oppgaver fungerer.
- Ferdige interesser har egne maler. Nye fritekstinteresser bruker en trygg ramme om den valgte interessen og et generelt oppdrag. Vilkårlig KI-generert matematisk historietekst godtas ikke uten uavhengig semantisk kontroll.
- Uttrykksdeloppgaver er innført for multiplikasjon. Andre oppgavetyper beholder etablerte svarformer. AST-vernet godtar uttrykk som viser oppgavens like grupper, ikke et vilkårlig annet regnestykke med samme verdi.
- En oppgave som allerede er påbegynt, beholder sitt eventyr ved interessebytte. Neste oppgave følger det nye valget. Begge eventyrs progresjon og all matematisk fremgang beholdes.
