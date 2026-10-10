# Leo-læreren

En matteapp for Leo, bygget milepæl for milepæl. M0 gir prosjektoppsett og en
startside. Innlogging og øving er ikke bygget ennå.

## Start på din maskin

1. Installer Node.js 24.15 eller nyere (Node.js 22.22.2 støttes også).
2. Åpne terminalen i prosjektmappen og kjør `npm ci`.
3. Kjør `npm run dev`.
4. Åpne http://localhost:3000 i nettleseren.

M0 trenger ingen API-nøkler. Når senere milepæler tar i bruk Supabase og OpenAI,
kopier `.env.example` til `.env.local` og fyll inn verdiene der. `.env.local` er
utelatt fra git. Del aldri hemmelige nøkler. Modellforslagene er kommentert i
`.env.example`; tilgjengelighet og kvalitet vurderes før ekte bruk.

## Sjekk prosjektet

```sh
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Installasjon av pakker og nettleser trenger internett. Selve testene bruker bare
lokale mocks og lokal app, og trenger ingen Supabase-/OpenAI-tilgang eller nøkler.
GitHub Actions kjører disse sjekkene automatisk ved push og pull request.

Les `docs/SPEC.md` for hele planen, `docs/PROGRESS.md` for status og
`docs/DECISIONS.md` for valgene underveis. Læreplangrunnlaget samles i
`docs/curriculum/` fra M2.
