# Bevarte R2-artefakter

## Autentisert Preview

16. oktober, commit `55cdbdd`, Chromium 1024×768, ekte Supabase Auth/RLS og
    Leo-lås med uttrykkelig godkjente syntetiske testdata. Håndskrevet historie og
    direkte kodebestemt hjelp; ingen KI-kall. Ingen innloggingshemmeligheter i filene.

- [Hele gjennomspillingen](preview/full-chain.webm), med faktisk båtbevegelse,
  feil/hjelp/riktig, pause, reload og avslutning.
- [Åpning](preview/r2-opening.png), [hjelp](preview/r2-help.png),
  [lykter](preview/r2-lights-solved.png),
  [landgang](preview/r2-gangway-solved.png),
  [levering](preview/r2-letters-solved.png).

17 faktiske serverhandlinger svarte 200, ingen browserfeil. Ikke fysisk iPad,
Safari eller barnetest. Se R2-VERIFICATION for versjon og oppryddingsstatus.

## Tidligere lokal prøve

Lokal Chromium, 16. oktober 2026, `4ae1549` med scenearia-rettelsen som ble `5710f6b`. Håndskrevet kapittel, direkte kodebestemt lærer og lokal Auth-fixture. Ingen ekte KI, virkelige elevdata eller innlogget Preview i disse filene.

Kjøring: `PLAYWRIGHT_BROWSERS_PATH=/tmp/leo-playwright PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e -- tests/e2e/chapter-player.spec.ts`. To tester bestått. Skjermbilder bruker `fullPage`; de kan være høyere enn selve viewporten. Vanlig viewport er 1024×768; redusert bevegelse er 768×1024. Testen kontrollerer også 390×844 uten horisontal overflyt og knapper på minst 48×48.

| Fil                                          | Faktisk tilstand                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [Åpning](r2-opening.png)                     | Båt og Mira utenfor grunna, tre slukkede lykter med fire plasser hver, spørsmål og svarfelt.           |
| [Feil og hjelp](r2-help.png)                 | Forslaget 11 beholdt etter feil, historie-/mattehjelp og reload. Én tom plass og første konkrete hint. |
| [Lyktene tent](r2-lights-solved.png)         | Riktig svar 12, lyktlys og båt/Mira ved brygga etter bevegelsen.                                       |
| [Landgangen hel](r2-gangway-solved.png)      | Seks nye og tre eksisterende planker; Mira på øya.                                                     |
| [Invitasjoner levert](r2-letters-solved.png) | Alle tolv fordelt 4/4/4; Mira i båten på vei ut; lys og landgang bevart.                               |
| [Redusert bevegelse](r2-reduced-tablet.png)  | Samme forståelige sluttstatus/konsekvenstekst uten aktive animasjoner.                                 |
| [Opptak](full-chain.webm)                    | Hele testforløpet med faktiske skjermendringer og båtbevegelse. Pauser/handlinger er automatiserte.    |

Skjermbilder beviser tilstander; opptak og nettlesertestens transformmåling beviser bevegelse. Menneskelige vurderinger og avgrensninger står i [R2-VERIFICATION](../../R2-VERIFICATION.md). Ingen observasjoner av et barn eller fysisk iPad/Safari.
