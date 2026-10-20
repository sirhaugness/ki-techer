# Fremdrift

## Start her: spillrevisjon stoppet (oppdatert 20. oktober 2026)

Les deretter [GAME-REVISION](GAME-REVISION.md) og [SPEC §15](SPEC.md#15-avtalt-spillrevisjon-16-oktober-2026). Eldre milepæler nedenfor er historikk. Skill implementert kode, teknisk kontroll og faktisk modell-/spillkvalitet.

### Gjeldende kode og PR-er

- R1/PR #16 er merget til main `5ad9807`. R2/PR #17 ble merget til gammel featurebranch, **ikke main**; den skal ikke videreføres.
- R2 er [utkast-PR #18](https://github.com/sirhaugness/ki-techer/pull/18), `feat/chapter-player` → `main`, head `588578e`. Levende status kontrollert 19. oktober: åpen, full CI og migrasjoner grønne på head. Ingen merge utført av agenten.
- R2s innloggede Preview-port er **bestått** på `55cdbdd`: ekte Auth/RLS/Leo-lås, tre oppdrag, feil/hjelp/riktig, observert bevegelse, pause/gjenopptak, reload og avslutning; 17 serverhandlinger med HTTP 200, ingen browserfeil. [Bevis](R2-VERIFICATION.md), [opptak/bilder](evidence/r2/README.md). Historie/hjelp er kodebestemt, ingen KI-kall.
- Aktiv videreføring er `feat/chapter-preparation`, opprettet fra siste R2 `588578e`. [R3 utkast-PR #20](https://github.com/sirhaugness/ki-techer/pull/20) har `feat/chapter-player` som base så lenge #18 er åpen. Kontroller live status før base endres.

### R3: implementert, kvalitetsport åpen – arbeidet er stoppet

Interessevalg og ny spiller på `/leo/kapittel`; Workflow 5 i `arn1`; research, helt utkast, separat kontroll, ressursmanifest, service-only lagring, lease/idempotens, varig kall-/budsjettjournal, sikker projeksjon og lagret fortsettelse. Generator v1 er frosset før persistens. Forberedelse tar ingen økttid; gammel og ny spiller deler tidsgrenser. Full faglig tilpasning og flerturshjelp er fortsatt R4/R5.

[Detaljert R3-verifisering](R3-VERIFICATION.md) skiller mocks, direkte kodebestemt hjelp og ekte modellrespons. Full CI på `e256394` er grønn: 548 Vitest-tester, simulering, 25 browserprøver og fem Auth-prøver mot lokal Supabase, bygg og tilgjengelighet. Dev-migrasjon er grønn. Kontrollert browser-kjede bestått. Faktisk gratis Preview-worker på samme commit fullførte i `arn1` etter lukket nettleser, med deduplisering, begge simulerte avbrudd og separate kritikk-/rettingssteg.

Sytten ekte «Rever»-forsøk er bevart. Siste prøve på `e9c8845` bestod struktur/matte og separat modellkritikk og nådde ready. Ingen gjennomspilling er utført. Codex-tutor fant fortsatt P2 i råpakken: en ny innsamling uten dokumentert behov/overskudd og Anna vist i scenen mens teksten sier hun er borte. Modellgodkjenningen er derfor ingen kvalitetsgodkjenning. Tutorens siste fulle vurdering ble avbrutt av agentkvote; foreløpige konkrete funn beholdes. Full CI og dev-migrasjon er grønne på `e9c8845`.

**Thor har stoppet arbeidet. Ingen nye genereringer, ekte KI-tester, rettinger eller merge skal startes som del av denne leveransen.** Bare lagring/push og statusrapport fullføres. Det er ingen queued/running-jobber ved avlesningen20. oktober. R3 og begge PR-er forblir utkast.

### Tilgang, opprydding og rammer

Thor har uttrykkelig godkjent midlertidige syntetiske testdata med sletting og etterkontroll, og fortsatt bruk av eksisterende Preview-nøkkel. **Ikke spør om dette på nytt.** Ingen ny nøkkel eller produksjonsendring er autorisert. Ingen merge til main uten særskilt tillatelse.

R2-kontoen er globalt logget ut og hele det syntetiske datasettet er slettet: husholdning/elev/enhet tidligere, gjenværende Auth-bruker 17. oktober. Etterkontroll viste null bruker, sessions og parent-rader. Connectorens tidligere `Invalid or expired requestState` er dermed løst. Egen Vercel-deling er tilbakekalt og private filer slettet.

Samlet konservativ KI-testbelastning er **8,24392525 kr av 10**, inkludert historisk 2,99981825 kr, nye bekreftede modellkall 4,25732725 kr og beholdte usikre draft-reservasjoner 0,98677975 kr. Gjenstående **1,75607475 kr**. Ikke nullstill regnskap, bytt konto eller øk grenser for å omgå rammen. R3s midlertidige konto er fortsatt i leo-dev; opprydding ble ikke utført etter stoppordren. Kostnadsjournal og kontrollnotater er bevart i evidence/r3/cost-ledger.json. Ingen nye databaseendringer ble gjort ved avslutningen.

### Stoppunkt og eventuell senere videreføring

R2s innloggede spillprøve er bestått. R3s tekniske forberedelse virker, men kritikerens pålitelighet og en kvalitetsgodkjent, faktisk gjennomspilt generert historie er ikke ferdig. Senere R4–R7 er heller ikke levert. En eventuell videreføring må først ta stilling til denne åpne kvalitetsporten og utestående syntetisk opprydding; stoppordren gjelder nå.

**Hva Thor må gjøre:** Ingen handling kreves for å bevare arbeidet. Endringene lagres på `feat/chapter-preparation`, uten merge. Les kort sluttrapport; eventuell videreutvikling krever ny bestilling.

---

Grunnlaget er `docs/SPEC.md` (kopiert fra rotfilen fordi docs-filen var tom). Dato: 10. oktober 2026.

| Milepæl                            | Status                                                        |
| ---------------------------------- | ------------------------------------------------------------- |
| M0 nødvendig prosjektoppsett       | Implementert og lokalt verifisert                             |
| M1 database, auth, elevprofil, PIN | Implementert; RLS/PIN lokalt og full Auth-e2e i CI grønn      |
| M2 læreplan og generatorer         | Implementert og verifisert lokalt og i CI                     |
| M3 læringsmotor og simulering      | Implementert og verifisert lokalt og i CI                     |
| M4 agent                           | Implementert og mock-testet; ekte modell-eval gjenstår        |
| M5 Leo-UI                          | Implementert; økt og mesterprøve testet på nettbrettstørrelse |
| M6 tale                            | Implementert og mock-testet; fysisk iPad-test gjenstår        |
| M7 profil og historie              | Implementert og full lokal sjekk grønn før M8                 |
| M8 foreldredashbord                | Implementert og full lokal sjekk grønn før M9                 |
| M9 herding                         | Implementert; full lokal sjekk og Lighthouse grønne           |

## M1 — før oppstart av M2

Laget Next.js/TS strict/Tailwind/shadcn-grunnlag, Vitest, Playwright, CI, alle datatabeller med RLS og krysshusholdnings-FK, Supabase magisk lenke/SSR, atomisk husholdningsopprettelse, elevprofil, serverlagret Leo-lås, scrypt-PIN og 5-forsøks sperre. Migrasjonsworkflow: PR til main eller leo-dev → Supabase leo-dev; push/merge til main → leo-prod. Manglende dev-hemmelighet kan aldri føre til valg av prod-hemmelighet.

Kjørt: `npm run lint`, `npm run typecheck`, `npm test` (8 tester grønne, inkludert 7 PostgreSQL/RLS-tester), `npm run test:e2e` (1 grønn nettlesertest, 1 eksplisitt hoppet over), `npm run build` (grønn). Nettlesertesten brukte systemets Chromium fordi Playwrights nedlastingsdomene er blokkert.

Begrensning: lokal Supabase-stack kunne ikke startes fordi `public.ecr.aws` er blokkert av skymiljøets nettverkspolicy. Full magisk-lenke/profil/lås/opplås-e2e er skrevet og kjøres i separat GitHub CI-jobb mot lokal Supabase; den er ikke lokalt verifisert. Ingen dev/prod-database er migrert fra dette miljøet. Ingen KI-kall. Implementasjonen er klar til CI/Preview-verifisering; det står ikke at full M1-aksept allerede har passert.

## M2 — før oppstart av M3

35 ferdigheter med DAG (7 i Basecamp og 7 per medaljongdel), dekning av alle 10 kompetansemål på 4. trinn, kildekontroll mot Udir, SQL-snapshot med referansedata, 35 generatorer med 5 nivåer, fasitkontroll og misoppfatningskatalog. Geometri, volum, mønstre og algoritmer har egne oppgaveformer. Ingen fritekstforklaring godkjennes som forståelse=2 fra strategiflervalg.

Kjørt: lint, typecheck, `npm test` (186 tester grønne; 175 000 genererte oppgaver med uavhengig oracle), Playwright (1 grønn / 1 lokal-Supabase-test hoppet over av samme miljøbegrensning som M1), produksjonsbuild grønn. Alle SQL-migrasjoner er kjørt i RLS-testdatabasen. RLS fra M1 er fortsatt grønn.

## M3 — sluttverifisering før PR

Implementert logistisk mastery med doble krav og idempotente forsøk, FSRS-repetisjon med JSON-kort, kandidater/ZPD, del- og DAG-tilgang, 30 % blandet øving, frustrasjonsvern, hint-maskin, Thompson sampling med utforskning/glemsel, øktfaser med tids-/dagsgrenser, medaljong og mesterutfordringer, samt sikker AST-verifisering av egne regneoppgaver. En ny migrasjon lagrer motorens nødvendige evidens. Repetisjonsvernet avviser også gjentatt oppgavetekst selv om ubrukte generatorparametere endres.

Kjørt på integrert grunnlag fra main/M0: `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test` (231 grønne tester i 12 filer), `npm run simulate`, Playwright (2 grønne nettlesertester, 1 full Auth-test eksplisitt hoppet over lokalt), `npm run build` (grønn), `git diff --check` og actionlint på begge workflows (grønn). Etter nye generator-/sikkerhetskontroller er berørte tester og statiske sjekker kjørt på nytt. Alle tre SQL-migrasjoner kjøres i PostgreSQL/RLS-testen. Ingen ekte KI-kall eller ekte Supabase-nøkler er brukt i kvalitetstestene.

Simulering (200 økter per forsøk):

| Elev / forsøk       | Resultat                                                   |
| ------------------- | ---------------------------------------------------------- |
| Kalibrering seed 11 | 76,475 % treff; theta-RMSE 0,646 → 0,307                   |
| Kalibrering seed 22 | 80,675 % treff; theta-RMSE 0,835 → 0,327                   |
| Kalibrering seed 33 | 82,500 % treff; theta-RMSE 1,816 → 0,334                   |
| Preferanser seed 44 | Beste arm valgt i 92,75–94,50 % av de siste rundene        |
| Progresjon seed 55  | Alle 35 ferdigheter mestret og deler tildelt 1 → 2 → 3 → 4 |

M0-mergen `4c4126c` kom til main mens M3 pågikk og er integrert uten uavklarte konflikter. M0s fem tester, dokumentasjon og Supabase-miljønavn er bevart/tilpasset. M1/M2 ble hver testet, loggført og committet før neste milepæl. M3 committes etter denne sluttverifiseringen.

Se `docs/DEPLOY.md` for steg for steg-oppsett av de fem GitHub-hemmelighetene, Vercel-variablene og Preview-testen. Nettleser-UI i denne PR-en er M1: innlogging, profil og Leo-lås. M2/M3 er den testede motoren; KI-agent og interaktive matteøkter kommer i M4/M5.

Lokal begrensning: full Auth-e2e kan ikke kjøres i skymiljøet fordi Supabase-containerregisteret er blokkert. Den er nå grønn i den separate GitHub CI-jobben (se sluttverifisering nedenfor). Migrasjonsworkflowen trenger brukerens fem repository secrets. Vercel har bygget Preview; innlogging mot leo-dev trenger også miljøvariablene og URL-oppsettet i veiledningen.

---

## Rettelser og verifisering etter PR-opprettelse

GitHub Actions bekreftet kvalitetssjekkene, men full Auth-e2e fant at callback-redirect fra 127.0.0.1 til Nexts interne localhost mistet sesjonens cookie. Feilen er reprodusert lokalt uten ekte nøkler og rettet med validerte `APP_URL`-redirects. Ny regresjonstest: 232 Vitest-tester grønne, 3 lokale nettlesertester grønne / full lokal Auth-test fortsatt hoppet over av nettverkspolicyen. Lint, typecheck, formatering, produksjonsbuild og actionlint grønne.

**Sluttverifisering:** [GitHub Actions-kjøring 38085697999](https://github.com/sirhaugness/ki-techer/actions/runs/38085697999), kodecommit `03369ba`, er grønn i begge jobber: alle kvalitetssjekker, 232 tester, simulering, smoke-e2e og build; samt 4 nettlesertester mot lokal Supabase inkludert full magisk-lenke → profil → lagret PIN → varig Leo-lås → feil PIN → riktig PIN. Alle tre SQL-migrasjoner ble kjørt med Supabase CLI i den lokale CI-stacken. Ingen ekte Supabase-/OpenAI-nøkler brukes i kvalitetstestene.

PR: [#2](https://github.com/sirhaugness/ki-techer/pull/2). [Preview](https://ki-techer-git-feat-m1-m3-learning-foundation-team-thor1.vercel.app) har grønt Vercel-bygg; funksjonene mot brukerens dev-prosjekt må testes etter oppsettet i DEPLOY.

Simuleringen passerte resultatkravene, men én delt CI-runner overskred testgrensen på 30 sekunder. Bare denne testens grense er økt til 120 sekunder; neste GitHub-kjøring passerte. Vercel har bygget Preview. Migrasjonsworkflowen stopper før tilkobling fordi `SUPABASE_ACCESS_TOKEN` mangler; ingen ekstern dev/prod-database er endret av denne PR-ens workflow hittil.

---

## Oppfølging: automatisk innloggingsadresse

Rettet Preview-feilen «Nettadressen for innlogging mangler i oppsettet» når APP_URL er tom. Server action og callback deler nå samme server-only adresseresolver: valgfri APP_URL-overstyring, faktisk Host/vert fra Vercels proxy, innebygd VERCEL_URL som reserve, og request.url som siste reserve. Dermed bevares også cookies på grenadresser, produksjonsdomener og lokal 127.0.0.1 til tross for Nexts interne localhost-adresse. Adresser valideres før bruk; feil eksplisitt overstyring og ugyldige Host-verdier avvises.

Verifisert med `npm run check`: lint, typecheck, formatering, 247 tester (15 nye, inkludert e-postsending/callback på Preview og produksjon uten APP_URL, VERCEL_URL-reserve og ugyldige adresser), simulering, 3 lokale nettlesertester og produksjonsbuild grønne. Full lokal-Supabase-test hoppes fortsatt over i skymiljøet av den dokumenterte nettverkspolicyen; CI-flyten kjører nå med tom APP_URL. Miljømal, DEPLOY og beslutninger er oppdatert: ingen ny Vercel-variabel kreves for nettadressen, men Supabase må fortsatt tillate callback-adressen.

---

## Oppfølging: diagnostikk ved mislykket e-postsending

Brukeren ser fortsatt feil ved sending og bekrefter å teste med samme e-post som Supabase-kontoen. Den generiske meldingen fastslår ikke årsaken; ingen hosted Auth-logg er tilgjengelig fra verktøyene her. Ny håndtering bruker Supabase-feilkode og HTTP-status til konkrete norske neste steg for sendegrense, SMTP-begrensning, deaktivert e-post/OTP, registrering, ugyldig adresse, CAPTCHA og feil API-nøkkel. Rå servermeldinger, e-post, nøkler og innloggingslenker logges eller vises ikke.

`npm run check` er grønn: lint, typecheck, formatering, 257 tester (10 nye for feilkoder og skjerming av sensitive provider-meldinger), simulering, 3 lokale nettlesertester og produksjonsbuild. Full lokal Auth-e2e hoppes over her av samme nettverkspolicy som før og kjøres i CI. DEPLOY beskriver Supabases innebygde SMTP-begrensninger, egne SMTP-innstillinger og hvor Auth-feilkoden finnes, med offisielle kilder. Årsaken til ekte e-postsending er fortsatt uavklart; brukeren er bedt om kort feilkode fra leo-dev sin Auth-logg. Dette er diagnostikk, ikke en påstand om bekreftet levering fra hosted Supabase.

---

## Historisk M0-logg fra main

### M0 – gjennomført 6. oktober 2026

- Next.js 16.4.0 med App Router, React 19.3.0 og TypeScript strict.
- Tailwind CSS 4, shadcn/ui-konfigurasjon og tilgjengelig Button-komponent.
- Norsk startside som tydelig viser at øving og innlogging kommer senere.
- Vitest, React Testing Library, MSW-mocks og Playwright.
- ESLint, Prettier, låste pakkeversjoner og GitHub Actions for kvalitetssjekker.
- AGENTS, README, miljømal med nøyaktig elleve avtalte variabler og kommenterte
  modellforslag, læreplanmappe og dokumenterte beslutninger.
- Tom `docs/SPEC.md` fylt med uendret spesifikasjon fra rotfilen.

#### Verifisert lokalt

- `npm ci`: ren installasjon fra låsefilen bestått.

- `npm run lint`: grønn.
- `npm run typecheck`: grønn.
- `npm run test`: fem tester bestått i tre filer.
- `npm run format:check`: grønn.
- `npm run build`: grønn, statisk startside.
- `npm run test:e2e`: én Chromium-test bestått ved nettbrettstørrelse,
  med norsk språk, deaktivert startknapp og ingen eksterne nettleserforespørsler.
  Kjørt med `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` fordi nedlasting
  fra Playwrights domene er blokkert i skymiljøet.
- Testene bruker ingen ekte nøkler og ingen Supabase-/OpenAI-nettverkstilgang.
  MSW avviser HTTP-kall uten eksplisitte mocks.

GitHub Actions er konfigurert, men en ekstern CI-kjøring er ikke observert her.
Simulering, ekte agent-evaluering og læreplanverifisering kommer i M3, M4 og M2.
Neste milepæl er M1: database, RLS, foreldreinnlogging, elevprofil og PIN.

## M4 — agent, før oppstart av M5 (11. oktober 2026)

Implementert server-only OpenAI-provider med Responses/function calling og Structured Outputs, versjonert norsk systemprompt, kompakt kontekst uten fasit, alle elleve verktøy med Zod og motorgrenser, maks fem verktøykall, ett korrigeringsforsøk per verktøy, to respons-retries og deterministisk fallback. Moderering feiler lukket; personinfo sendes ikke videre. Kontekstualisering bevarer det kontrollerte generatorspørsmålet, forklaringsrubrikken kan ikke tildele forståelse i fallback, og provider/verktøy eksponerer kostnads- og innsynslogger for øktlagringen i M5. OpenAI-verktøynavn oversettes til ASCII på API-grensen, og Responses kjøres uten lagring hos OpenAI (`store:false`).

Verifisert før M5: `npm run check` grønn: lint, typecheck, formatering, **311 Vitest-tester i 15 filer**, simulering, **3 Playwright-tester bestått / 1 lokal-Supabase-test hoppet over**, produksjonsbuild. Agenttestene dekker verktøyregler, retry/fallback, modereringsfeil, tall/tallord/indirekte numerisk fasit-lekkasje, og 30 skriptede mock-scenarioer. Eksisterende 175 000 generatoroppgaver, RLS og simuleringer er fortsatt grønne.

**Ikke verifisert:** ekte `npm run eval:agent` (30 scenarioer, krav ≥95 % og null lekkasjer) stopper eksplisitt fordi OPENAI_API_KEY ikke finnes her. Brukeren valgte å beholde nøkkelen i Vercel og utvikle med mocks. Mock-resultatene dokumenterer kodegrenser, ikke ekte modellkvalitet. Ekte eval og fysisk iPad-test gjenstår før produksjonsaksept. Full hosted Supabase/OpenAI er ikke testet lokalt.

## M5 — Leo på nettbrett, før oppstart av M6 (11. oktober 2026)

Laget hjem med original SVG-medaljong, ferdighetssteiner, fire kartdeler og en original lærerfigur. Bli kjent går adaptivt gjennom ti kontrollerte oppgaver og initialiserer theta uten å finne på mestring eller riktige dager. Leo kan velge interesser fra bilder, legge til moderert tekst, skru interesser av/på og velge lærernavn/figur. Økten har humørinnsjekk, stort talltastatur, flervalg, rest-/koordinatsvar, hint, tekstforklaring, avslutning og lagret fremgang. Hjelpemidler omfatter dele-ut med dra/trykk, grupper, rutenett, tallinje, tierblokker, roterbare figurer og algoritmebrett med løkke/vilkår. Konkrete hjelpemidler åpnes fra start; geometrifigurer vises også i mesterutfordringen.

Alle fasiter og svar kontrolleres server-side. Mesterutfordringen dekker sju ferdigheter med ti oppgaver på nivå 3, nekter hint/forklaringshjelp og tildeler først etter siste svar. Feiring av ferdighet, del og hel medaljong respekterer redusert bevegelse. Offentlig øktrespons inneholder ikke fasit, uttrykk, generatorsvar eller motorens private tilstand.

Ny append-only migrasjon, opprettet med Supabase CLI: én åpen økt per elev og `commit_learning_turn` for kort, atomisk transaksjon med radlås og versjonskontroll. Økt, oppgaver, forsøk, ferdigheter, FSRS, medaljong, strategier og logger lagres samlet. Bare service_role kan kalle skrivefunksjonen; API-en kontrollerer den innloggede, låste enhetens elev før servernøkkelen brukes. Gjentatt requestId gir ingen dobbelt uttelling, og foreldrelåsen fra M1 er bevart.

Verifisert før M6: **`npm run check` grønn**: lint, typecheck, formatering, **317 tester i 16 filer**, alle simuleringer, **5 Playwright-tester bestått / full lokal Auth-test hoppet over**, produksjonsbuild og `git diff --check`. PostgreSQL-testen kjører alle fire migrasjoner, sjekker RPC-tilgang, gamle revisjoner, evidens og full rollback ved feil. Nettbrett-e2e gjennomfører kartlegging → interesser → økt/hint/hjelpemidler → reload → avslutning og en seedet mesterutfordring → tildeling.

Den separate CI-testen med ekte lokal Supabase er utvidet til kartlegging og lagret matteøkt etter innlogging/PIN. Resultatet for denne nye koden er ikke observert ennå. Mock-fixture finnes bare med eksplisitt testvariabel, uten konfigurert Supabase og utenfor produksjon. Ingen ekte elevdata eller API-nøkler brukes i kvalitetstestene. Fysisk iPad og hosted integrasjoner må testes på Preview.

## M6 — tale, sluttverifisering før felles PR (11. oktober 2026)

Laget miljøstyrt norsk TTS/STT, privat husholdningsavgrenset Supabase Storage-cache med tekst-/modell-/stemmehash, Les høyt/Stopp på hjem og alle øktfaser, auto-opplesing med lagret valg og norsk enhetsstemme som reserve. Serveren henter godkjent lærertekst selv; klienten kan ikke sende vilkårlig tekst til TTS. Taleopptak velger Safari MP4 eller WebM/Opus, stopper ved slipp/avbrudd og senest 30 sekunder, og rå opptak lagres ikke i appen. Transkripsjon vises redigerbar og sendes først ved eksplisitt bekreftelse. Mikrofon er også koblet til interesser, forklaringer og avslutning. Tastaturet fungerer fortsatt ved nektet mikrofon eller tjenestefeil.

**`npm run check` grønn:** lint, typecheck, formatering, **332 Vitest-tester i 18 filer**, alle simuleringer, **7 Playwright-tester bestått / 1 full lokal-Supabase/Auth-test hoppet over**, produksjonsbuild og `git diff --check`. Taletestene dekker cachetreff/feil og husholdningsskille, entydige talesvar, codecvalg, filgrenser, kort trykk under tillatelsesdialog, maks opptakstid, avbrudd og nektet tillatelse. Rutesikkerhetstester avviser vilkårlig opplesingstekst, feil elev/økt/revisjon, kryssopprinnelse og ikke-godkjent transkripsjon. Nettlesertestene bruker falsk mikrofon og en lydfixture som faktisk spilles av.

Ingen nye miljøvariabelnavn er innført. Eksisterende Vercel-nøkkel skal brukes etter brukerens valg; modell-/stemmevariablene må være tilgjengelige for Preview. Ny M5-migrasjon må være kjørt på leo-dev; privat `leo-tts`-bøtte opprettes ved første cache-skriving. Vercel-funksjoner er satt til EU-region Stockholm. [DEPLOY](DEPLOY.md), [personvern](PRIVACY.md) og [testplan for en hel iPad-økt](IPAD-TESTPLAN.md) er oppdatert.

**Gjenstår å observere:** GitHub CI med lokal Supabase, hosted migrasjon og Vercel Preview. Fysisk iPad Safari/Chrome, ekte uttale og M4s ekte 30-scenario-eval (≥95 %, ingen lekkasjer) er ikke verifisert her. Ingen ekte KI-/Supabase-nøkler eller KI-kall er brukt i kvalitetstestene. M4, M5 og M6 er testet og loggført hver for seg før neste steg og samles i én PR.

## M4–M6 — oppfølging av felles PR #3

[PR #3](https://github.com/sirhaugness/ki-techer/pull/3) samler alle tre milepælene. Vercel har bekreftet grønt Preview-bygg for kodecommit `6ebc600`; [Preview](https://ki-techer-git-feat-m4-m6-tutor-tablet-voice-team-thor1.vercel.app). [Supabase-workflow 38138388285](https://github.com/sirhaugness/ki-techer/actions/runs/38138388285) er grønn og loggen bekrefter at `20261011113234_learning_turns.sql` ble kjørt på leo-dev. Ingen prod-migrasjon er kjørt av denne PR-en.

Første CI-kvalitetsjobb besto lint, typer, formatering, 332 tester og simulering, men voice-e2e feilet da GitHub kjørte to arbeidere mot den samme, ene syntetiske elevprofilen. Nettlesertestene kjører nå eksplisitt én arbeider slik at testenes reset ikke overskriver en annen tests økt. Revisjonskonflikter i selve appen kontrolleres fortsatt av SQL-/motortestene. Hele den lokale nettleserpakken er kjørt på nytt: 7 grønne / 1 lokal Auth-test hoppet over. Avslutning har dessuten fått et faktisk humørvalg, og valgt elevfigur vises på hjem. Lint/typecheck er kjørt på nytt etter disse UI-rettelsene. Full lokal-Supabase-CI og siste Preview-bygg følges før sluttmelding.

Full lokal-Supabase-CI gjennomførte innlogging, kartlegging, økt, lagring og gjenlasting, men siste PIN-sjekk fant to statusfelt etter at opplesingskontrollen ble lagt til. Testen avgrenser nå statusmeldingen til forelders opplåsingspanel. Ingen PIN-regel er endret. Formatering og produksjonsbuild er også grønne etter UI-oppfølgingen.

Ekstra regresjonskontroll: en modellvurdert forklaring under kartlegging skal ikke forsøke å lese mestringsforsøk som kartleggingen aldri oppretter. Forståelsesbekreftelse er nå avgrenset til vanlig øving med et eksisterende forsøk. Ny test bruker en positiv rubrikkrespons og kontrollerer at kartleggingens tilstand ikke får mestringsevidens eller ekstra forsøk. Lint/typecheck og alle 60 berørte agent-/økt-tester er grønne.

**Sluttkontroll av koden:** `npm run check` på `2aae377` er grønn med **333 tester i 18 filer**, simulering, **7 nettlesertester bestått / 1 lokal Auth-test hoppet over**, lint, typecheck, formatering og produksjonsbuild. [CI-kjøring 38138704953](https://github.com/sirhaugness/ki-techer/actions/runs/38138704953) på `8952128` er grønn i begge jobber, inkludert full magisk lenke → profil/PIN → ti kartleggingsoppgaver → lagret økt/hint/gjenlasting → avslutning → feil og riktig PIN. Siste forklaringsrettelse er verifisert med den nye regresjonstesten og hele pakken lokalt. Vercel har bekreftet grønt bygg også for `2aae377`. Siste CI-resultat lenkes i PR-en etter kontroll. Hosted innlogget Preview/ekte KI og fysisk iPad er fortsatt ikke verifisert i dette miljøet.

Preview-veiledningen peker nå på denne PR-ens callback-adresse og Stockholm-region. Før innlogging må den nye Preview-adressen være tillatt i leo-dev sin Auth URL Configuration; dette er et Supabase-valg, ikke en ny Vercel-miljøvariabel.

Siste fasitvern-kontroll fant at tallord over tjue og Unicode-tall kunne omgå den opprinnelige korte ordlisten. Kontrollen avviser nå sammensatte norske tallord, vanlige brøkord og alle Unicode-tall før fullt løsningshint. Den samme kontrollen brukes på interesseinnramming, som ellers kunne røpe fasit før eleven hadde bedt om hint. Lange tallord behandles med en avgrenset, iterativ ordsegmentering uten regex-backtracking. **92 berørte agent-/økt-/taletester er grønne**, inkludert nye tilfeller for «åtte», «trettitre», «ett tusen fire hundre», brøkord og alternative siffer. Den samlede sjekken og CI kjøres på nytt etter denne rettelsen; sluttresultatet dokumenteres i PR-en.

## Opplesing — oppfølging etter PR #3 (11. oktober 2026)

PR #3 er flettet inn i main. Feilsøkingen fant tre reproduserbare klientfeil: Auto-opplesing og den aktiverte lydspilleren ble nullstilt i overgangen fra hjem til økt; etter én mislykket TTS-forespørsel prøvde «Les høyt» aldri taletjenesten igjen; en sen avspillingsfeil kunne overskrive Stopp-meldingen. Nettlesertesten gjenskapte at Auto ble av etter øktstart, og to komponenttester gjenskapte de andre feilene før rettelsen.

Opplesingskontrollen er nå felles for hjem og økt. Lyd og stoppstatus knyttes til kilde, økt-ID og revisjon; manuelt bestilt lyd følger ikke med til neste oppgave når Auto er av. «Les høyt» prøver TTS igjen etter en tjenestefeil. Stopp, mikrofonstart, ny tekst og avmontering ugyldiggjør gamle avspillingsmeldinger. Feil i enhetsstemmen gir en forståelig melding. Ingen nye miljøvariabler eller databaseendringer.

**Verifisert:** Hele `npm run check` er grønn: lint, typecheck, formatering, **357 tester i 19 filer**, simuleringer, **8 Playwright-tester bestått / 1 lokal Auth-test hoppet over** og produksjonsbuild. Sju nye komponenttester dekker retry etter HTTP 503, sen avspillingsfeil etter Stopp, stopp før sent HTTP 200/503-svar, svar fra gammel økt, feil i enhetsstemmen og manuell opplesing ved oppgavebytte. Ny nettlesertest kontrollerer Auto på hjem → humørspørsmål → første oppgave med faktiske lydforespørsler og WAV-avspilling. iPad-testplanen er utvidet med disse tilfellene.

Testene bruker mocks etter brukerens valg. Ingen tilgang til Vercels kjørelogger eller fysisk iPad her; den konkret observerte Preview-feilen og ekte OpenAI-/Safari-avspilling er derfor ikke bekreftet. Ekstern CI og Preview for oppfølgingsrettelsen dokumenteres i den nye PR-en etter at resultatene er observert.

## Arbeidsregel for oppsett og Preview (11. oktober 2026)

Brukerens regel er lagt ordrett inn i AGENTS.md: nødvendig oppsett skal utføres og verifiseres via tilgjengelige connectorer eller CLI, Preview skal testes før ferdigmelding, produksjonsendringer krever spørsmål først, og brukeren skal bare spørres om manglende tilgang. Dette er en dokumentasjonsendring; ingen miljøvariabler, Redirect URLs, hemmeligheter eller produksjonstjenester er endret. Verifisert med Prettier på begge endrede filer og `git diff --check`.

Flettekonflikten mellom PR #4 og main etter innfletting av PR #5 er løst ved å beholde begge oppfølgingsavsnittene. Ingen appkode er endret i konfliktløsningen; formatering og `git diff --check` er kontrollert.

## M7 — før oppstart av M8 (11. oktober 2026)

Refleksjon etter lagret avslutning med egen refleksjonsmodell, modererte utdrag, Structured Outputs, to retries og faktabasert fallback. Ventende/reflektert-status og lease gjør arbeidet gjenopptakbart fra hjemskjermen. Profilfletting og interessevekting er atomisk og idempotent; faste confidence-regler, maks 25 aktive/låste, arkivering under 0,2 og vern av forelders låste/avviste valg. Profilkonteksten er nå koblet til lagrede observasjoner. Sterkeste aktive interesse tilpasser kapittelrammen, og kapittel følger avsluttede økter. Leo kan notere moderert skoletema eller svare «Vet ikke»; tema utløper etter sju dager.

**Verifisert før M8:** `npm run check` grønn med lint, typecheck, formatering, **365 tester i 20 filer**, alle simuleringer, **8 Playwright-tester bestått / 1 lokal Auth-test eksplisitt hoppet over**, produksjonsbuild. Nye tester dekker faktisk skoletema-tur og lagring, utløp, interessevalg/kapittel, refleksjonsvalidering/moderering/retry/fallback, kryss-elevavvisning, idempotens, foreldervern, arkivering, 25-grense og interessevekting i PostgreSQL. Alle fem migrasjoner kjøres i RLS-testen. Full lokal Auth/Supabase kjøres separat i CI; hosted integrasjoner, ekte modellrefleksjon og fysisk iPad er ikke verifisert her. Ingen ekte KI-kall i testene.

## M8 — før oppstart av M9 (11. oktober 2026)

Foreldredashbord med medaljongstatus og varsler som kan markeres sett, utskriftsdiplom for tildelte deler/hel medaljong, tid per dag/uke, øktantall, treff- og humørtrender, ferdighetskart med LK20, profilredigering/låsing/avvisning og egne observasjoner, bevislenker, misoppfatninger, forståelige strategiforslag, øktsammendrag og komplett samtale-/verktøyinnsyn. Innstillinger for økt/dagsgrense/tidsrom/tale/trinn/kartlegging/PIN/oppbevaring/budsjett og anslått forbruk. Forelders tale-av kan ikke overstyres fra Leo-modus.

JSON-eksport aggregerer alle husholdningens rader i SQL uten REST-trunkering og skjer bak forelderlås og medlemskapskontroll. Gamle logger ryddes også fra meldingskopien i øktsnapshot. Bekreftet appdatasletting fjerner husholdningens elevprofiler og avhengige data, PIN, forbrukslogger og private lydfiler. En separat bekreftelse sletter egen Auth-konto etter global utlogging; andre foreldrekontoer beholdes. Ryddeflagg og skrivegrenser hindrer gamle økt-/lydkall i å legge tilbake slettet innhold.

**Verifisert før M9:** `npm run check` grønn med lint, typecheck, formatering, **376 tester i 22 filer**, simuleringer, **10 Playwright-tester bestått / 1 full lokal Auth-test hoppet over**, produksjonsbuild. PostgreSQL-testen kjører alle seks migrasjoner og kontrollerer eksport med over 1000 meldinger, husholdningsskille, forelders profilskriving, loggopprydding og sletting. Nye rutetester dekker foreldergate, Origin, bekreftelse, eksport og kontosletting ved Auth-feil. Nettlesertestene redigerer/låser profil, markerer varsler, åpner verktøyinnsyn, eksporterer JSON, lagrer innstillinger og avviser diplom før tildeling. Test-PDF og skjermbilde er inspisert: én liggende A4-side med lesbar tekst og uten navigasjon/knapper. Ingen ekte elev-/kontodata ble slettet.

Full lokal Auth-CI er utvidet til foreldredashbord og eksport etter PIN-opplåsing. Automatisk oppbevaringsrydding, bindende KI-budsjett og rate limiting kommer i M9. Hosted Preview og ekte tjenester er ikke verifisert her ennå. Vercel-plugin finnes, men er ikke koblet til; tilgang er etterspurt mens uavhengig arbeid fortsetter.

## M9 — før felles PR (11. oktober 2026)

Atomisk månedlig KI-budsjett med reservasjon før betalte kall, 80 %-varsel og regelstyrt fallback ved grense eller utilgjengelig kontroll. Rate limiting per låst enhet og egen kvote for app/TTS/STT. Faktiske strømgrenser på alle JSON-/lydruter, håndtering av avbrutt innlesing, tidsavgrensede providerkall, privat lydcache og PostgreSQL-indekser for historie/forbruk/retention. Opprydding ved autorisert besøk omfatter logger, skoletema i både tabell og snapshot, gammel lyd og tekniske tellere. Eksport/sletting inkluderer nye budsjett-/rate-tabeller. Tastaturfokus, hopp-til-innhold, redusert bevegelse og Lighthouse i fullsjekk/CI. Nybegynnerveiledning, personvern, README og iPad-testplan er oppdatert.

**Verifisert:** `npm run check` grønn: lint, typecheck, formatering, **383 tester i 23 filer**, alle simuleringer, **10 Playwright-tester bestått / 1 full lokal Auth-test eksplisitt hoppet over**, produksjonsbuild og **100/100 Lighthouse-tilgjengelighet på alle seks visninger**. Alle sju migrasjoner kjøres i PostgreSQL-testen. Nye tester kontrollerer 0/80/100 %-grense, reservasjon/oppgjør/idempotens, måneds-/husholdningsskille, enhet/lås/rate-scope, vedlikehold uten tap av mestring, faktisk chunked-størrelse og betalt provider som ikke kalles ved nektet reservasjon. Nettleseren viser fallback, og eksisterende null-provider-mesterflyt tildeler delen først etter korrekt prøve.

Etter siste grenseforbedring på forelderrutene og avbrutt JSON-strøm er lint/typecheck og **alle 14 berørte grense-/forelder-/talerutetester** kjørt på nytt og grønne. Lighthouse-rapporter lagres som CI-artifact; målingen er lokal med syntetiske data, ikke hosted produksjon. Fallback gir ingen oppdiktet forståelsesgodkjenning for fritekst.

M7 og M8 ble fulltestet, dokumentert og committet før neste milepæl. Hosted dev-migrasjon, GitHub CI og Vercel Preview følges opp i samme PR. Ingen produksjonsendring er utført. Ekte KI-eval (≥95 %, null fasit-lekkasje), innlogget Preview og fysisk iPad Safari/Chrome gjenstår før fast bruk. Vercel-tilgang er etterspurt fordi den ikke er koblet til her; ingen nye miljønavn er innført.

## M7–M9 — oppfølging av PR #6

[PR #6](https://github.com/sirhaugness/ki-techer/pull/6) samler de tre milepælene. [Dev-migrasjon 38149648520](https://github.com/sirhaugness/ki-techer/actions/runs/38149648520) er grønn, og Supabase-connectoren bekrefter alle sju migrasjoner inkludert de tre nye. Vercel har bekreftet grønt Preview-bygg på `66e29d9`. [Hele GitHub-kjøring 38149648554](https://github.com/sirhaugness/ki-techer/actions/runs/38149648554) er grønn i begge jobber, inkludert full lokal Auth-e2e med PIN, foreldredashbord og eksport.

Hosted sikkerhetskontroll avdekket direkte anon-grants på M1s tre auth.uid()-avgrensede SECURITY DEFINER-hjelpere til tross for opprinnelig PUBLIC-revoke. En fjerde append-only migrasjon tilbakekaller eksplisitt anon, og RLS-testen etterligner nå Supabases direkte default-grants. Innloggede brukeres nødvendige bootstrap/RLS-hjelpere beholdes. Service-only tabeller uten klientpolicy er tilsiktet stengt; password-leak-advisor gjelder en passordfunksjon appen ikke bruker. [Supabase-kontrollens forklaring](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). Etter rettelsen er lint/typecheck/formatering og alle **17 PostgreSQL-/RLS-tester** grønne med alle åtte migrasjoner. Siste CI-/migrasjonsresultater lenkes i PR-en etter observasjon.

Forsøk på å åpne grenens Preview gjennom skymiljøets proxy ble eksplisitt blokkert med HTTP 403 CONNECT. Ingen omgåelse forsøkt. Vercel-plugin er ikke koblet til; innlogget Preview og modell-/budsjettvariabler kan derfor ikke bekreftes. PR står som utkast inntil Preview kan kontrolleres. Dette følger AGENTS.md-regelen «Test Preview selv før du sier at du er ferdig». Tilgang er etterspurt; ingen produksjonsendring.

## 2026-10-12: matteeventyr med læreren ved pulten

Alle sju kravområder er implementert: samlet/stabil oppgaveflate, lærerpanel med egne spørsmål og gradvis regelstyrt reservehjelp, korrekt registrering av hjelp i mesterutfordringer, tydelig riktig-bekreftelse/feiring, ett vedvarende interessevalg med databasevern, lagret historieprogresjon og uavhengig kontroll av tall pluss regneuttrykk. Star Wars er klikkbart og fortsetter over flere oppdrag. AGENTS.md, begge SPEC-filene, lærerprompten og DECISIONS er oppdatert slik at engasjement og faktisk læring er hovedmål.

Utført lokalt: 407 Vitest-tester bestått, inkludert hele SQL/RLS-historikken og ny migrasjon i PGlite. 15 Playwright-tester bestått med mocks; de to ekte Auth-testene kjøres separat mot lokal Supabase. Nye flyttester dekker mobil 390×844, nettbrett 768×1024 og PC 1440×1000, hjelp uten oppgavebytte/svartap, feil og riktig svar, neste oppgave, gjenlasting, ett aktivt eventyr og redusert bevegelse. Lint, typecheck, formatering, simulering og produksjonsbygg bestått. Ingen ekte KI-kall eller produksjonsendringer.

Supabase SSR-cookiefornyelse og varig lagring er kontrollert i installert SDK. Proxyen viderefører nå cachevern ved tokenfornyelse. Dev-økter har ingen `not_after`; globale hosted Auth-innstillinger kan ikke bekreftes fra den tilgjengelige connectoren. Nettleser-, tale- og enhetsbegrensninger samt full kravrapport finnes i [ADVENTURE-VERIFICATION.md](ADVENTURE-VERIFICATION.md). GitHub CI er grønn på cfefe42, inkludert ekte lokal Supabase Auth med lukking/gjenåpning av en vedvarende Chromium-profil, faktisk refresh-tokenrotasjon, PIN og eksplisitt utlogging. Den eksisterende fulle magisk-lenke/profil/kartlegging/øving/fremgang/PIN-flyten passerer også. Naturlig JWT-utløp er ikke avventet; testen fremprovoserer samme fornyelsesbane ved utløpt lagret økttid. Vercel Preview er READY; /login svarer 200 og uautorisert /leo går til innlogging. Innlogget hosted Preview og globale Auth-inaktivitetsinnstillinger er ikke bekreftet. Dev-migrasjonen er grønn, og SQL-kontroll bekrefter unik interesseindeks, null elever med flere aktive interesser og ingen direkte anon/authenticated-kjøring av select_adventure. Lighthouse er 100/100 på alle seks kontrollerte sider. Siste tegnehjelp er verifisert lokalt med de samme 407 enhetstestene, 15 nettlesertestene og bygg; den viser grupper fra generatorens kontrollerte tall og kan ikke sende oppgavesvar.

## 2026-10-13: personlig eventyr gjennom sammenhengende kapitler

Implementert kjeden interesse → planlagt kapittel med seks oppdrag → uavhengig svarvurdering og lærerhjelp → samlet læringsevidens → neste kapittel med tidligere valg og hendelser. Modellen velger innenfor læreplanens tilgjengelige ferdigheter og lager interesseunivers, karakterer, mål, hendelser og ruter. Seks komplette reserveuniverser holder spillet i gang ved modellfeil. Star Wars bruker BB-8, Poe, Leia og Kylo Ren i forskjellige roller; dinosaurer, fotball, dyr, bygging og verdensrommet har egne aktiviteter og hendelser.

Oppgaver varierer mellom flere ferdigheter og spørsmålsformer. En ressursbasert ruteavgjørelse får synlig konsekvens og huskes i neste kapittel. Evidens inkluderer ferdighet, vanskegrad, alle forsøk, uttrykk, hint, støttet/selvstendig løsning, tekstbehov og forklaring når den er gitt. Én feil eller hintbruk alene senker ikke kapittelvurderingen. Notasjonsproblemer med riktig tall gir ikke negativ aritmetikk- eller frustrasjonsevidens. x, X, ×, * og passende gjentatt addisjon godtas.

Store tilbakemeldinger med symboler, fremdriftsfeiring og redusert bevegelse. Svar kontrolleres før modellforklaring. Automatisk lærerrespons har egen ventestatus, tidsgrense, retry og beskyttelse mot svar på feil oppgave. Skrivefelt og sendeknapp står over en rullbar dialog. Interessebilder er kontrollert og lagret lokalt; nye interesser kan finne et bilde via Wikipedia. Feil bilde gir lesbar reservevisning.

Kapittel, valg, gjenstander og pausepunkt lagres med eksisterende atomiske JSON-snapshot. Interessebytte bevarer læringsprofil, aktuell oppgave, hint og vurdering. Det kreves ingen nye miljøvariabler, nøkler eller migrasjoner. Produksjon er ikke endret.

**Verifisering:** De åtte dedikerte Playwright-flytene er bestått i lokal Chromium: mobil, nettbrett og PC; seks oppdrag og valg til kapittel 2; oppfriskning; interessebytte og tilbake; lærerfelt under dialogrulling; redusert bevegelse; bildefeil; umiddelbar vurdering og sene lærerresponser. Skjermbilder er inspisert. Nye motor-/integrasjonstester dekker AST, korrupte oppgaver, modeller som feiler eller gir ugyldige kapitler, egendefinert univers, samlet tilpasning og notasjon uten mestringsstraff. PostgreSQL/PGlite bekrefter lagring av faktisk kapittel og læringsevidens gjennom `commit_learning_turn`. Full prosjektkontroll og Preview-resultat føres inn etter observasjon.

**Konkrete begrensninger:** Lokale tester bruker modellerstatninger og testeleven. Ekte modellkvalitet og innlogget hosted Preview er ikke bekreftet her ennå. Bilder er enkle interessebilder/portretter, ikke en ny illustrasjon for hvert oppdrag. Wikipedia-bilder for nye interesser kan mangle. Årsaken til et galt tall kan ikke alltid skilles mellom tekstforståelse og regnefeil; registrerte spørsmål og forklaringer supplerer den deterministiske vurderingen. Reservehistorier for helt nye interesser er generelle. Kapitler planlegges ved overgangen, ikke i en egen bakgrunnsjobb. Fysisk iPad/Safari gjenstår.

**Hva Thor må gjøre:** Prøv Preview med Star Wars og én annen interesse. Fullfør et kapittel, velg rute, se at kapittel 2 husker valget, og bytt interesse og tilbake. Skriv også x i et gangestykke og spør «Hva var feil?». Vurder språk og sammenheng med den ekte modellen før eventuell merge til produksjon.

**Samlet lokal kontroll:** 417 Vitest-tester i 25 filer bestått; alle simuleringer bestått; 18 Playwright-tester bestått og to ekte Auth-tester eksplisitt hoppet over fordi de krever lokal Supabase. Lint, typecheck, formatering og produksjonsbygg er grønne. Lighthouse gir 100/100 på alle seks kontrollerte visninger. Innsendt svar og regnestykke gjenopprettes også i feltene etter oppfriskning og interessebytte. Etter de siste forbedringene er 136 berørte lærings-/agent-/PostgreSQL-tester bestått. Avsluttende kontroll av lagrede svar og pauseflyt: 20 læringstester, alle tre kapittelflyter i nettleseren og nytt produksjonsbygg bestått. Lint, typecheck og formatering er kjørt igjen. Modellen får et større, avgrenset svarbudsjett for komplette kapittelplaner; eksisterende kostnadsreservasjon følger den samme grensen.

**GitHub og Preview:** Kodecommit `d9a985f` er verifisert av [Kvalitet 38411298785](https://github.com/sirhaugness/ki-techer/actions/runs/38411298785): både `checks` og `supabase-e2e` er grønne, inkludert ekte lokal Auth, vedvarende innlogging og full foreldre-/læringsflyt. Den ekstra regresjonstesten kontrollerer at tidligere kapittels fulle evidens brukes selv etter et interessebytte. [Dev-workflow 38411299409](https://github.com/sirhaugness/ki-techer/actions/runs/38411299409) er grønn; ingen nye migrasjoner ble lagt til. [PR #9](https://github.com/sirhaugness/ki-techer/pull/9) er utkast. [Preview for den kontrollerte koden](https://ki-techer-gmdwchhan-team-thor1.vercel.app) er READY. Vercels autentiserte fetch bekrefter HTTP 200 og riktig foreldrepålogging på `/login`; `/leo` uten appøkt viser samme innlogging. Innlogget hosted spill med ekte modell og fysisk iPad/Safari er fortsatt ikke prøvd. Denne siste oppdateringen gjelder dokumentasjon, ikke spillkode.

## 2026-10-14: illustrert spillverden og handling som varierer

Årsaken til det svake resultatet er sporet i den aktive praksisflyten: samme mengdetekst/svarpanel, statiske interessebilder og tekstlige konsekvenser. Ny scenekontrakt kobler KI-planen og komplette reservekapitler til tegnet sted, karakterer, konkret formål, kontrollert matematikk og faktisk animert endring. Nye kontroller gir mengder, fordeling, sammenligning, uttrykksbygging og illustrerte fortellingsvalg. Kapitler valideres etter kompilering, ikke bare etter fortellertekst eller nye tall.

Et beregnet rutevalg gir inventar/følgesvenn og endrer en senere scene. Feil restmengde gir nytt forsøk uten tap. Verdensminnet omfatter faktiske utfall, gjenstander, følgesvenner og uløst mål. Kapittel 2 bruker konkrete tidligere hendelser. Felles svarvurdering og lærerens forklaring er samordnet; læreren får også situasjonen i spillverdenen. Tidligere lagrede oppgaver oppgraderes med beholdte ID-er, innsendte svar, hint og fremdrift. Ingen migrasjon eller nye miljøvariabler/nøkler. Gjenbruk av eksisterende OpenAI-oppsett i Preview er godkjent av Thor og notert i AGENTS.md.

**Observert lokal kontroll:** Full Vitest-kjøring besto 424 tester i 26 filer. To ekstra komponenttester for uttrykksbygging/illustrerte fortellingsvalg er bestått. Alle simuleringer er bestått. Hele kapitler i Star Wars og Dinosaurer, overgang til kapittel 2, feil/riktig ruteutregning, interessebytte, lagret svar og redusert bevegelse er prøvd i Chromium. Avspillingstid i faktiske animasjoner er kontrollert og video tatt opp; åpning, løst scene, senere konsekvens og fortsettelse er fotografert og inspisert. De tre eksisterende mobil-/nettbrett-/PC-testene fant en forskyvning ved tilbakemelding; dette er rettet, og hele denne femtestfilen er bestått på nytt. To Auth-e2e-tester krever separat lokal Supabase og er eksplisitt hoppet over i mock-jobben. Lighthouse gir 100/100 på alle sju sider, inkludert den nye illustrerte eventyrsiden. Sluttbygg og Preview-resultat føres inn etter observasjon.

**Begrensninger:** Ekte modellkvalitet og innlogget hosted spill er ikke bekreftet. Ukjente interesser trenger en gyldig modellplan for sitt eget univers; offline-reserven er et konkret, men generelt verksted-/elveeventyr. Forfatterlagde reservefortsettelser har begrenset fortellingsbredde. Fysisk iPad/Safari er ikke prøvd. Se [ILLUSTRATED-VERIFICATION.md](ILLUSTRATED-VERIFICATION.md) for grensekontroll og visuelle bevis.

**Hva Thor må gjøre:** Prøv innlogget Preview med ett helt kapittel og en egen interesse. Kontroller fortellerkvaliteten med ekte modell før eventuell merge. Ingen nøkkeloppsett trengs i Vercel.

**Avsluttende lokal verifisering:** Produksjonsbygget er bestått. Siste fem kapittel-/animasjonstester er grønne etter endringene i lærerens situasjonskontekst og ventestatus. 18 PostgreSQL/RLS-tester er også bestått på nytt. Fordelingsfeil med riktig total registreres som regneevidens, mens ufullstendig uttrykksnotasjon fortsatt behandles separat. Formatering, lint og typecheck kontrolleres før commit. GitHub-/Preview-status føres inn når den er observert.

**GitHub og Preview:** [Kvalitet 38615071859](https://github.com/sirhaugness/ki-techer/actions/runs/38615071859) er grønn for kodecommit `3448195`: både `checks` og `supabase-e2e` er bestått, inkludert ekte lokal Supabase/Auth. [Dev-migrasjonsworkflow 38615071850](https://github.com/sirhaugness/ki-techer/actions/runs/38615071850) er grønn; denne oppgaven har ingen nye migrasjoner. [PR #10](https://github.com/sirhaugness/ki-techer/pull/10) er utkast. [Preview for verifisert kode](https://ki-techer-44jbaktxt-team-thor1.vercel.app) er READY og bekreftet mot samme SHA. Vercels autentiserte fetch gir HTTP 200 med korrekt norsk innlogging på `/login`; `/leo` krever appinnlogging. Dette bekrefter bygg og tilgang, ikke innlogget hosted spill eller ekte modellkvalitet. Denne avsluttende oppdateringen gjelder dokumentasjon.

**Hva Thor må gjøre:** Åpne Preview, logg inn som vanlig, og prøv ett helt kapittel samt en egen interesse. Vurder modellens språk og sammenheng før eventuell merge. Godkjenningen av eksisterende Preview-nøkkel er lagret; du trenger ikke svare på nøkkelvalget igjen.

## Eventyret som driver spillet — 14. oktober 2026 (pågående)

Retningen er avklart med Thor i `docs/STORY-DRIVEN-ADVENTURE.md`. Ny branch `feat/story-driven-adventure` bygger på oppdatert main etter PR #10. Ingen fast åpning: modellen undersøker interessen med faktisk nettsøk, får oversikt over alle lagrede kapitler og skriver en årsakskoblet fortsettelse. Kapittelarkivet bevarer hendelser og valg uten å kutte eldre kapitler. Bruk og forbruk av gjenstander skilles.

En samlet oppdragskontrakt styrer sted, rollefigurer, naturlig problem, kontrollerte mengder, spillerhandling, støtte og synlig konsekvens. En separat modellkontroll vurderer historielogikk og matematisk sammenheng før visning. Ny spillflate har scenebilder, manipulasjon av mengder og fordeling, konkret feilreaksjon og animert fremdrift. Kostnader og plassering av valg kommer fra planen; valget påvirker et senere oppdrag.

Foreløpig verifisert: fire nye enhetstester, eksisterende relevante regresjonstester, to nye nettlesertester gjennom hele kapitler i Star Wars og Dinosaurer, lagring/oppfriskning, valgkonsekvens og neste kapittel. Typecheck og lint har passert. Produksjonsbygg med webpack har passert; lokal Turbopack-bygging møter sandboxfeil ved binding av intern port. Skjermbilder er gjennomgått og desktopoppsettet forbedres før sluttverifisering.

Ekte modell og innlogget Preview er ennå ikke verifisert. PR opprettes som utkast mens dette kontrolleres. Ingen produksjonsendringer eller nye nøkler. Eksisterende OpenAI-nøkkel i Preview gjenbrukes.

**Hva Thor må gjøre:** Ingen oppsett. Vurdere den spillbare Preview etter sluttverifisering.

## 2026-10-14: gjenbrukbart agentteam i Codex Cloud

Opprettet [designer](agent-team/designer.md), [tutor-evaluator](agent-team/tutor-evaluator.md), [reviewer](agent-team/reviewer.md) og [arbeidsflyt](agent-team/workflow.md). Én ny instruksjon i AGENTS.md kobler hovedagenten til arbeidsflyten og relevante underagenter. Rollefilene leses og gis til faktiske underagenter; de registrerer ikke native agenttyper. Bare hovedagenten endrer appkode som standard, høyst tre underagenter kjører samtidig, og delte tester samordnes.

**Forhåndskontroll:** Leste den fullførte Cloud-chatten «Undersøk underagentverktøy» (`01a13c46-25c0-7025-8fc9-768c04ef4048`): to separate underagenter var faktisk startet, fullført og samlet. Den tidligere chatten «Undersøk Cloud-chat underagenter» var avbrutt og ble ikke brukt som fullført test. Denne chatten har også start-/vente-/meldingsverktøy. Kontrollerte alle 12 eksisterende eksterne brancher og søkte PR-er; ingen tilsvarende teamoppsett funnet. Arbeidet startet derfor på `codex/agent-team-setup` fra `origin/main`, `bf9b58d790bbab02a0647c06984e976d17f0d368`.

**Faktisk prøvekjøring:** Hovedagenten startet `/root/designer`, `/root/tutor_evaluator` og `/root/reviewer`, ga hver prosjektsti, relevant rollefil med pålegg om å lese den, AGENTS/workflow, avgrenset oppdrag, ferdigkriterier og kildebaserte begrensninger. Tre var samtidige; alle leverte før resultatene ble samlet. Spesialistene endret ingen filer eller tjenester, startet ingen underagenter og kjørte ingen app-/modelltester.

| Underagent      | Leveranse og bevis                                                                                                                                                                                                                                                        | Hovedagentens vurdering og oppfølging                                                                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Designer        | P3: Samme `payoff.scene` vises to steder ved rutevalgets senere konsekvens. `components/leo/adventure-scene.tsx:140,161` og `lib/learning/adventure.ts:898–909`. Ingen skjermbilder/opptak av flyten i repo; app eller barn ikke observert.                               | Kontrollert kildekjeden. Kodeatferden er dokumentert; UX-effekten er en hypotese. Ført i BACKLOG, utenfor oppgaven. Ingen apprettelse. Rollemandatet ble vurdert som gjennomførbart.                                                                                        |
| Tutor-evaluator | P2: Eval måler begrensede sikkerhetskriterier etter guards, uten sammenhengende elevdialog (`scripts/eval-agent.ts:16–45`, `lib/agent/loop.ts:111`). P3: Historietest bruker håndskrevet provider selv med `source: 'model'` (`tests/learning/chapters.test.ts:296–320`). | Kontrollert kildene og ført to oppfølgingspunkter i BACKLOG. Dette er begrensninger i evalueringsbevis, ikke testet modellkvalitet eller en påvist feil i kildeflagget. Ingen faktisk elevrespons eller matematikkoppgave ble prøvd. Rollefilen hadde ingen konkret mangel. |
| Reviewer        | Ingen konkrete feil i AGENTS og de fire nye filene mot `origin/main`. Kontrollerte kravdekning, lokale lenker, diff og at eksisterende AGENTS er byte-for-byte bevart når den nye linjen fjernes.                                                                         | Funnene støtter oppsettet. Ingen rettelser nødvendig i de gjennomgåtte filene. Samlerapport/PROGRESS/BACKLOG er også etterkontrollert uten konkrete feil før commit.                                                                                                        |

**Dokumentasjonskontroll:** Prettier 3.9.9 er kjørt på de nye/endrede rollefilene og AGENTS. Hele repoets `prettier --check .` besto. Reviewer bekreftet lokale lenker, `git diff --check` og uendrede eksisterende AGENTS-regler. Endelig kontroll besto for alle sju dokumentasjonsfiler: 14 lokale Markdown-lenker finnes, eksisterende AGENTS er identisk etter fjerning av den ene nye linjen, og kun det avtalte dokumentasjonsomfanget er endret. Reviewer etterkontrollerte også samlerapport og backlog uten konkrete feil. Ingen appkode, prosjektavhengigheter, miljøvariabler, hemmeligheter, godkjent OpenAI-oppsett eller produksjonsgrenser er endret. Lint/typecheck/app-tester/bygg er ikke kjørt lokalt for denne dokumentasjonsendringen; den eksisterende PR-CI-en kontrolleres separat.

**Tilgang og Preview:** Ingen nødvendige underagentverktøy mangler. Prosjektavhengigheter var ikke installert; kun den fastlåste formatereren ble hentet i `/tmp` uten endring av package.json eller lockfil. Nettverkskommandoer krever miljøets nettverkstilgang; GitHub-tilgang er bekreftet. PR/CI/Preview-lenker og observert sluttstatus dokumenteres i PR-beskrivelsen etter publisering. Ingen innlogget appflyt eller ekte modellrespons er testet; status oppdateres i PR-en etter observasjon.

**Hva Thor må gjøre:** Les agentoppsettets PR og kontroller at sjekkene er grønne før eventuell merge. Etter eventuell godkjenning av dokumentasjonsendringen kan arbeidsflyten brukes fra main; merge til main berører produksjonsløpet og utføres ikke av agenten i denne oppgaven. Neste appoppgave gis som vanlig til én hovedagent, som velger og starter relevante spesialister selv. Ingen ny nøkkel eller manuell registrering av agenttyper trengs.

## 2026-10-15: rettet formatering i PR #11

Prettier 3.9.9 rettet en manglende blanklinje i `docs/PROGRESS.md` som stoppet GitHub-sjekken `format:check`. Hele prosjektets `npm run format:check` og `git diff --check` er bestått. Bare dokumentasjonen er endret; appflyt og innlogget Preview er ikke testet på nytt i denne oppgaven.

**Hva Thor må gjøre:** Vent på de nye GitHub-sjekkene i PR #11 og kontroller at de er grønne før eventuell merge. Vurder fortsatt den spillbare Preview som beskrevet i PR-en.

## 2026-10-15: oppfølging etter ekte historiedrevet Preview-prøving

PR #11 ble merget under arbeidet. Rettelsene etter den ekte gjennomspillingen videreføres derfor i [PR #14](https://github.com/sirhaugness/ki-techer/pull/14). Den nye spilleren, forsket univers og kapittelarkiv er utgangspunktet; denne oppfølgingen retter feil som ble synlige i faktisk bruk.

Geometri får korrekte 2D-figurer og en 3D-utforsker med rotasjon, vipping og markering. R2-D2, Chewbacca og Millennium Falcon får passende utseende. Bygging viser en ferdig gjenstand, og redning gjennom en port viser vennen som kommer ut. Interne mengdefelter bindes i feilrespons, også for lagrede scener. Algoritmebrettet fyller koordinatfeltene, og begge koordinater gjenopprettes.

Kapittelkontrollen avviser samme oppgaveindeks flere ganger og skjulte svarparametere i rest, handel og ukjent mengde. Modellkritikeren krever fysisk nødvendig matematikk, kostnader i riktig enhet, og en faktisk redning eller et uttrykkelig uløst mål. Dette er forbedrede kontroller; allerede lagret fortellertekst blir ikke omskrevet.

En ekte gjenopptakelse etter Oslo-midnatt avdekket duplikatinnsetting av lagret oppgave-ID. Isolert transaksjon med rollback bekreftet årsaken. Rettelsen bevarer oppgaven og forsøkene i en ny økt og ved interessebytte tilbake, uten ny innsetting. Dette er nå bekreftet i innlogget Preview: svaret 6 ble godtatt på den lagrede prismeoppgaven, og kapittelet kunne spilles videre. Alle seks Star Wars-oppdrag er løst, valg med kostnad og rest er lagret, og senere scene bruker valget.

**Agentteam:** Reelle underagenter designer, tutor-evaluator og reviewer undersøkte bilder, faktisk modelltekst og kode. Hovedagenten samlet funnene, gjorde rettelsene og kjørte den delte Preview-testen. Alle dokumenterte kodefunn er etterkontrollert. Reviewer kjørte i tillegg isolerte generator- og pause-/valgforløp. Se [STORY-PREVIEW-VERIFICATION.md](STORY-PREVIEW-VERIFICATION.md) for funn, kilder, tiltak og grenser.

**Observert kontroll:** Full lokal kjøring med 437 Vitest-tester, lint, typecheck, formatering og simulering er bestått. Webpack-produksjonsbygg er tidligere bestått; Vercels vanlige bygg for `871779b` er READY. 18 eksisterende browser-tester er bestått; fire som først stoppet fordi videoverktøyet manglet, er kjørt på nytt og bestått. To lokale Auth-tester krever egen Supabase-stack og ble hoppet over lokalt. Lighthouse ga 100/100 på åtte visninger. GitHub-kvalitet [38655914992](https://github.com/sirhaugness/ki-techer/actions/runs/38655914992), ekte lokal Supabase/Auth og dev-migrasjoner [38655914979](https://github.com/sirhaugness/ki-techer/actions/runs/38655914979) er observert grønne for `871779b`. Siste berørte storytester: åtte bestått etter ressursfelt og fortellertekstgrense.

**Ekte modell:** To universer ble faktisk undersøkt med nettsøk, og alle seks oppdrag i hvert første kapittel er løst i innlogget Preview med en separat syntetisk dev-profil. Star Wars kapittel 2 ble generert, men viste svak kontinuitet fra gammel arkivtekst. Dinosaurer kapittel 2 er generert etter retting av modellfrist og feilaktig historikk-kritikk; det fortsetter med det revne kartet fra kapittel 1. Alle seks oppdrag i dinosaur-kapittel 2 er nå gjennomspilt, og et ekte kapittel 3 er generert. Begge tidligere kapitler beholder seks hendelser og ett valg; browser-scriptet fullførte med null nettleserfeil. Felles oppdragsavslutning bevares sammen med valgets tillegg, hele tidligere utfall beholdes, valgets ressursenhet skilles fra scenens figur, og hele setninger prioriteres. Gammelt eventyr videreføres fra sist løste oppgave fremfor at alle ustartede gamle oppgaver må spilles først. Ny økt lagrer hele gjenværende minutter.

**Hva Thor må gjøre:** Ingen nøkkel eller miljøoppsett. Vurder den faktiske spillbare testversjonen og historienes kvalitet før eventuell merge av PR #14. Scene- og animasjonsbiblioteket er fortsatt begrenset, og modellgenerering kan ta flere minutter. Fysisk iPad/Safari er ikke prøvd. Åpne [verifisert Preview](https://ki-techer-p3k51oqfo-team-thor1.vercel.app), velg en interesse og prøv de tre første nye oppdragene. Allerede lagret fortellertekst beholder sine tidligere svakheter; nye krav gjelder neste genererte kapittel. Ingen merge utføres av agenten.

**Første kvalitetsstopp og siste vurdering:** De tre første faktisk genererte oppdragene i Star Wars kapittel 2 og Dinosaurer kapittel 3 er gjennomspilt i `871779b`, med feilforsøk, riktige svar, matematisk valg, oppfriskning og interessebytte. Scriptet fullførte med null nettleserfeil. Designer og tutor-evaluator fant fortsatt generiske/feilpassende gjenstandsfigurer, dobbelbruk av kiler i et valg, engelske svartellerord og svak overskriftkontrast. Svarteller, bildevalg og kontrast er rettet; ressursregnskapet er skjerpet i forfatter- og kritikerinstruksjon. Det gamle kilevalget blir ikke omskrevet. Dette er en spillbar kvalitetsprøve, ikke en påstand om ferdig forteller- og animasjonskvalitet. Se verifiseringsnotatet for presise grenser. Testprofil og egne midlertidige delingslenker ryddes før overlevering.

## 2026-10-15: konkrete materialer og tilgjengelige valgbeholdninger

Oppfølging av den faktiske kvalitetsprøven: scenene kan nå vise steinmerker i de gitte gruppene, leirekiler rundt en sporhelle, støysendere/harpiks i en pose og lysblink fra et speil. Materialikoner for stein, kile, harpiks, tau og støysender er egne figurer. Visningen oppgraderer gamle generiske kart-/lagerbilder når oppgaveteksten entydig navngir materialet; eksplisitte port-/skip-/personmål beholdes. Deling viser elevens faktiske fordelinger eller foreslåtte antall, uten å hente fasiten til visningen. Figurfortegnelsen heter «Figurer i historien», slik at en fanget figur ikke påstås å være med i laget.

Ny `resourceEffect` skiller innsamling fra bruk. Et nytt valg avvises i kode hvis foregående oppdrag ikke samler tilgjengelige ressurser, eller allerede animerer bygging, forbruk eller avreise. Forfatter og kritiker skal i tillegg kontrollere at teksten stemmer med dette. Gamle lagrede matematiske oppgaver, valg og fortellerhendelser omskrives ikke.

Reviewer fant og etterkontrollerte to visningsfeil under arbeidet: konkrete port-/skipmål ble først overskrevet, og deling hadde en feil grense på fire steiner per haug. Begge er rettet og isolerte tester viser både [6,6,6] og [2,7,1]. Seks visningstester og ni storytester er bestått; typecheck/lint/formatering er bestått, og begge historiedrevne browser-tester er bestått. Full kjøring før de to siste visningsregresjonene: 442 tester. Siste Preview og faktisk modellplan med den nye ressurskontrakten kontrolleres før overlevering.

**Hva Thor må gjøre:** Ingen oppsett. Spill den ferdig verifiserte Preview-lenken fra PR #14 og vurder om handlingene nå passer til historien. Ingen merge utføres av agenten.

**Siste kontroll av konkrete scener:** Alle seks faktiske modellscener fra kvalitetsstoppen er gjenspilt lokalt og fotografert med nye materialfigurer etter animasjonstiden; tjue steinmerker, åtte kiler og støysenderposen er kontrollert. Begge ordinære historiedrevne browser-tester og et eget visuelt gjenspillingsforløp er grønne. Svartelleren er forankret i scenen, og tilbakemelding ligger under den, slik at tekst ikke dekker tallet. Stedsteksten dekker ikke lenger steinhaugene.

**GitHub:** Kode `0f5bbce` har grønne [kvalitets-/Supabase-sjekker 38692234849](https://github.com/sirhaugness/ki-techer/actions/runs/38692234849), 445 enhetstester, 22 browser-tester, produksjonsbygg og 100/100 tilgjengelighet på åtte visninger. Dev-migrasjonsjobben er grønn. Siste layoutrettelse verifiseres i samme løp før overlevering.

**Tidligere blokkering (senere godkjent, se sluttstatus nedenfor):** Den ferske modellplanen ble avvist på talernavn; entydige kortnavn og bindestrekvarianter er nå rettet uten å godta ukjente figurer. Testhusholdningen har nå brukt opp KI-rammen på 100 kroner. Godkjenning til å øke testrammen til 130 kroner ble forespurt på dette tidspunktet. Ingen nøkkel er endret. Bare dette avhengige modellarbeidet venter; visning, tester og dokumentasjon er fullført. Midlertidig testprofil beholdes til den ventende testen eller oppryddingen avsluttes; aktive testdelinger tilbakekalles før overlevering.

## 2026-10-15: godkjent ekstra modelltesting

Thor godkjente inntil 30 kroner ekstra. Testen bruker samme syntetiske dev-husholdning og uendret forbruksregnskap, med en midlertidig branch-avgrenset Preview-ramme på 130 kroner (utgangspunkt 100,5127). Vanlig Preview og produksjon er ikke endret.

Første nye generering besto scenekontrakten og kom til den uavhengige kritikeren, men gpt-5-mini brukte hele grensen på 1800 outputtokens og returnerte avkuttet JSON. Kritikeren får nå 4000 tokens og opptil 60 sekunder innenfor samme samlede planleggingsfrist. Provider avviser eksplisitt ufullstendige svar og registrerer parsefeil som mislykket, med tokenforbruk bevart. Elleve relevante tester, typecheck og lint er bestått. Ny faktisk gjennomspilling og opprydding følger før sluttstatus.

**Hva Thor må gjøre:** Ingen oppsett eller ny godkjenning. Avvente den ferdige teststatusen.

**Ekte gjennomspilling etter rettelsen:** Seks nye Star Wars-oppdrag er løst med feilforsøk, oppfriskning, tauvalg (4 tilgjengelige, 3 brukt, 1 igjen), senere konsekvens og et ekte kapittel 2. Ingen nettleserfeil. Tutor-evaluator bekreftet fasitene uavhengig, men fant at fjern avsender Leia ble fysisk deltaker uten forklaring, og at monterte kiler ble registrert som medbrakt. Neste kapittel gjentok også premisset med en manglende meldingskode. Forfatter/kritiker får eksplisitte kontroller for tilstedeværelse, montert utstyr, nødvendig geometri og faktisk fremdrift. Skjemaet beskriver nå hook som et nytt problem etter siste oppdrag, og delmålet som noe kapittelet faktisk oppnår. Lagret tekst omskrives ikke. Dette prøves i neste generering innenfor samme godkjente ramme.

**Andre hele kapittel:** Seks oppdrag i det lagrede kapittel 2 er gjennomspilt i `6e79040`, inkludert volum (2 × 4 × 5 = 40), valg med kostnad/rest og senere signal. Testhjelperen er utvidet for å regne denne volumoppgaven fra de synlige gitte målene. Neste generering ble avvist før visning: continuity var avkuttet, og kritikeren etterlyste restregnskap som motoren allerede viser og lagrer. Continuity får derfor plass til én hel setning, og kritikeren får autoritative beregninger av beholdning, kostnad og rest. Kritikerens feiltekster tillater hele setninger og kan ikke være tomme. Budsjettregnskapet etter avvisningen er 123,9119 kroner, med 6,0881 igjen innenfor den godkjente totalrammen på 130. Siste forsøk bruker samme regnskap og profil; ingen nullstilling.

`6e79040` har observerte grønne GitHub-sjekker: [kvalitet og full Supabase/Auth 38697567608](https://github.com/sirhaugness/ki-techer/actions/runs/38697567608), samt dev-migrasjoner. Den tidligere kjøringen `79590a3` passerte ved ny kjøring etter tidsfeil i tale- og foreldretesten. Ingen appfeil er utledet bare fra disse tidsfeilene.

## 2026-10-15: ekstra testing avsluttet innenfor godkjent ramme

Ekstra beregnet forbruk ble **25,9078 kroner** av godkjente 30. To hele, ekte Star Wars-kapitler er gjennomspilt med feilforsøk, riktige svar, oppfriskning, matematiske valg og senere konsekvenser. Begge arkivkapitler har seks hendelser og ett valg. Tauets tidligere dobbelbruk er ikke observert i den nye prøven. De dokumenterte nye historiefunnene om Leia, monterte kiler og gjentatt premiss er fulgt opp med strengere instruksjoner og skjemabeskrivelser; lagret tekst er ikke omskrevet.

Siste tutor svarte i `da8b14a`, men kontrollmodellens nødvendige kostnadsreservasjon oversteg restbeløpet på 3,5795 kroner. Ingen kontrollkall eller flere modellkall ble startet etter dette. Det er derfor **ikke verifisert et godkjent nytt kapittel etter siste rettelse**. Spill- og fortellerkvalitet er fortsatt ikke ferdig godkjent. Dette er en reell begrensning, ikke erstattet med mock-bevis.

GitHub [38698459947](https://github.com/sirhaugness/ki-techer/actions/runs/38698459947) og dev-migrasjoner [38698459916](https://github.com/sirhaugness/ki-techer/actions/runs/38698459916) er observert grønne for appkode `da8b14a`: 447 Vitest-tester, browser-flyter, full Supabase/Auth, bygg og tilgjengelighet. Reviewer fant ingen nye P1/P2 i siste kode. Tutor-evaluators innholdsfunn er beholdt i rapporten; de siste instruksene er ikke fremstilt som bevist feilfri historiekontroll.

Testkontoens innlogginger er tilbakekalt, syntetisk husholdning/to elever/auth-bruker er slettet og fravær etterkontrollert. Private lokale filer er fjernet. Midlertidig testbranch er slettet, og dens budsjettkonfigurasjon er tilbake på 100. Delinger er tilbakekalt eller utløpt. Ingen merge, nye nøkler eller produksjonsendringer. Detaljer og kostnadsbevis finnes i [STORY-PREVIEW-VERIFICATION.md](STORY-PREVIEW-VERIFICATION.md).

**Hva Thor må gjøre:** Åpne [Preview da8b14a](https://ki-techer-6937f18t5-team-thor1.vercel.app), logg inn som vanlig og vurder de tre første nye oppdragene. Vent med merge av [PR #14](https://github.com/sirhaugness/ki-techer/pull/14): en ny godkjent generering etter siste rettelse og endelig vurdering av fortellerkvalitet gjenstår. Ingen nøkkel eller miljøoppsett kreves.

## 2026-10-15: ny godkjent testramme på inntil 50 kroner

Thor har godkjent ytterligere inntil 50 kroner for sluttprøving. Forrige syntetiske konto var slettet. En ny separat dev-konto har fått tilbake de to faktiske historiekapitlene (seks hendelser og ett valg i hvert) fra testbeviset. Full tidligere mestringstilstand var ikke arkivert og er ikke påstått gjenopprettet. Kostnadsgrunnlaget er kopiert videre som 126,4205 kroner, med branch-avgrenset testtak 176,42. Ingen nullstilling av forbruk eller endring i vanlig Preview/produksjon.

Første nye generering ble avvist på tvetydig dobbelbruk av harpiks. Kostnaden for et valg blir allerede trukket når gjenstanden lages, mens forfatterinstruksen tidligere kunne forstås som at råmaterialene først skulle brukes i payoff. Kontrakten er nå presis: valget lager assetName av cost råressurser; payoff bruker den ferdige gjenstanden. Kode avviser samme råressursnavn i payoff.uses/consumes. To regresjonstester avviser begge former med bevart elevtilstand; elleve storytester, lint og typecheck er bestått. Ny faktisk modellkontroll følger.

Reviewer fant en konkret kappløpsfeil i Auth-nettlesertesten: hintklikk ble etterfulgt av reload før API-lagringen var bekreftet. Testen venter nå på 200, økt hintnivå og aktiv knapp før reload, og kontrollerer 200/ended etter avslutningen. Timeouten er beholdt. Den faktiske 409-responsen i tidligere CI er ikke bevist, men den usynkroniserte kontrollflyten er kildebekreftet. Forrige dokumentasjonscommit `85b618c` har nå også observert grønn ny CI-kjøring; de nye rettelsene får eget løp.

**Hva Thor må gjøre:** Ingen oppsett eller ny godkjenning. Den ekstra testingen pågår innenfor den avtalte rammen.

## 2026-10-15: produksjonskontroll og videre test etter merge av PR #14

Thor ba om å kontrollere at siste versjon var ute. PR #14 ble merget eksternt 12:14 UTC (14:14 norsk tid), mens testarbeidet pågikk. Read-only kontroll bekrefter at `ki-techer.vercel.app` peker til READY-deployment `dpl_G9YE65eV1nwsWCFvyy5xLyrZtzQn` med main `d47d658`. Innloggingssiden svarte HTTP200. Agenten merget eller publiserte ikke. Lagrede oppgaver/fortellinger omskrives ikke ved utrulling; kontrollen beviser riktig deploy, ikke en ny elevhistorie i produksjon.

Den allerede godkjente ekstra testingen videreføres på ny branch `fix/story-verification-followup` fra oppdatert main. To reelle genereringsforsøk i denne50-kronersrunden er avvist før visning; beregnet ekstraforbruk er hittil14,6372 kroner. Siste avvisning var en falsk konflikt rundt en sekskant: generatorens standardtekst hadde en generell merknad om trekanter samt flertall selv ved én figur. Standardteksten er presisert, og både forfatter/kritiker får nå autoritative figurdata (form, egenskap, antall). Kritikeren får også de lagrede historiske valgene som forfatteren allerede hadde. 190 generator-/storytester, lint og typecheck er bestått før siste tekstformatering.

**Hva Thor må gjøre:** Last produksjonssiden på nytt. Dersom en gammel oppgave er aktiv, løs den og gå videre for å få ny historiegenerering. Ingen oppsett eller produksjonsendring kreves for kontrollen; videre testrettelser får egen Preview/PR.

**Neste faktiske kontroll:** Ny plan ble avvist på et energiregnskap (36 funnet, 48 krevd uten ny kilde) og at payoff listet begge alternative gjenstander. Felles payoff-felter avviser nå valgfrie assetName; de valgte gjenstandene beskrives bare i rutens egne laterScene/laterSuccess. Tre begrensede korrigeringsforsøk kan rette samme utkast. Research, cache, generering og kritikk deler nå én planleggingsfrist fra funksjonens start, med tid satt av til moderering/lagring/levering. Dette er ikke en garanti mot alle eksterne nettverksforsinkelser. 191 generator-/storytester, lint og typecheck er bestått før fristplasseringen. Reviewer bekreftet ressursregelen og ba om større tidsmargin; den samlede fristen følger opp dette. Ny reell prøve gjenstår. Ekstra beregnet forbruk i50-kronersrunden er hittil21,5972 kroner, ingen ny produksjonsendring.

**Gjennomspilt kapittel 3 og strengere fortellingskontroll:** Alle seks oppdrag, harpiksvalget (40−12=28), feil/riktig svar og oppfriskning er gjennomført i ekte Preview uten nettleserfeil. Uavhengig tutor bekreftet matematikken, men fant gjentatt kartpremiss, svakt begrunnet veivalg og liten nytte av tidligere valg. Historiekvalitet er derfor ikke godkjent. Kontrollmodellen bruker nå samme sterke modellvalg som forfatteren, i et separat kontrollkall, og får siste faktiske hendelse foran den gamle planlagte kroken. Første oppdrag må referere siste gjennomførte hendelse; forfatter/kritiker krever konkret nytte av tidligere valg og nytt praktisk formål. Dette prøves i kapittel 4 uten å omskrive det fullførte kapittel 3. Beregnet ekstraforbruk hittil: 29,5659 kroner av de godkjente50.

## 2026-10-15: sluttstatus for godkjente50 kroner og produksjonskontroll

Ekstra beregnet forbruk ble **39,4058 kroner** av50. Hele nye Star Wars-kapittel3 er gjennomspilt i affaf19 med seks hendelser, valg40−12=28, feil/riktig svar og refresh. Arkivet har tre faktiske kapitler med seks hendelser/ett valg hver. Uavhengig tutor bekreftet matematikken, men fant gjentatt kartpremiss og ubegrunnet rutegeometri. Den nye sterke kontrollen i607c892 avviste kapittel4 før visning på et fortsatt ulogisk veivalg; ingen ny godkjent fortsettelse påstås. Ingen flere betalte forsøk startet.

Reviewer fant og etterkontrollerte en rettelse som lar første kapittel etablere situasjonen uten historikkkrav. Designer bekreftet faktisk kart-/posebevegelse i opptak, men P2 består for manglende visuelle mengder/alternative veier, prismereparasjon som ikke vises på prismet, og svarfelt som krever rulling bort fra scenen. Disse funnene er ikke lukket med den sterkere prompten. **Forteller-/spillkvalitet er fortsatt ikke ferdig godkjent.** Se detaljert sluttstatus i STORY-PREVIEW-VERIFICATION.

607c892 har450 beståtte enhetstester lokalt, typecheck/lint/formatering, og observert grønn GitHub38737254017 inkludert full Supabase/Auth, bygg og tilgjengelighet; dev-migrasjoner/Preview-bygg er grønne. Ingen fysisk iPad/Safari eller barnetest. Testkonto/husholdning/elev/innlogginger er slettet og fravær etterkontrollert, ingen uoppgjorte reservasjoner, egen deling tilbakekalt og branch-konfigurasjon bekreftet100. Midlertidig remote testbranch og private lokale filer er fjernet. Ingen produksjonsendringer fra agenten.

Produksjon kjører den eksternt mergede PR14, main d47d658, READY og riktig alias; innloggingen svarer200 og ny story-CSS finnes. Nye rettelser ligger i utkast PR15, separat fra prod. Gammel lagret fortelling blir ikke skrevet om av en utrulling.

**Hva Thor må gjøre:** Last https://ki-techer.vercel.app på nytt for PR14. PR15 er ikke i prod og bør vente med merge til åpne kvalitetsfunn er rettet. Ingen nøkkel, oppsett eller mer testbudsjett etterspørres.

## 2026-10-15: kostnadskutt og kontrollmandat før videre historiemotor

Thor ber om kostnader i vanlig bruk, mål under1kr/økt, mini til generering/kontroll og mocks/billigste modell til tester. Ny samlet testgrense10kr gjelder dette arbeidet; tidligere30/50-godkjenninger gjenbrukes ikke. PR15 forblir utkast til fortellings- og kvalitetskontroll er ferdig.

Read-only produksjonsaggregater fra ai_calls:158 tutor/gpt-5.2-kall (516557input/9759output,55,5593kr gammelt anslag),8 refleksjoner/gpt-5.2 (9627/4296,2,6811kr),147 modereringer(0). Ingen produksjonskall var merket historiekapittel/research, og historikken mangler økt-/kapittel-ID; derfor påstås ingen eksakt normaløkt- eller kapittelpris fra gamle logger. Alle modeller ble tidligere priset100/400kr per millioninput/output. Modellpriset nyanslag med dokumenterte standardpriser og antatt11NOK/USD gir vesentlig lavere beløp; detaljer/scenarier dokumenteres i AI-COSTS.md. Historiske beløp/regnskap omskrives ikke.

Implementert: felles standardgpt-5-mini for alle tekstkall, egne kalltyper for generering/kontroll/hjelp/feedback/forklaring, prisversjon og økt-/kapittelkobling i nye logger, maksimaltett nytt utkast etter første plan, og ett forsøk på korte hjelpe-/oppsummeringskall. Hele kapitler og research lagres allerede; ny plan sendes ikke under vanlig gjenopptakelse. Alle faktiske hendelser/valg beholdes i modellkonteksten én gang, uten dupliserte sistekapitler.

Separat fortellingskontroll får obligatorisk evidens på tre kapittelkriterier og tre kriterier for hvert av seks oppdrag; kode avviser ufullstendige kontrollsvar og oppdiktede historikkreferanser. Matematiske generatorer, moderering, hint-/mestringsvern og lagring er beholdt. Reviewer fant et gammelt eval-agent uten budsjettvakt; nå kreves budsjettvakt også i rå tekst-/taleprovider. eval:agent bruker mocks som standard; eksplisitt live bruker nano og varig, låst regnskapsfil med hard10kr-grense. Preview-testen krever autentisert serverramme≤10 og billig modell før handlinger. Vercel-delingsfilen omgikk bare Vercels Preview-beskyttelse, ikke appens innlogging/RLS/budsjett/barnesikkerhet.

**Hva Thor må gjøre:** Ingen oppsett. Avvente faktisk mini-kontroll og sluttstatus; PR-en er fortsatt utkast.

## 2026-10-16: kostnadskutt levert i utkast, fortellerkvalitet fortsatt åpen

[AI-COSTS.md](AI-COSTS.md) skiller faktisk produksjonsregnskap fra regneeksempler og testing. Siste read-only produksjonsuttrekk 15. oktober 21:22 UTC har 158 tutor/gpt-5.2, 9 reflect/gpt-5.2 og 156 modereringer. Gammelt flatt anslag er 58,4637 kr; separat omprising av samme tokens gir 12,3632 kr ved dokumenterte standardpriser og antatt 11 NOK/USD. Historiske regnskap er ikke endret. Gamle kall mangler tilstrekkelig attribusjon for en målt vanlig økt-/kapittelpris. Et eksplisitt mini-eksempel gir 0,34 kr per kapittel og 0,40 kr for en økt med tre hjelpekall/oppsummering; første research, omskriving, lang historikk eller tale kan gjøre økten dyrere enn én krone.

Kostnadstiltakene er implementert: mini som felles tekststandard, ett helt kapittel per forfatterkall, separat kontroll, høyst én omskriving, lagring/gjenbruk innen samme historie og modellpriset logging med økt-/kapittelkobling. Ingen automatisk oppgradering til dyr modell. Generering/kontroll bruker medium resonnering med tak 12000/6000 tokens. Alle betalte tekst-/taleprovidere krever budsjettvakt. Mocks er standard; generell ekte eval bruker nano, mini-kvalitet prøves med mini. Samlet varig testgrense er 10 kr og skal ikke nullstilles eller omgås.

**Faktisk kvalitet:** På `4f343b9` ble kapittel 4 levert etter to forfatter- og to kontrollkall, samlet 0,69564 kr. Hele kapittelet ble gjennomspilt i ekte autentisert Preview med feil/riktig svar, matematisk valg, oppfriskning og lagret historie. Tutor-evaluator regnet uavhengig 12, 18, 18, 8, 6 og 12. Kritikeren hadde likevel feilaktig godkjent tidligere gjenstand bare i uses-metadata, manglende fysisk geometriregel, «kort stolpe» i felles tekst for langt alternativ og Falcon uten sammenhengende landing/avgang. To like praktiske volumkasser er også et åpent variasjonsfunn. Matematisk korrekthet lukker ikke disse funnene.

Kontrollen krever nå eksakte sitater fra elevteksten for fysisk regel og tidligere gjenstands handling. Den binder mengdefelt, utelater intern purpose og krever sitatet i begge faktiske valgvarianter. Tutor-evaluator fant tre integrasjonsfeil i første sitatversjon og etterkontrollerte rettelsene i `4cd18c2`; ingen nye P1/P2 i dette avgrensede kodeomfanget. Sitatkontroll beviser tekstens tilstedeværelse, ikke hele betydningen. Dupliserte praktiske oppdrag vurderes fortsatt semantisk. Diagnostikk bevarer tidligere funn også når et senere provider-kall feiler (`ba60ab9`).

En ekte kapittel 5-prøve i `2e21a02` ble avvist før visning da siste kontrollkall ikke fullførte. Siste sitat-/integrasjonsrettelser har ingen ny godkjent ekte fortsettelse. Tidligere historie- og rendererfunn består. **PR 15 er fortsatt utkast og ikke klar for merge.** Ingen produksjonsendringer ble gjort.

**Verifisering:** 478 lokale enhetstester, typecheck/lint/formatering og [grønn CI for ba60ab9](https://github.com/sirhaugness/ki-techer/actions/runs/38810289157), inklusive full Supabase/Auth, bygg og tilgjengelighet. Dev-migrasjon og Preview-bygg er grønne. Tidligere i denne runden: 22 lokale browser-tester bestått / 2 Auth-tester hoppet over uten lokal Supabase, tre simuleringsfrø à 200 økter og 100/100 tilgjengelighet på åtte sider. Ordinære tester bruker mocks; disse er ikke bevis på modellkvalitet. Ingen fysisk iPad/Safari eller barnetest. Seneste Preview står i PR-en.

**Testregnskap og opprydding:** 2,99981825 kr av 10, med null uoppgjorte reservasjoner. Ett kontrollkall hadde ukjent tokenforbruk; 0,24177725 kr i reservasjonstak er beholdt. Hele runden brukte samme syntetiske husholdning uten nullstilling eller miljøøkning. Sluttregnskap/historie ligger i `/workspace/story-verification/cost-control/`. Syntetisk authbruker, husholdning, elev, sessions og refresh-tokens er slettet og null etterkontrollert. Eldre egne delinger er tilbakekalt; siste deling hadde én times gyldighet og er utløpt. Private lokale filer er borte i aktivt miljø etter omstart. Ingen nøkler eller miljøvariabler ble endret.

Thor ba om å slippe gjentatte bekreftelser. Dette er nå uttrykkelig registrert i AGENTS. Dialogene ved DELETE kom fra Supabase-verktøyets bekreftelseskrav; prosjektinstruksen kan ikke slå av plattformdialoger. Ingen slik bekreftelse gjenstår for utført opprydding.

**Hva Thor må gjøre:** Ingen oppsett eller godkjenning nå. Kostnadsrapporten kan leses; vent med merge av PR 15 til åpne forteller-/sceneproblemer er rettet og siste versjon har godkjent ekte fortsettelse. Denne PR-en er ikke i produksjon.

## 2026-10-16: spillrevisjon R1 — testbart kapittelfundament

Thor godkjente oppstart av den helhetlige revisjonen. PR 15 var deretter merget eksternt; denne leveransen er opprettet på egen branch `feat/chapter-foundation` fra oppdatert main `591e699`. Agenten utførte ingen merge eller produksjonsendring.

SPEC §15 presiserer den avtalte elevreisen og begrepene. GAME-REVISION.md kartlegger alle SPEC-delene, ansvar, observerbar verifisering og leveranse R1–R7. Eldre modell-/researchbeskrivelser som var i konflikt med faktisk kode er presisert; mål og implementeringsstatus er fortsatt separate.

Nytt additivt lag i `lib/chapters/` har versjonert kapittelpakke med variable oppdrags-/valg-/sluttnoder, sagafakta, oppgavevarianter, scenereferanser og lærertilstand. Det validerer nåbar/avsluttet graf, unike og gyldige referanser, motorreferert og matematisk verifisert oppgave, samt scenemengder fra samme gitte fakta. En separat serverprojeksjon utelater generatorparametre/fasit/seed/fremtidig slutt og tilbakemelding for riktig svar. Lærerkontekst krever faktisk gyldig rute og samsvarende historiske hendelser, og har eksplisitte typer for historie-/ord-/mattehjelp.

Uavhengig reviewer undersøkte koden og fant to P2: vilkårlige oppgaveparametre kunne avvike fra fasiten, og fremdrift kunne hoppe til et framtidig oppdrag. Begge er rettet med motorreferanser og ordnet rutekontroll, og etterkontrollert uten nye P1/P2 innen kontraktsomfanget. Reviewer kjørte selv 24/24 foundationtester. To ekstra regresjoner dekker framtidige ekstra valg og feil hendelsesrekkefølge.

Lokalt: full suite 502 tester / 36 filer bestått før de to siste rene testtilleggene; siste fokuserte sett 26/26, typecheck, lint, formatering og diffkontroll bestått. Testene er deterministiske kontrakttester uten KI-kall. CI/Preview-status føres på PR-en etter faktisk observasjon. Ingen ny elevflate eller modellgenerert historie er prøvd i dette steget; ingen kostnad på ekte KI, databaseendringer eller nye miljøvariabler.

R1 er foreløpig ikke importert av appens API, læringsøkt eller komponenter. Bildet Thor viste er derfor ikke rettet i elevflaten gjennom denne leveransen. Neste R2 skal gjøre fundamentet synlig som tre sammenhengende spillbare oppdrag med feil/hjelp/riktig, konkret konsekvens og gjenopptakelse. Modellen, worker, full faglig tilpasning og gammel datamigrering kommer i senere avtalte leveranser.

**Hva Thor må gjøre:** Ingen oppsett eller ny bekreftelse. Denne PR-en kan vurderes som fundament; den er ikke en ferdig spillrevisjon eller en påstand om at hele SPEC er oppfylt. Produksjon skal ikke endres før avtalt kvalitetskontroll.
