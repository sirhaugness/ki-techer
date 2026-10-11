# Leo-læreren

En rolig mattelærer for 4. trinn. Denne versjonen inneholder M1–M9: innlogging og Leo-lås, 35 ferdigheter, kontrollerte matteøkter, KI-lærer med profilminne, medaljong, tale og foreldredashbord med budsjett, eksport og sletting. Ekte KI-kvalitet og fysisk iPad-test må godkjennes før fast bruk; se fremdriften for hva som er faktisk verifisert.

- [Spesifikasjon](docs/SPEC.md)
- [Fremdrift og faktiske testresultater](docs/PROGRESS.md)
- [Oppsett, GitHub-hemmeligheter og Preview-test for nybegynnere](docs/DEPLOY.md)
- [Personvern](docs/PRIVACY.md)
- [iPad-testplan](docs/IPAD-TESTPLAN.md)
- [Tilgjengelighet](docs/ACCESSIBILITY.md)
- [Beslutninger](docs/DECISIONS.md)
- [Læreplan og kilder](docs/curriculum/mat01-06.md)

```sh
npm ci
npm run dev
npm run check
```

Kopier `.env.example` til `.env.local` og legg inn dev-verdiene for innlogging. Forsiden kan åpnes også før Supabase er konfigurert. `npm run simulate` kjører 200-økts simuleringer uten KI-kall. Full auth-e2e kjøres i CI mot lokal Supabase, og kan kjøres lokalt med Docker/Supabase CLI og `node --import tsx scripts/e2e-local.ts` etter `supabase start`.

Rotfilen `SPEC.md` er det opprinnelige opplastede dokumentet. `docs/SPEC.md` er arbeidskopien.
