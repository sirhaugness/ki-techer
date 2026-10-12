# Fremdrift

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

Utført lokalt: 406 Vitest-tester bestått, inkludert hele SQL/RLS-historikken og ny migrasjon i PGlite. 15 Playwright-tester bestått med mocks; de to ekte Auth-testene kjøres separat mot lokal Supabase. Nye flyttester dekker mobil 390×844, nettbrett 768×1024 og PC 1440×1000, hjelp uten oppgavebytte/svartap, feil og riktig svar, neste oppgave, gjenlasting, ett aktivt eventyr og redusert bevegelse. Lint, typecheck, formatering, simulering og produksjonsbygg bestått. Ingen ekte KI-kall eller produksjonsendringer.

Supabase SSR-cookiefornyelse og varig lagring er kontrollert i installert SDK. Proxyen viderefører nå cachevern ved tokenfornyelse. Dev-økter har ingen `not_after`; globale hosted Auth-innstillinger kan ikke bekreftes fra den tilgjengelige connectoren. Nettleser-, tale- og enhetsbegrensninger samt full kravrapport finnes i [ADVENTURE-VERIFICATION.md](ADVENTURE-VERIFICATION.md). Lokal Supabase Auth med nettlesergjenåpning, faktisk refresh-tokenrotasjon, PIN og utlogging, samt Preview/CI, verifiseres videre før endelig overlevering.
