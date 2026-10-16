# R2: første spillbare kapittelsnitt

16. oktober 2026. Avgrensning: [GAME-REVISION R2](GAME-REVISION.md#pr-rekkefølge-og-porter), [SPEC §15](SPEC.md#15-avtalt-spillrevisjon-16-oktober-2026). Branch `feat/chapter-player` fra R1 `9089172`; [utkast-PR #17](https://github.com/sirhaugness/ki-techer/pull/17) har base `feat/chapter-foundation`. Runtime `4ae1549`, siste scenearia-/Auth-testrettelse `5710f6b`. Ingen merge eller produksjonsendring.

## Innhold og ferdigkriterier

«Lys over Tidevannsvika» er et helt, **håndskrevet prøvekapittel** i R1-format, med tre oppdrag og en avslutning. Lengden er en kvalitetsprøve, ikke en generell kapittelmal.

| Oppdrag      | Hvorfor regningen trengs                                             | Kontrollert matematikk                   | Synlig konsekvens                                           |
| ------------ | -------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| Tenn leia    | Båten venter utenfor grunna og trenger lys for å finne trygg lei.    | 3 lykter × 4 lyssteiner = 12             | Lyktene tennes; båten med Mira flytter seg til brygga.      |
| Landgangen   | Mira kan ikke bære postsekken i land før tomme plankeplasser fylles. | 9 plankeplasser − 3 eksisterende = 6 nye | Landgangen blir hel; Mira står på øya.                      |
| Invitasjoner | Hver postkasse skal få like mange invitasjoner til øyas båtfest.     | 12 invitasjoner / 3 postkasser = 4 hver  | Sekken tømmes; kassene er fylt; Mira seiler videre i båten. |

Scenens tellbare arbeidsobjekter og oppgaveteksten bruker R1-projeksjonens gitte mengder. Motorens svarvurdering kjører server-side. Bare riktig svar åpner oppdragets konsekvens og neste steg. Hele historien og alle visuelle ressurser finnes i kode før spillstart; ingen nettbasert medieproduksjon eller vilkårlig generert SVG/JavaScript.

## Lagring og tilgang

Bare prøvefremdrift lagres i `localStorage`, separat per elev, innholdsversjon og nettleser. Den inneholder innsendte svar, gjeldende utkast, sist vurderte utkast, hjelpevalg, hintnivå og avgrenset antall feil. Hver gjenopptakelse kontrollerer alle tidligere svar på nytt på serveren og gjenoppbygger faktisk historie i riktig rekkefølge. Løst konsekvens bevares til eleven velger å gå videre. Ugyldig lagringsformat gir en eksplisitt feil og valg om omstart. Blokkert lagring meldes; eleven kan fortsette mens siden holdes åpen.

Dette er ikke autoritativ eller manipulasjonssikker læringsprogresjon. Andre enheter, samtidige faner, foreldres eksport/sletting av denne nettleserlagringen og overgang fra gamle kapitler inngår ikke i R2. Ingen læringsøkt, mestring, medaljong, profilobservasjon eller KI-kostnad skrives. R3/R4/R6 må håndtere varig lagring, versjonering, atomisk progresjon og personvern samlet. R1s generatorversjon er fortsatt ikke frosset; prøveversjonen må endres om generator eller prøveinnhold endres.

Siden og hver server action gjenbruker eksisterende `leoAccess`: verifisert innlogging, låst Leo-enhet, riktig elev/husholdning og kontroll av pågående datasletting. Den eksisterende lokale testfixturen kan bare brukes uten produksjonsmodus og uten Supabase-oppsett. Ingen ny innloggingsomgåelse i Preview.

## Observerte kontroller

- Første hele lokale nettleserkjede er bestått: åpning → 11 feil → historieforklaring → matematisk hint → reload → endret utkast og hjelp/reload uten gammel feilstatus → 12 riktig → observert båtbevegelse → landgang → pause/hjem/gjenopptak → 6 riktig → 5/3/4 feilfordeling → 4/4/4 → reload → riktig → avreise → avslutning/reload. Ingen nettleserfeil i dette forløpet.
- Egen nettlesertest med redusert bevegelse, tastatursvar, 768×1024, 1024×768 og 390×844, 48px knapper, skadet lagring og blokkert skriving er bestått. Skjermbilder dokumenterer tilstander; opptak og transformmåling dokumenterer bevegelse.
- `npm run check` på `4ae1549` er bestått: lint, typecheck, formatering, 515 Vitest-tester, simulering, 24 browser-tester / 2 lokale Auth-tester hoppet over, produksjonsbygg og Lighthouse over 90 på alle ni sider. Prøvesiden hadde først 96 med ugyldig aria-label på generiske spans. Rettet til beskrivende bilde-/grupperoller. Deretter: 11/11 fokuserte enhetstester, typecheck/lint, de to R2-browser-testene og ny Lighthouse-kjøring med **100/100 på alle ni sider**. Dette siste er arbeidskopien som ble `5710f6b`.
- [CI 38943683179](https://github.com/sirhaugness/ki-techer/actions/runs/38943683179) for `4ae1549` er observert grønn, inklusive isolert Supabase/Auth. `5710f6b` utvider `parent-flow.spec.ts` med den nye siden: ekte lokal Auth/RLS → Leo-lås → feil → hint → riktig → reload → vanlig kartlegging. Resultatet for denne utvidelsen skal kontrolleres på siste CI, ikke arves fra den eldre kjøringen.
- Bevarte bilder, opptak og opphavsbeskrivelse: [artefaktmanifest](evidence/r2/README.md). Alt er fra lokal syntetisk prøve, uten innloggingshemmeligheter.

### Uavhengige vurderinger

Faktiske underagenter `/root/designer`, `/root/tutor_evaluator` og `/root/reviewer` leste sine rollefiler, undersøkte arbeidskopien og rapporterte uten å endre prosjektet. Hovedagenten gjorde rettelsene og samordnet nettlesertestene.

| Funn                                                       | Bevis og tiltak                                                                                          | Etterkontroll                                                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| P2: strandet båt og ubegrunnet planketall i første konsept | Båten venter nå utenfor grunna; landgangen har samme gitte total og eksisterende planker som spørsmålet. | Tutor regnet alle tre svar uavhengig og vurderte faktisk scene/spørsmål.                                         |
| P2: Mira på feil sted ved venting/avreise                  | Mira tegnes nå inne i båtgruppen under venting, ankomst og avreise; på land etter landgangen.            | Tutor bekreftet rettelsen i kode og faktiske bilder/opptaksuttrekk. Nettlesertesten sjekker hvem som er ombord.  |
| P2: svarfelt under første skjerm ved 1024×768              | Kortere oversikt, mindre sidemargin og fjernet konkurrerende banner.                                     | Designer etterkontrollerte nytt bilde: spørsmål, arbeidssted, lærer og svarfelt samtidig, svarfelt ca. y703–758. |
| P3: gammel feilrespons etter redigering og hjelp/reload    | `lastChecked` knytter responsen til det faktisk vurderte utkastet. Forsøk/hint bevares.                  | Reviewer etterkontrollerte rettelsen og kjørte 11/11 prøvetester; nettleserregresjonen er bestått.               |
| P3: dekorativ SVG-tekst skalert under 20px                 | Den dekorative stedslabelen er fjernet; nødvendig tekst er vanlig HTML.                                  | Rettelsen er kontrollert i kode og siste bevarte bilder.                                                         |
| P3: ugyldig aria-label på generiske scene-spans            | Oppsummerte mengder har bilde-/grupperoller; dekorative punkter er skjult for skjermleser.               | Ny Lighthouse: 100/100 på spilleren og alle åtte øvrige sider.                                                   |

## Hva dette beviser

**Teknisk funksjon:** et isolert R1-basert kapittel kan gjennomspilles og gjenopptas. **Modellkvalitet:** ikke prøvd; historie er håndskrevet, hjelp og tilbakemelding direkte kodebestemt, lokal Auth er mock. Ingen fallback er presentert som ekte modellrespons. **Spillopplevelse:** menneskelig design-/pedagogisk gjennomgang av faktiske bilder og bevegelse innen dette ene kapittelet; ingen observasjon av et barn, fysisk iPad eller Safari.

## Preview og konkret åpen port

[Preview for 4ae1549](https://ki-techer-cdte2za7y-team-thor1.vercel.app/leo/provekapittel) er observert READY, region `arn1`. [Branchadresse](https://ki-techer-git-feat-chapter-player-team-thor1.vercel.app/leo/provekapittel) følger nye commits. Faktisk uinnlogget forespørsel endte i appens innlogging, ikke elevdata. Dette er en tilgangskontroll, **ikke innlogget spilltest**. For siste bygg/SHA og CI: kontroller PR #17 før videreføring.

Automatisk godkjenningskontroll avviste opprettelse av midlertidig syntetisk Auth-bruker med husholdning/elev/enhet i den delte `leo-dev`-databasen: vedvarende data med innloggingsopplysninger var ikke uttrykkelig autorisert og ble vurdert å stride mot oppgavens omfang uten databaseendring. Handlingen ble ikke utført. Read-only etterkontroll fant null `r2-preview-…@example.invalid`-brukere. Ingen database-/miljø-/nøkkelendring ble gjort. Ingen omgåelse av avslaget. Den nye Auth-testen bruker i stedet CI-ens isolerte lokale Supabase, innen eksisterende testoppsett; det erstatter ikke Preview-porten.

Egen kortvarig deling på R2-branchadressen er tilbakekalt. Private lokale testfiler er slettet. Vercels fetch-verktøy administrerer sin egen midlertidige ytre tilgang; appens Auth/RLS ble ikke omgått. Ingen ekte KI-kall; tidligere testregnskap forblir 2,99981825 kr av 10. Ingen testkonto er opprettet for å endre eller nullstille dette.

For å lukke porten trengs eksisterende uttrykkelig godkjent testtilgang eller Thors godkjenning til de konkret avgrensede, midlertidige syntetiske dataene med sletting/etterkontroll. Prøv alle tre oppdrag med feil/hjelp/riktig, bevegelse, neste steg, pause/reload og avslutning i autentisert Preview. Registrer versjon og responskilder. R2 holdes som utkast inntil denne porten er avklart; R3 er neste nye leveranse etterpå. Dette er ikke full SPEC-dekning eller ferdig genererings-/adaptiv læringsflyt.
