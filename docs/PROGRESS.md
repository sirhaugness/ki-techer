# Fremdrift

Grunnlaget er `docs/SPEC.md` (kopiert fra rotfilen fordi docs-filen var tom). Dato: 10. oktober 2026.

| Milepæl                            | Status                                                   |
| ---------------------------------- | -------------------------------------------------------- |
| M0 nødvendig prosjektoppsett       | Implementert og lokalt verifisert                        |
| M1 database, auth, elevprofil, PIN | Implementert; RLS/PIN lokalt og full Auth-e2e i CI grønn |
| M2 læreplan og generatorer         | Implementert og verifisert lokalt og i CI                |
| M3 læringsmotor og simulering      | Implementert og verifisert lokalt og i CI                |
| M4–M9                              | Ikke startet                                             |

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
