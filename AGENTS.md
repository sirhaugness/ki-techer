# Leo-læreren

Leo-læreren skal hjelpe en niåring med å mestre matematikk på 4. trinn etter LK20.
En KI-lærer velger pedagogiske aktiviteter; en deterministisk motor kontrollerer svar og mestring.
Leo skal delta i et sammenhengende eventyr som er lett å bruke, gir lyst til å lære og krever lite arbeid fra forelder.

## Leserekkefølge og ansvar

- Ved videreføring av spillrevisjonen: start med «Start her» i [docs/PROGRESS.md](docs/PROGRESS.md), deretter [docs/GAME-REVISION.md](docs/GAME-REVISION.md) og SPEC §15. Kontroller levende branch-/PR-status og åpne porter før neste leveranse; ikke bygg ferdige leveranser på nytt fra en eldre main-kopi.
- Brukerens siste avtalte bestilling styrer oppdraget. [docs/SPEC.md](docs/SPEC.md) er kanonisk produktspesifikasjon; rotfilen SPEC.md peker dit.
- Les relevant kode og [docs/PROGRESS.md](docs/PROGRESS.md) for dagens implementering og observerte resultater. [docs/DECISIONS.md](docs/DECISIONS.md) er datert beslutningshistorikk; eldre begrensninger skal ikke overstyre nyere krav.
- Skill vedtatt krav, implementert kode og faktisk verifisert atferd. En dokumentasjons- eller promptendring betyr ikke at alle beskrevne funksjoner er bygget.
- Codex-agentteamet utvikler og vurderer appen. KI-læreren kjører i appen med egne prompter, verktøy og kodegrenser. Rollefilene er arbeidsinstruksjoner for Codex, ikke lærerens systemprompt.
- Undersøk relevante runtime-instruksjoner i `lib/agent/prompts/`, `lib/learning/help.ts`, `lib/learning/adventure.ts` og `lib/ai/` når lærer eller fortelling endres. Krav i Markdown når ikke modellen automatisk.

## Prinsipper

1. Modellen bestemmer pedagogikken; koden husker, verifiserer og håndhever grenser.
2. Fasit kommer aldri fra KI alene: generator eller uavhengig kodekontroll kreves. Matematisk korrekthet erstatter ikke kontroll av om teksten, scenen og oppgaven betyr det samme.
3. Tilpasset veiledning gis ett håndterbart steg om gangen. Hintnivå, hjelperegistrering og selvstendig mestring håndheves i kode.
4. Mestring krever både vurdering og data; bare motoren tildeler medaljongdeler.
5. Barnesikkerhet, minst mulig persondata, moderering og foreldreinnsyn først.
6. Engasjement og faktisk læring er hovedmål. Barnet skal forstå målet, oppleve meningsfulle handlinger og kunne ta pause eller avslutte uten press.
7. Elevtekst er kort norsk bokmål for en niåring. Foreldretekst er enkelt bokmål med forklaring av tall og begrensninger.
8. Arkitekturen er fagnøytral og kan utvides med flere ferdighetsgrafer.

## Eventyr og spillopplevelse

- Hvert oppdrag er én situasjon: tidligere hendelse → matematisk utfordring → Leos handling → støtte ved feil → synlig konsekvens → videre historie. Tekst, bilde, tall og interaksjon skal beskrive samme handling.
- Nye kapitler bygger på en overordnet historie og tidligere hendelser, valg, figurer, relasjoner, gjenstander, steder og uløste mål. Historikken skal påvirke fortsettelsen konkret.
- Eksempler er illustrasjoner, ikke obligatoriske åpninger, figurer eller oppdragsrekkefølger. Ingen fast «laste energi og ta av»-åpning.
- Variasjon vurderes i praktisk formål, hindring, matematisk modell og elevhandling. Nye tall, navn, bilder eller svarfelt alene er ikke tilstrekkelig.
- Scenen gjør problemet forståelig før oppdraget, reagerer under arbeidet og viser støtte ved feil og konsekvens ved riktig svar. Feil straffes ikke. Redusert bevegelse skal bevare forståelig respons.
- Læreren bruker samme autoritative svarvurdering som fremdriften, hjelper i den aktuelle situasjonen og beholder oppgaven mens eleven spør.
- Research betyr faktisk kildeinnhenting og kildehenvisninger. Modellens forkunnskaper alene er ikke research. Ikke påstå at appen har researchverktøy uten å kontrollere implementasjonen.
- Dagens faste kapittelskjema, tallfrie fortellerfelter og SVG-bibliotek er implementeringsgrenser, ikke varige produktkrav. Endre skjema, validering og rendering samlet når en oppgave skal utvide dem; en prompt må passe kodens faktiske kontrakt.

## Struktur og kommandoer

- `app/`: App Router, `leo/`, `forelder/`, innlogging og API-ruter.
- `components/leo/`, `components/parent/`, `components/ui/`: elevflate, foreldreflate og UI.
- `lib/engine/`: ren motor uten I/O; ferdigheter, mestring, kandidater, hint, økt, medaljong og svar-/scenekontroll.
- `lib/agent/`: lærerens agentløkke, verktøy, kontekst, guards og versjonerte prompter.
- `lib/chapters/`: nytt additivt kapittelfundament; se SPEC §15 og docs/GAME-REVISION.md for faktisk implementeringsstatus.
- `lib/learning/`: øktintegrasjon, lærerhjelp, kapitler og lagring. `lib/ai/`, `lib/db/`, `lib/auth/`, `lib/voice/`: serverintegrasjoner.
- `supabase/migrations/`: append-only migrasjoner. `tests/`: Vitest og `tests/e2e/`: Playwright.
- `docs/agent-team/`: Codex-roller og arbeidsflyt. `docs/`: spesifikasjon, beslutninger, fremdrift, personvern, deploy og testplaner.
- `npm run dev`: utvikling. `npm run build` / `npm run start`: bygg / kjør bygg.
- `npm run lint`, `typecheck`, `format:check`, `test`, `test:e2e`: statiske kontroller og tester.
- `npm run simulate`: motorens simulering uten eksterne tjenester. `npm run check`: full lokal kvalitetspakke, også tilgjengelighet.
- `npm run eval:agent`: separat ekte modellevaluering utenfor CI. Se SPEC for skriptets begrensede dekning.

## Konvensjoner og lærerens kontrakter

TypeScript strict og Zod på API-grenser, verktøykall og KI-svar.
Motoren har ingen I/O. Harde regler håndheves i kode, ikke bare i prompter.
Ingen hemmeligheter i klientkode, git, rapporter eller underagentkontekst. Bruk variablene fra `.env.example`.

Vanlige kvalitetstester bruker OpenAI-/Supabase-mocks; full Auth-e2e kan bruke lokal Supabase med testnøkler. Migrasjonsworkflow mot dev/prod er separat.
Vanlige tester og evalueringsskript bruker mocks som standard. Ekte KI-testing bruker billigste egnede modell (gpt-5-nano for generell agent-eval; gpt-5-mini når det er modellen som fortellingskontrollen skal verifisere), syntetiske data og en varig, samlet ramme på maksimalt 10 kroner for testarbeidet. Spør Thor FØR rammen overskrides; tidligere godkjenninger av30/50 kroner gjelder bare avsluttede runder. Ikke nullstill regnskap, bytt konto eller øk konfigurasjon for å omgå rammen. Ekte modellkvalitet kan ikke påstås bevist med mocks. PR forblir utkast til fortellingskontrollen og aktuelle åpne kvalitetsfunn er fullført og verifisert.

Lærerprompten må skille tur med verktøy fra hjelp uten verktøy. Ikke krev nye oppgaver i en hjelpetur.
Tall-/hintinstruksjoner må passe aktuell guard: vanlig dialog før nivå 4 er tallfri; særskilt hjelp kan bare bruke tillatte oppgavetall uten å røpe fasit.
Ikke svekk fasitvern for å få en prompt til å passere. Bevar eldre promptversjoner ved ny lærerprompt, oppdater aktive referanser og versjonsmerking sammen.

`lib/auth/` og `lib/db/` er server-only. Bruk `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` og `SUPABASE_SECRET_KEY`; `APP_URL` er valgfri.
Innlogging og callback deler `authOrigin`: ekstern vert før innebygd `VERCEL_URL`; ikke prioriter Nexts interne localhost-adresse.
PostgreSQL/RLS testes med PGlite, full Auth-e2e mot lokal Supabase i CI.

## Codex-agentteam og arbeidsflyt

Bruk [arbeidsflyten](docs/agent-team/workflow.md). Hovedagenten eier oppgaven, velger relevante spesialister og samler funn. Les og gi aktuell rollefil til faktisk underagent: [designer](docs/agent-team/designer.md), [tutor-evaluator](docs/agent-team/tutor-evaluator.md) og [reviewer](docs/agent-team/reviewer.md).
Spesialistene undersøker og rapporterer; hovedagenten endrer filer som standard. Høyst tre samtidige underagenter innenfor miljøets grenser. Samordne tester som deler app, konto, port eller database.
Kontroller start-/meldings-/vente-verktøy i chatten. Rollefiler registrerer ikke native agenttyper. Manglende verktøy eller mislykket oppstart skal rapporteres; ikke etterlign et team.
Små endringer trenger ikke hele teamet. Rene undersøkelser endrer ikke filer, PROGRESS, branch eller PR uten endringsmandat.

## Ferdigkriterier og evidens

- Avtalbare krav konkretiseres til observerbare kriterier før implementering: hva Leo gjør, hvilken respons han får og hva som huskes videre. Gjør rimelige valg selv innenfor bestillingen.
- Velg relevante kontroller etter endringen. Dokumentasjonsendringer trenger konsistens-, lenke-, kommando- og formateringskontroll; runtime-/promptendringer trenger relevante tester og statiske sjekker. Full kvalitetspakke brukes ved vesentlige appendringer.
- Ved spillendringer prøves en hel kjede: forstå oppdraget → feil → hjelp → riktig → synlig konsekvens → lagret fortsettelse. Skjermbilder alene dokumenterer ikke bevegelse; vurder opptak eller observer animasjonen.
- Rapporter teknisk funksjon, ekte modellkvalitet og spillopplevelse separat, med undersøkt versjon, metode og responskilde. Skill rå modellforsøk fra respons etter guards, direkte kodebestemte svar, mocks og fallback.
- Grønn CI, antall tester, lagret historikk eller et grønt bygg beviser ikke fortellerkvalitet, engasjement eller observerte barnereaksjoner.
- Test relevant Preview-flyt før runtime-endringer omtales som fullt verifisert. Ved manglende tilgang: fullfør tilgjengelige kontroller og oppgi konkrete gjenstående steg; ikke bruk en eldre Preview som bevis.
- Ved endringsoppgaver: oppdater PROGRESS med observert arbeid/verifisering og «Hva Thor må gjøre», dokumenter beslutninger, commit og opprett/viderefør PR. Ikke hev at CI eller tjenester er testet uten observerte resultater.
- Nye idéer utenfor bestillingen samles i BACKLOG.

## Tilgang og produksjonsgrenser

- PR tester mot leo-dev / Vercel Preview. Merge til main påvirker produksjon. Ikke merge eller endre leo-prod / Production-variabler uten Thors tillatelse.
- Utfør nødvendig og autorisert Preview-/dev-oppsett selv gjennom tilgjengelige connectorer/CLI og bekreft resultatet. Spør bare om manglende tilgang eller handlinger som trenger særskilt godkjenning.
- Thor har 16. oktober 2026 uttrykkelig godkjent midlertidig syntetisk testkonto med husholdning, elev og enhet i leo-dev, inkludert sletting og etterkontroll. Bruk denne godkjenningen til avtalt Preview-/dev-verifisering; ikke spør igjen om samme testtilgang. Thor ønsker færrest mulig godkjenningsspørsmål. Produksjonsgrensen og samlet KI-testramme gjelder fortsatt.
- Thor har 14. oktober 2026 godkjent fortsatt bruk av eksisterende `OPENAI_API_KEY` i Vercel Preview. Ikke spør igjen om eksisterende nøkkel kontra ny nøkkel. Godkjenningen omfatter ikke nye nøkler, endring av hemmeligheter eller produksjonsendringer.

## Driftsoppsett og kjente fallgruver

- Produksjon: https://ki-techer.vercel.app (team `team-thor1`, prosjekt `ki-techer`).
- Supabase: leo-dev (Preview) og leo-prod (Production, ref `cijdabagprozgjaxusip`). URL og publishable key skal komme fra samme prosjekt.
- Supabase-URL slutter på `.supabase.co`. Site URL har `https://`; prod-callback er `https://ki-techer.vercel.app/auth/callback`. Preview dekkes av `https://*-team-thor1.vercel.app/**`.
- `NEXT_PUBLIC_*` er Config. `SUPABASE_SECRET_KEY` og `OPENAI_API_KEY` er Secret; nye sensitive variabler må også behandles som hemmeligheter.
- Migrasjoner: GitHub Actions `supabase-migrations.yml`, PR → leo-dev, merge → leo-prod.
- E-postlenke har lav sendegrense og må åpnes i samme nettleser som bestillingen.
- Endrede Vercel-variabler krever redeploy. Kontroller nettverkstilgang i det aktuelle skymiljøet fremfor å anta at alle tjenester kan nås.

## Om Thor og samarbeid

Thor er nybegynner innen utvikling. Forklar enkelt på norsk med hva som er endret, hvorfor, hva som faktisk er kontrollert og eventuelle begrensninger.
Thor ønsker ikke gjentatte bekreftelser for allerede godkjent arbeid. Fortsett innenfor avtalt mandat uten å spørre på nytt. Unngå unødvendige handlinger som utløser nye verktøydialoger. Plattformens egne bekreftelseskrav kan ikke slås av eller omgås; forklar kilden dersom en slik dialog faktisk blokkerer nødvendig arbeid. Dette endrer ikke den avtalte grensen på 10 kroner for ekte KI-testing eller kravet om tillatelse til produksjonsendringer.
Når Thor ber om undersøkelse uten endringer: svar, ikke endre filer.
Avslutt alltid med «Neste steg for deg:» og en kort, konkret sjekkliste.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
