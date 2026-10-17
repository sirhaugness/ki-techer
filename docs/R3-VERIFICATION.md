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

- Full Vitest på første implementasjon: **538/538**, 43 filer. Simulering bestått.
- [Full CI på f34b7b2](https://github.com/sirhaugness/ki-techer/actions/runs/39021673546)
  er grønn: statiske kontroller, tester, browser, ekte lokal Supabase/Auth,
  produksjonsbygg og eksisterende tilgjengelighetsprøve. [Dev-migrasjon](https://github.com/sirhaugness/ki-techer/actions/runs/39021673564) er grønn.
- Lokal samlet browser: 24 bestått, to Auth-prøver hoppet over. Én eldre mobiltest
  traff femsekunders venting under kald oppstart og bestod målrettet omkjøring;
  ingen timeout er økt. CI bestod uten denne feilen.
- Ny spiller gjennomspilt med kontrollert API-fixture: feil, historie-/mattehjelp,
  reload, tre konkrete konsekvenser, pause og avslutning. Etter kompaktering er
  spørsmål, kontroll og hjelp samtidig synlige ved 1024×768. Opptak og bilder i
  [evidens](evidence/r3/README.md). Dette er håndskrevet innhold, ikke modellkvalitet.
- [Faktisk Preview](https://ki-techer-5w5nq203j-team-thor1.vercel.app/leo/kapittel),
  `f34b7b2`, READY i `arn1`. To samtidige gratis probe-starter ga samme jobb;
  den fullførte etter lukket nettleser, med observert gjenopptak av begge
  simulerte avbrudd og worker-region `arn1`. Null KI-kall i proben.
- Første ekte modellprøve: interesse «Rever», `gpt-5-mini`. Research fullført med
  faktiske kilder. Utkast stoppet `unknown/draft`, uten elevvist oppdrag. Journalen
  beholdes og sendes ikke automatisk på nytt. Ingen kapittel-/fortellerkvalitet
  er godkjent fra dette forsøket.
- Offline kontroll fant `oneOf` fra Zods diskriminerte nodeunion, som OpenAI
  strict structured output ikke støtter. Wire-skjemaet bruker nå tilsvarende
  `anyOf`; den lagrede kontrakten er uendret. Reviewer kontrollerte 18 strenge
  objektformer, null `oneOf`. Dette er sannsynlig forklaring på det raske
  leverandøravslaget, men første konkrete HTTP-feil ble ikke bevart. Senere
  schemafeil får private, avgrensede diagnostikkdata i kalljournalen.
- Tutor fant at historikksitat kunne ligge bare i en framtidig slutt/annen gren.
  Porten krever nå synlig virkning før første oppgave på alle mulige startruter.
  Regresjonstest dekker framtidig success og innledende valg.

## Kostnadsregnskap

Tidligere forbruk **2,99981825 kr**. Første R3-forsøk: bekreftet research
**0,17354975 kr**, samt fullt beholdt usikker draft-reservasjon **0,31608225 kr**.
Konservativt samlet **3,48945025 kr av 10**, gjenstående **6,51054975 kr**.
Den usikre reservasjonen er ikke et bekreftet fakturabeløp, og frigis ikke på
antakelse om schemafeil. Kontoens testgrense er fortsatt 7,00018175 kr inkludert
alt nytt R3-arbeid; den er ikke økt eller nullstilt.

Etter eksplisitt teknisk kontroll kan den avgrensede syntetiske jobben erstattes
med en ny prøve mot rettet wire-kontrakt. Gammel unknown-journal og reservasjon
beholdes med audit; `play_done` betyr da superseding av testjobb, ikke gjennomspilt
historie. Bekreftet research-sjekkpunkt gjenbrukes. Ingen automatisk ny utsending
av det usikre kallet. Ny generering og autentisert gjennomspilling står åpne.
