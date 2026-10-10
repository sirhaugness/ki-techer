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
