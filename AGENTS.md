# Leo-læreren

Leo-læreren skal hjelpe en niåring med å mestre matematikk på 4. trinn etter LK20.
En KI-lærer velger pedagogiske aktiviteter, mens en deterministisk motor kontrollerer svar og mestring.
Løsningen skal være trygg, lett å bruke og kreve lite arbeid fra forelder.

## Prinsipper

1. Modellen bestemmer pedagogikken; koden husker, verifiserer og håndhever grenser.
2. Fasit kommer aldri fra KI alene: generator eller uavhengig kodekontroll kreves.
3. Sokratisk veiledning og tillatt hint-nivå håndheves i kode.
4. Mestring krever både vurdering og data; motoren tildeler medaljongdeler.
5. Barnesikkerhet, minst mulig persondata, moderering og foreldreinnsyn først.
6. Faktisk læring veier tyngre enn moro og engasjement.
7. All brukertekst er norsk bokmål, kort og forståelig for en niåring.
8. Arkitekturen er fagnøytral og kan utvides med flere ferdighetsgrafer.

## Struktur

- `app/`: App Router; senere `(leo)/`, `(forelder)/` og `api/`.
- `components/ui/`: shadcn/ui-komponenter.
- `lib/engine/`: ren motor uten I/O; senere ferdigheter, mastery, scheduler,
  candidates, hints, bandit, session, medallion, misconceptions og validate.
- `lib/agent/`: agent-løkke, verktøy, kontekst, guards og versjonerte prompter.
- `lib/ai/`, `lib/db/`, `lib/voice/`: serverintegrasjoner i senere milepæler.
- `supabase/migrations/`: SQL og RLS fra M1.
- `scripts/`: simulering og agent-evaluering fra M3/M4.
- `tests/`: Vitest, mocks og Playwright i `e2e/`.
- `docs/`: SPEC, DECISIONS, PROGRESS, curriculum; senere PRIVACY og DEPLOY.

## Kommandoer

- `npm run dev`: lokal utvikling.
- `npm run lint`, `npm run typecheck`, `npm run format:check`: statiske sjekker.
- `npm run test`: Vitest med mocks; `npm run test:e2e`: lokal Playwright.
- `npm run build`: produksjonsbygg; `npm run start`: kjør bygget.
- `npm run simulate`: innføres i M3, uten eksterne tjenester.
- `npm run eval:agent`: innføres i M4; eksplisitt ekte-modellevaluering utenfor CI.

## Konvensjoner

TypeScript strict. Zod på API-grenser, verktøykall og KI-svar når disse innføres.
`lib/engine` har ingen I/O; harde regler hører hjemme i motoren.
Ingen hemmeligheter i klientkode eller git. Bruk nøyaktige variabler fra `.env.example`.
Test Supabase og OpenAI med mocks, aldri ekte nøkler eller eksterne tjenester i CI.
Les `docs/SPEC.md` nøye og bygg én milepæl av gangen. Dokumenter rimelige valg i DECISIONS.

## Ferdigkriterier

Relevante tester, lint, typecheck, formatering og build er grønne.
Oppdater `docs/PROGRESS.md` med utført arbeid og verifisering, og commit med beskrivende melding.
Ikke hev at GitHub CI eller ekte tjenester er verifisert uten å ha sett resultatet.
