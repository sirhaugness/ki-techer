# Fremdrift

Grunnlaget er `docs/SPEC.md` (kopiert fra rotfilen fordi docs-filen var tom). Dato: 10. oktober 2026.

| Milepæl | Status |
|---|---|
| M0 nødvendig prosjektoppsett | Implementert og lokalt verifisert |
| M1 database, auth, elevprofil, PIN | Implementert; lokal RLS/PIN-test grønn, full Auth-e2e avventer CI |
| M2 læreplan og generatorer | Implementert og lokalt verifisert |
| M3 læringsmotor og simulering | Ikke startet |
| M4–M9 | Ikke startet |

## M1 — før oppstart av M2
Laget Next.js/TS strict/Tailwind/shadcn-grunnlag, Vitest, Playwright, CI, alle datatabeller med RLS og krysshusholdnings-FK, Supabase magisk lenke/SSR, atomisk husholdningsopprettelse, elevprofil, serverlagret Leo-lås, scrypt-PIN og 5-forsøks sperre. Migrasjonsworkflow: PR til main eller leo-dev → Supabase leo-dev; push/merge til main → leo-prod. Manglende dev-hemmelighet kan aldri føre til valg av prod-hemmelighet.

Kjørt: `npm run lint`, `npm run typecheck`, `npm test` (8 tester grønne, inkludert 7 PostgreSQL/RLS-tester), `npm run test:e2e` (1 grønn nettlesertest, 1 eksplisitt hoppet over), `npm run build` (grønn). Nettlesertesten brukte systemets Chromium fordi Playwrights nedlastingsdomene er blokkert.

Begrensning: lokal Supabase-stack kunne ikke startes fordi `public.ecr.aws` er blokkert av skymiljøets nettverkspolicy. Full magisk-lenke/profil/lås/opplås-e2e er skrevet og kjøres i separat GitHub CI-jobb mot lokal Supabase; den er ikke lokalt verifisert. Ingen dev/prod-database er migrert fra dette miljøet. Ingen KI-kall. Implementasjonen er klar til CI/Preview-verifisering; det står ikke at full M1-aksept allerede har passert.

## M2 — før oppstart av M3
35 ferdigheter med DAG (7 i Basecamp og 7 per medaljongdel), dekning av alle 10 kompetansemål på 4. trinn, kildekontroll mot Udir, SQL-snapshot med referansedata, 35 generatorer med 5 nivåer, fasitkontroll og misoppfatningskatalog. Geometri, volum, mønstre og algoritmer har egne oppgaveformer. Ingen fritekstforklaring godkjennes som forståelse=2 fra strategiflervalg.

Kjørt: lint, typecheck, `npm test` (186 tester grønne; 175 000 genererte oppgaver med uavhengig oracle), Playwright (1 grønn / 1 lokal-Supabase-test hoppet over av samme miljøbegrensning som M1), produksjonsbuild grønn. Alle SQL-migrasjoner er kjørt i RLS-testdatabasen. RLS fra M1 er fortsatt grønn.
