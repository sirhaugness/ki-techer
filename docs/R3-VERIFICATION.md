# R3: varig kapittelforberedelse

Arbeid 16.–17. oktober 2026 på `feat/chapter-preparation`, fra R2 `588578e`.
Dette er en avhengig leveranse etter PR #18. Ingen produksjonsmerge.

## Avgrenset elevreise

`/leo/kapittel`: velg interesse → research → helt utkast → uavhengig
innholdskontroll → kontrollerte illustrasjoner → klar → start læringstiden →
spill med feil/hjelp/riktig → pause/reload → lagret faktisk fortsettelse.
Uferdig kapittel gjenbrukes. Ingen stille reservehistorie erstatter avvist KI.

R3 støtter gruppering, konkret deling og manglende mengde. Motoren velger
tilgjengelige ferdigheter før modellen får menyen. Full adaptiv avvikling,
mestring, repetisjon og alle faglige svarformer er R4; flerturssamtale,
tale og visuell bredde er R5. R3s hjelp under spillet er direkte kodebestemt.
Illustrasjonene er et kontrollert vektorbibliotek; modellen velger referanser.
Dette er ikke genererte illustrasjoner eller endelig visuell kvalitetsgodkjenning.

## Drift, idempotens og tilgang

- Workflow `5.2.2` aksepterer arbeidet før første varige steg oppretter jobben.
  Stabil request-alias hindrer ny jobb ved gjentatt init, også etter avslutning.
- Unik jobb per saga/kapittel/grunnrevisjon, stabil claim-eier per Workflow-run,
  ti minutters lease og atomiske faseoverganger. Utløpte eiere kan ikke skrive.
- Separate journaler bevarer leverandørresultat før neste fase. Samme journal-ID
  reserverer budsjett. Bekreftet resultat gjenbrukes; pending/unknown kjøpes aldri
  automatisk på nytt. Betalte steg har `maxRetries=0`.
- Orkestratoren prøver inntil tre sikre sjekkpunktforløp. Tester dekker tapt
  fase-/resume-svar og nytt eierskap. En kontrollert gratis Preview-probe tester
  samme worker, inkludert simulerte tapte stegresultater; dette er ikke ekte
  prosessdrap eller bevis på leverandørkvalitet.
- Pakker blir klare etter struktur-/matematikkontroll, separat modellkritikk,
  eksakte elevsynlige fysiske regler, moderering og hashkontrollert manifest.
  En godkjent modellkritikk erstatter ikke menneskelig gjennomspilling.
- Rå pakker, sagaer, kall, forespørsler og klokker er service-only med RLS og
  eksplisitt tilbakekalte public/anon/authenticated-grants. API bruker faktisk
  Auth/Leo-lås og kontrollerer husholdning/elev før servertilgang.
- Svar, valgte ruter og sagafakta lagres med revisjonskontroll. Bare gjennomførte
  hendelser blir historikk. Eksport inkluderer nye poster; sletting av elev
  kaskaderer. Forberedelse bruker ingen økttid, og gammel/ny spiller deler
  tidsgrense og lås mot parallelle klokker.
- Generatorversjon 1 er frosset fra `588578e`, med varig sjekksum for 3500 utfall.

## Leverandørvalg

[Workflow multi-region](https://vercel.com/docs/workflows#multi-region) støtter
`arn1` i versjon 5. API starter eksplisitt i `arn1`; prosjektet bruker samme
region. Versjon 4s standardregion i USA er derfor ikke valgt.
[Hobby-prising](https://vercel.com/docs/workflows/pricing) inkluderer 50 000
hendelser/måned, 1 GB skrevne data og én dags oppbevaring av fullførte runs.
Funksjons-/køkvoter gjelder også. Supabase er varig kilde; Workflow-historikk
er ikke foreldrearkiv. Faktisk Preview-region og kjøring må observeres separat.

## Observerte kontroller

- Før siste recovery-rettelser: full Vitest, **531/531**, 41 filer.
- Etter rettelsene: **15/15** i database-, recovery- og frossen-generatorprøven.
  Databasetesten kjører alle migrasjoner i PGlite, også familiegrenser,
  eksport/sletting, budsjett og klokkelås. Recovery bruker mocks; det er ikke
  en gjennomført Preview-worker.
- Produksjonsbygg med Next 16.4/Turbopack og Workflow: bestått. Et tidligere
  bygg manglet sandboxens child-process-rettighet (`spawnSync EPERM`); bygg
  med godkjente miljørettigheter fullførte uten kodeomgåelse.
- Nettleserprøve, aktuell CI, innlogget Preview-worker og første ekte
  genererte kapittel registreres etter faktisk kjøring. De er foreløpig åpne.

## Kostnadsregnskap

Tidligere forbruk **2,99981825 kr**. Ingen nye betalte R3-kall hittil.
Gjenstående **7,00018175 kr** innen samlet godkjent ramme på 10 kr.
En midlertidig konto nullstiller ikke dette regnskapet. Før ekte generering
settes kontoens lavere testgrense til gjenstående ramme; både faktiske kall
og uavklarte reservasjoner føres før eventuell ny prøve.
