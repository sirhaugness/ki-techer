# R2: første spillbare kapittelsnitt

16. oktober 2026. Avgrensning: [GAME-REVISION R2](GAME-REVISION.md#pr-rekkefølge-og-porter), [SPEC §15](SPEC.md#15-avtalt-spillrevisjon-16-oktober-2026). Branch `feat/chapter-player` fra R1 `9089172`; PR-base er `feat/chapter-foundation`. Ingen merge eller produksjonsendring.

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
- Full lokal Vitest-suite før siste regresjonstillegg: 514/514. Etter retting av vurderingsstatus: 11/11 fokuserte prøvetester. Simuleringen besto alle kriterier. Endelige bygg-/tilgjengelighets-/CI-resultater føres etter observasjon.

### Uavhengige vurderinger

Faktiske underagenter `/root/designer`, `/root/tutor_evaluator` og `/root/reviewer` leste sine rollefiler, undersøkte arbeidskopien og rapporterte uten å endre prosjektet. Hovedagenten gjorde rettelsene og samordnet nettlesertestene.

| Funn                                                       | Bevis og tiltak                                                                                          | Etterkontroll                                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| P2: strandet båt og ubegrunnet planketall i første konsept | Båten venter nå utenfor grunna; landgangen har samme gitte total og eksisterende planker som spørsmålet. | Tutor regnet alle tre svar uavhengig og vurderte faktisk scene/spørsmål.                                        |
| P2: Mira på feil sted ved venting/avreise                  | Mira tegnes nå inne i båtgruppen under venting, ankomst og avreise; på land etter landgangen.            | Tutor bekreftet rettelsen i kode og faktiske bilder/opptaksuttrekk. Nettlesertesten sjekker hvem som er ombord. |
| P2: svarfelt under første skjerm ved 1024×768              | Kortere oversikt, mindre sidemargin og fjernet konkurrerende banner.                                     | Nytt bilde viser spørsmål, arbeidssted, lærer og svarfelt samtidig; designerens etterkontroll følger.           |
| P3: gammel feilrespons etter redigering og hjelp/reload    | `lastChecked` knytter responsen til det faktisk vurderte utkastet. Forsøk/hint bevares.                  | Reviewer etterkontrollerte rettelsen og kjørte 11/11 prøvetester; nettleserregresjonen er bestått.              |
| P3: dekorativ SVG-tekst skalert under 20px                 | Den dekorative stedslabelen er fjernet; nødvendig tekst er vanlig HTML.                                  | Endelig bildekontroll følger.                                                                                   |

## Hva dette beviser

**Teknisk funksjon:** et isolert R1-basert kapittel kan gjennomspilles og gjenopptas. **Modellkvalitet:** ikke prøvd; historie er håndskrevet, hjelp og tilbakemelding direkte kodebestemt, lokal Auth er mock. Ingen fallback er presentert som ekte modellrespons. **Spillopplevelse:** menneskelig design-/pedagogisk gjennomgang av faktiske bilder og bevegelse innen dette ene kapittelet; ingen observasjon av et barn, fysisk iPad eller Safari.

Innlogget Preview, siste SHA, CI og endelige artefaktlenker føres etter faktisk kontroll. Dette er ikke full SPEC-dekning eller ferdig genererings-/adaptiv læringsflyt.
