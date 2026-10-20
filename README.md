# Leo-læreren

Matematikk for Leo i 4. klasse: et begrenset bibliotek av forberedte, illustrerte interesseverdener og en levende KI-lærer som underviser og undersøker forståelse. Først bygger vi **Star Wars: Darth Vaders felle**.

**Status:** Retningen og alle 20 hovedoppgavene er beskrevet i prosjektfilene. Den nye kapittelopplevelsen er ennå ikke bygget. Produksjon kjører fortsatt fri kapittelhistorie fra PR #21; den skal senere kunne erstattes. Se [PROGRESS](docs/PROGRESS.md) for kontrollert versjon og begrensninger.

- [Kanonisk produktbeskrivelse](docs/SPEC.md)
- [Hele kapittelplanen med 20 oppgaver](docs/chapters/star-wars-vaders-felle.md)
- [Pedagogikk og læreplankoblinger](docs/curriculum/chapter-pedagogy.md)
- [Inaktivt lærerutkast og konkrete kodegrenser](docs/TUTOR-DRAFT.md)
- [Kort byggeplan](docs/GAME-REVISION.md)
- [Fremdrift](docs/PROGRESS.md) og [beslutninger](docs/DECISIONS.md)
- [Oppsett og deploy](docs/DEPLOY.md), [personvern](docs/PRIVACY.md), [tilgjengelighet](docs/ACCESSIBILITY.md) og [iPad-prøving](docs/IPAD-TESTPLAN.md)
- [Utviklingsroller og arbeidsflyt](docs/agent-team/workflow.md)

Eksisterende kode har elevprofil, læringsmotor, lagring, foreldredashbord, tale og kostnadsvern. Disse skal gjenbrukes der de passer. Historiske testresultater i PROGRESS gjelder oppgitte versjoner, ikke den planlagte Star Wars-opplevelsen.

```sh
npm ci
npm run dev
```

Kopier `.env.example` til `.env.local` og sett dev-verdier etter oppsettsveiledningen. Forsiden kan åpnes uten konfigurert innlogging. `npm run simulate` kjører motoren uten KI-kall. `npm run check` kjører full lokal kvalitetspakke; autentisering krever lokal test-Supabase for full Auth-e2e. Dokumentasjonsarbeid bruker målrettet format-, lenke- og konsistenskontroll.
