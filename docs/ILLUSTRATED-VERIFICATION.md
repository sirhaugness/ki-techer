# Verifisering av illustrert matteeventyr

**Historisk verifisering:** Resultatene og eventuelle «neste steg» nedenfor gjelder den oppgitte eldre versjonen. Gjeldende retning står i [SPEC](SPEC.md), nåstatus i [PROGRESS](PROGRESS.md). Ingen eldre genererings-/kritikerkrav er aktiv byggeordre.

14. oktober 2026. Arbeid på egen gren mot Preview.

## Hva den forrige flyten faktisk gjorde

`lib/learning/adventure.ts` laget seks fortellerhendelser, men `compileTask` gjorde aktivitetene til varianter av samme mengdetekst. `components/leo/experience.tsx` viste dem gjennom det samme `AnswerPanel`. `AdventureScene` viste et lite, statisk interessebilde. Et riktig svar oppdaterte tekst og dekorasjon, men ingen port, last, bro eller farkost. Rutevalget lagret en tekst og en beregnet kostnad uten at en senere tegnet hendelse endret seg. Den separate `profile/story.ts`-malen brukes i andre øktmodi; endringer bare der ville ikke løse den planlagte praksisflyten.

Ugyldige modellplaner eller modell-/modereringsfeil kunne gi et helt reservekapittel. Denne kodegrenen er bekreftet; hvor ofte ekte modeller ble avvist hos Leo tidligere, er ikke målt og påstås ikke.

## Kontrollerte grenser

| Grense                   | Observert kontroll                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modellplan → oppgaver    | Modellerstatning lager et eget Minecraft-kapittel med Alex, steiner og landsby. Samme scenekontrakt og mengdekompilering brukes. Ensartet modellplan og manipulerte bildemengder avvises.                                      |
| Pensum → variasjon       | Alle fem pensumvalg og seks forhåndsvalgte interesser gir minst tre ferdig kompilerte samhandlingsformer. Uttrykksbygging og illustrerte fortellingsvalg er prøvd som faktiske komponenthandlinger.                            |
| Svar → lærer → fremdrift | Felles vurdering av tall/uttrykk/fordeling. Kolon godtas ved uttrykksvalg. Riktig total med skjev fordeling venter på fordelingen, og læreren forklarer det samme. Gamle svar og oppgave-ID beholdes ved oppgradering.         |
| Regning → rutevalg       | Nettleseren velger rute, prøver feil restmengde, får hjelp uten tap, og velger riktig. Replay av samme handling gir ikke nytt forbruk.                                                                                         |
| Rute → senere hendelse   | BB-8s brikke vises og åpner senderrommet i et senere oppdrag; dinosaurfølgeren gir en senere redningshendelse. Valget huskes i kapittel 2.                                                                                     |
| Kapittel → fortsettelse  | Hele Star Wars- og dinosaurkapitler spilt gjennom i kjørende lokal app, seks oppdrag hver og overgang til neste. Oppfriskning, interessebytte og tilbakekomst er også prøvd.                                                   |
| Scene → bevegelse        | Chromium Web Animations API observerer `running` og økende avspillingstid for lys, last, port, bro og avreise. Video er tatt opp. Redusert bevegelse viser åpen port uten animasjon og beholder resultatet etter oppfriskning. |
| Server → lagring         | PostgreSQL/PGlite kjører eksisterende `commit_learning_turn` og sammenligner det faktisk lagrede kapittelet og evidensen med snapshot. Auth/RLS-revisjonsvern og atomisk rollback er dekket av eksisterende tester.            |
| Tilgjengelighet          | Lighthouse kontrollerer også en faktisk illustrert eventyrside, i tillegg til prosjektets øvrige sider. Resultater føres inn i PROGRESS.md etter kjøring.                                                                      |

## Visuelle bevis

Testene lagrer åpning, løst scene, senere konsekvens og kapittel 2 for begge interesser, pluss åpen port med redusert bevegelse. Reproduserbare filer ligger i `test-results/space-*.png`, `dinosaur-*.png` og `reduced-motion-open-gate.png`. `illustrated-flow.spec.ts` tar også opp video. Bildene er inspisert, og animasjonene er kontrollert under avspilling; stillbildene brukes ikke som eneste bevis på bevegelse. Kopier fra denne arbeidsøkten er bevart i `/workspace/leo-verification/`.

## Det som ikke er verifisert

Lokale spilltester bruker den isolerte testeleven og kontrollerte generatorer/reservekapitler. Modellkontrakten testes med modellerstatninger. Dette bekrefter ikke den ekte OpenAI-modellens fortellerkvalitet eller innlogget hosted spill. OpenAI-nøkkelen er bekreftet konfigurert som Secret for Preview i Vercel; den er ikke lest ut eller testet lokalt. Fysisk iPad/Safari og skjermleser er ikke prøvd. Reservehistorien for en helt ukjent interesse bruker et konkret verksted-/elveeventyr; selve interesseuniverset trenger en fungerende modellplan. Reservefortsettelser er forfatterlagde og har begrenset fortellingsbredde.

**Hva Thor må gjøre:** Prøv den innloggede Preview-lenken med ekte modell, ett helt kapittel og én egen interesse. Vurder om karakterer, dialog og handling passer interessen før eventuell merge til produksjon.

## Hosted Preview for kodecommit 3448195

Vercel bekrefter READY for `3448195153bfa40017af93ad3da701df7974a249`, gren `feat/illustrated-chapter-world`, prosjekt `ki-techer` i `team-thor1`. [Preview](https://ki-techer-44jbaktxt-team-thor1.vercel.app) er kontrollert gjennom Vercels autentiserte fetch: `/login` gir HTTP 200 med riktig norsk e-postskjema; `/leo` uten appinnlogging gir også innloggingen. Dette er en kontroll av bygg og tilgangsgrense, ikke et innlogget spill med ekte modell. [PR #10](https://github.com/sirhaugness/ki-techer/pull/10) er utkast. Ingen produksjonsendring.

[Kvalitet 38615071859](https://github.com/sirhaugness/ki-techer/actions/runs/38615071859) bekrefter grønn hovedjobb og grønn lokal Supabase/Auth-jobb for kodecommit `3448195`. [Dev-migrasjonsworkflow](https://github.com/sirhaugness/ki-techer/actions/runs/38615071850) er også grønn. Hosted innlogget OpenAI-spill er fortsatt ikke prøvd.
