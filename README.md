# Leo-læreren

Matematikk for Leo i 4. klasse: et begrenset bibliotek av forberedte, illustrerte interesseverdener og en levende KI-lærer som underviser og undersøker forståelse. Først bygger vi **Star Wars: Darth Vaders felle**.

**Status:** Den reviderte Star Wars-historien har 20 sammenhengende steg på `/leo/stjerneoppdrag`, med realistiske bilder, dialog med Kraften, samlet historietekst og automatisk neste etter lyssabelrespons. `/leo` har ett tydelig hovedvalg. [K2-verifiseringen](docs/K2-VERIFICATION.md) skiller lokal funksjon fra hosted/modellevaluering. K1 og oppryddingen i #24 er historiske leveranser. Ny kode leveres i egen PR; produksjon endres ikke her. Se [PROGRESS](docs/PROGRESS.md).

- [Kanonisk produktbeskrivelse](docs/SPEC.md)
- [Revidert historie med 20 steg](docs/chapters/star-wars-v2.md)
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
