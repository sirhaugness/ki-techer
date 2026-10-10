# Leo-læreren
Bygg en varm mattelærer for Leo på 4. trinn. Læring og forståelse skal veie tyngre enn underholdning. Arkitekturen skal kunne utvides til andre fag.

## Prinsipper
Modellen velger pedagogikk, mens koden husker og håndhever grenser. Fasit kommer fra kode eller verifisering, aldri fra KI alene. Hint håndheves på serveren. Mestring krever både data og vurdering. Barnesikkerhet og personvern kommer først. Alt brukervendt innhold er på bokmål. Fagnøytral arkitektur; ingen sporing.

## Struktur og konvensjoner
`app/`: Next.js App Router og server actions; `components/`: UI; `lib/engine/`: rene funksjoner uten I/O; `lib/db/` og `lib/auth/`: server-only database og autentisering; `supabase/migrations/`: append-only SQL; `tests/`: Vitest, PostgreSQL/RLS og Playwright; `docs/`: spesifikasjon og beslutninger.
TypeScript strict. Zod ved eksterne grenser. Hemmeligheter bare server-side. Harde pedagogiske regler ligger i motoren.

## Kommandoer
`npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, `npm run simulate` (fra M3). `eval:agent` kommer i M4 og skal da kreve eksplisitt konfigurerte modeller.

## Ferdigkriterium
Etter hver milepæl: kjør alle tilgjengelige tester, lint, typecheck og build, oppdater `docs/PROGRESS.md` med faktiske resultater og begrensninger, og commit før neste milepæl. Dokumenter rimelige valg i `docs/DECISIONS.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
