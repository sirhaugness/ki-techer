# R3-evidens

## Kontrollert lokal spiller

`fixture/`: Chromium 1024×768, håndskrevet treoppdragsprøve, API-responser
beregnet av faktisk ren spillkode og servert som eksplisitt Playwright-mock.
Ingen ekte Auth, database eller KI i disse bildene/opptaket. Ingen modellkvalitet
påstås. Viewportbildene tas før svar; fullsidebilder etter riktig svar.
Opptaket viser feil, hjelp, reload, riktig, pause, tre konsekvenser og avslutning.

## Faktisk Preview-worker

`preview-worker.json`: commit `f34b7b2`, autentisert syntetisk konto i leo-dev,
to samtidige starter, samme jobb-ID, begge Workflow-run-ID-er. Nettleseren ble
lukket før fullføring; serveren gikk fra research via draft til ready i `arn1`.
Arbeidet simulerte både tapt sjekkpunktsvar og tapt stegresultat etter commit.
Dette er en gratis infrastruktursjekk, ikke modellgenerering eller prosessdrap.

## Ekte generering

`preview-generation.json` føres fra den første faktiske modellen i Preview.
Det viser budsjett-/modellkontroll og observerte offentlige faseprojeksjoner.
Ferdig status, råforsøk/kritikk, kostnad og menneskelig kvalitetsvurdering skal
leses sammen med R3-VERIFICATION. En påbegynt fil er ikke en bestått port.

Ingen cookies, API-nøkler, passord eller Preview-delingshemmeligheter skal
bevares her. Kontoens tekniske UUID-er gjelder bare godkjente syntetiske data.

`attempt-5-raw.json` og `preview-generation-attempt-5.json`: modellgodkjent,
**menneskelig avvist**. Ready-status dokumenterer hva modellen/appen faktisk
gjorde før kvalitetsfunnet, ikke at pakken er godkjent. Pakken ble sperret før spill.

`preview-worker-revision.json` og `preview-worker-revision-database.json`:
ny faktisk gratis Preview på `e256394`, samme browserlukking/deduplisering
og begge avbrudd, i tillegg separat rettingssteg og ny kontroll.
`probeRevisionRan`/`probeReviewRecovered` og null kall bekreftet i database.
