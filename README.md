# Leo-læreren

Matematikk for Leo i 4. klasse: et begrenset bibliotek av forberedte, illustrerte interesseverdener og en levende KI-lærer som underviser og undersøker forståelse. Først bygger vi **Star Wars: Darth Vaders felle**.

**Status:** Alle 20 hovedoppgaver er planlagt. K1 er merget i #23. Elevforsiden `/leo` får én tydelig Star Wars-inngang, med lagret fortsettelse til tre utdrag på `/leo/stjerneoppdrag`: divisjon, geometri og forståelsessamtale. [K1-verifiseringen](docs/K1-VERIFICATION.md) skiller lokale tester fra gjenstående hosted/modellevaluering. K1 er observert READY i produksjon på e9323f2. Oppryddingen i elevforsiden leveres i PR #24; merge til main og faktisk utrullet versjon kontrolleres hver for seg. Se [PROGRESS](docs/PROGRESS.md) for kontrollert versjon og begrensninger.

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
