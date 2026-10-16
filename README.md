# Leo-læreren

En rolig mattelærer for 4. trinn. Denne versjonen inneholder M1–M9: innlogging og Leo-lås, 35 ferdigheter, kontrollerte matteøkter, KI-lærer med profilminne, medaljong, tale og foreldredashbord med budsjett, eksport og sletting. Ekte KI-kvalitet og fysisk iPad-test må godkjennes før fast bruk; se fremdriften for hva som er faktisk verifisert.

**Fortsette spillrevisjonen i en ny samtale?** Begynn med [Start her i PROGRESS](docs/PROGRESS.md#start-her-aktiv-spillrevisjon-oppdatert-16-oktober-2026), deretter [kravkart/PR-rekkefølge](docs/GAME-REVISION.md) og SPEC §15. R2 ligger i [utkast-PR #17](https://github.com/sirhaugness/ki-techer/pull/17), branch `feat/chapter-player`; ikke start fra en eldre main-kopi uten å hente riktig branch. [R2-verifiseringen](docs/R2-VERIFICATION.md) beskriver det ferdige lokale snittet og den åpne innloggede Preview-porten. Neste nye leveranse er R3 etter at denne porten er lukket.

- [Spesifikasjon](docs/SPEC.md)
- [Fremdrift og faktiske testresultater](docs/PROGRESS.md)
- [Oppsett, GitHub-hemmeligheter og Preview-test for nybegynnere](docs/DEPLOY.md)
- [Personvern](docs/PRIVACY.md)
- [iPad-testplan](docs/IPAD-TESTPLAN.md)
- [Tilgjengelighet](docs/ACCESSIBILITY.md)
- [Beslutninger](docs/DECISIONS.md)
- [Codex-agentteamets roller og arbeidsflyt](docs/agent-team/workflow.md)
- [Læreplan og kilder](docs/curriculum/mat01-06.md)

```sh
npm ci
npm run dev
npm run check
```

Kopier `.env.example` til `.env.local` og legg inn dev-verdiene for innlogging. Forsiden kan åpnes også før Supabase er konfigurert. `npm run simulate` kjører 200-økts simuleringer uten KI-kall. Full auth-e2e kjøres i CI mot lokal Supabase, og kan kjøres lokalt med Docker/Supabase CLI og `node --import tsx scripts/e2e-local.ts` etter `supabase start`.

`docs/SPEC.md` er kanonisk produktspesifikasjon. Rotfilen `SPEC.md` peker dit for å unngå motstridende kopier. Krav, implementering og observerte resultater er merket separat; se særlig eventyrkravene i seksjon 14.
