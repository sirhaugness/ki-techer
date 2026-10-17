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

## Andre ekte prøve og presisering av menyen

`58672ec`: research ble gjenbrukt uten nytt research-kall. Første utkast blandet
gange og deling; kodeporten avviste det før elevvisning. Den ene tillatte
forfatterrevisjonen beholdt samme ulovlige mengdefelt, og jobben stoppet
`failed/review`. Ingen kritikerrespons eller godkjent kapittel ble produsert.
Tutor regnet uavhengig: den feilaktige delingsordlyden ga 1, mens referansens
ganging ga 18; dette ble aldri en elevoppgave. De to bekreftede utkastkallene
kostet samlet 0,328944 kr. Konservativt totalregnskap er nå **3,81839425 kr**,
inkludert uendret ukjent reservasjon; gjenstående **6,18160575 kr**.

Menyen viser nå bare de semantisk riktige gitte mengdene, hva eleven skal finne
og nødvendige mengdefelt. Referanse, handling og mengdefelt er én kontrakt.
Detaljerte valideringsfunn navngir oppdrag/variant og forventet handling før
generell pakkekontroll, slik at revisjonen får en konkret rettelse. Forfatter
og kritiker krever ett konkret historiemål og faktisk årsak mellom oppdrag.

En separat persistenskontroll fant også at JSONB omordner objektnøkler.
Referanser og ressursmanifest sammenlignes nå feltvis, inkludert hash og
klarstatus; de skal ikke avvises fordi JSON-nøklene skifter rekkefølge.
Regresjonstesten prøver omordning og endret hash.

## Tredje prøve: betrodd ressursoppslag

`b52be31`: matematikkmenyen ble fulgt, men modellen utelot nødvendige bakgrunner
og først også figurressurser fra den redundante assets-listen. Begge utkast ble
avvist før elevvisning; ingen kritiker- eller elevrespons ble produsert.
To utkastkall kostet 0,30381725 kr. Samlet konservativ belastning er
**4,12221150 kr**, gjenstående **5,87778850 kr**.

Forfatteren velger nå ressurs-ID-er i scener/figurer; koden samler den fullstendige
ressurslisten med betrodde roller og beskrivelser fra biblioteket. Dette retter
metadata, ikke fortelling, oppgave eller svar. Ukjente referanser/roller avvises
fortsatt. Wire-skjemaet utelater den redundante assets-listen. Den registrerte
rårevisjonen kompilerer med dette oppslaget (12 ressurser), uten håndredigering
av historien. Regresjonsprøven dekker wire uten assets og gyldig bakgrunnsoppslag.
En ny ekte prøve trengs fortsatt før elevkjeden/fortellerkvalitet godkjennes.

## Fjerde prøve: kritiker må se den faktiske tegneplanen

`a20c249`: første utkast passerte struktur/matematikk og fikk ekte modellkritikk.
Kritikeren avviste det, men tolket grouping som bare each objekter totalt, selv
om spilleren faktisk viser groups beholdere med each plasser i hver. Den ba
forfatteren endre gitte mengder til total. Revisjonen endret problemreferanse
og ble korrekt avvist av menyporten. Ingen pakke ble publisert for eleven.

Uavhengig tutor fant også reelle språk-/sceneproblemer i råutkastet: engelsk
«den» i stedet for «hi», tau på benk mot allerede monterte tau, én kasse i tekst
men fem i scenen, og stolper langs stien mot verkstedbakgrunn. Matematikken
var korrekt (15, 8, 6, 6), men det er ikke fortellerkvalitetsgodkjenning.

Forfatter og kritiker får nå `rendering` fra kode med faktisk antall beholdere,
plasser per beholder og allerede montert mengde. Kontrollen skal vurdere
fortellingen mot denne tegningen og bevare menyens gitte mengder. Testen låser
3 beholdere ×4 plasser og 9 plasser hvor3 er montert i prøvepakken.

Nye bekreftede kall kostet 0,46676575 kr. Samlet konservativ belastning er
**4,58897725 kr**, inkludert uendret usikker reservasjon; gjenstående
**5,41102275 kr**. Alle råforsøk og kritikk er bevart. Ny prøve pågår.

## Femte prøve: modellgodkjenning var ikke tilstrekkelig

`edb2b2b`: modellen og kritikeren godkjente en matematisk gyldig pakke, men
uavhengig tutor avviste den. Startvalg hoppet direkte til andre/tredje oppdrag;
slutten hevdet likevel at alle tre var utført. Lykteoppgaven blandet antall tomme
lykter og lyssteiner uten én-til-én-regel, og proviant ble til steiner.
Pakken ble sperret i leo-dev med audit før første spillhandling (play_revision=0).
Ingen gjennomspilling eller elev-/fortellerkvalitet godkjennes fra denne prøven.
Rårespons/kritikk ligger i `attempt-5-raw.json`; offentlig `ready` er modellens
status før menneskelig avvisning. Opptaksforsøket stoppet før sideopprettelse
på manglende FFmpeg-søkesti; det er ikke et gjennomspillingsbevis.

Koden teller nå alle komplette ruter, også valg som møtes igjen. R3-prøven
krever minst tre oppdrag på hver rute, ikke bare samlet i pakken. Dette er en
avgrenset kvalitetsprøve, ikke et permanent krav om kapittellengde. Kritikeren
får alle ruter eksplisitt og må returnere vurdering av hver faktisk oppdragsrekkefølge
og slutt. Manglende/duplikate/endrede ruter eller coherent=false avviser pakken.
Over 64 ruter avvises. Regresjonstesten gjenskaper den observerte 3/2/1-feilen.
Rutebevisets semantiske innhold trenger fortsatt faktisk modell-/menneskevurdering.

Nye bekreftede kall kostet 0,27988950 kr. Konservativt samlet **4,86886675 kr
av 10**, inkludert beholdt ukjent reservasjon; gjenstående **5,13113325 kr**.
Ingen forbruksnullstilling, grenseøkning eller automatisk nykjøp av ukjent kall.

## Sjette prøve: kjent forbruk, ubrukelig svar

`f2f9b88`: author-kallet brukte hele grensen på 12000 ut-token på108sekunder,
returnerte ikke et brukbart utkast og stoppet failed/provider_failed i draft.
Forbruket er kjent og ført, ingen pakke ble publisert. Konkrete incomplete-koder
var ikke bevart i denne journalen; feltet registreres nå eksplisitt ved slike
svar. Dette er ikke unknown og ikke en ny historie-/spillkvalitetsprøve.
Kostnad0,27777475 kr; konservativt samlet **5,14664150 kr**, gjenstående
**4,85335850 kr**. Forfatter får nå eksplisitt low reasoning innen samme token-,
tids- og budsjettgrense; separat kritiker beholder medium. Ingen skjult retry.

## Sjuende prøve: ubundne sceneobjekter avvises

`3d711fa`: to bekreftede utkastkall fullførte, men begge satte quantityKey=null
på alle mengdeobjekter. Den tillatte generelle pakkekontrakten åpnet for dette,
mens R3s faktiske spiller krever bundne mengder. Begge ble avvist før modellkritikk
og elevvisning. Dette beviser mengdeporten, ikke rutekontrollen eller spillkvalitet.
Forfatterens wire-skjema er nå smalere: nøyaktig to objekter, eksplisitt mengdenøkkel
og bare de tre støttede interaksjonene. Lagringskontrakten og rawresponsene
endres ikke; ingen fortelling eller matte håndrepareres for å få den godkjent.
Kallkostnad0,23347225 kr. Konservativt samlet **5,38011375 kr**, gjenstående
**4,61988625 kr**. Ingen kriterier eller budsjettgrenser er senket.

## Åttende prøve: identitetsgrammar og reelle semantiske funn

`e7a2361`: to utkast ble avvist før kritikk fordi forfatteren la `-v1` til
kapittel-ID. Wire bruker nå jobbens id, sagaId, revisjon og interesse som
Zod-litteraler; kontrollen av lagret identitet beholdes. Ingen rårespons omskrives.
Offline diagnose med bare forventet ID i minnet viser at øvrig struktur/matte
passerer, og begge ruter har tre oppdrag. Dette er ikke publisering/godkjenning.

Tutor fant reelle feil: etter sammenslåing forutsetter teksten en stolpe som
verkstedgrenen aldri fylte; kasseillustrasjoner brukes som stolper; lykter
blandes med lyssteiner uten én-til-én-regel; titler kopierer engelske menyvariabler;
praktiske formål er for like. Forfatterinstruksen presiserer sammenslåinger,
bibliotekets faktiske objekttyper, naturlige titler og ulik handling. Neste
prøve må fortsatt passere faktisk per-rutekritikk og menneskevurdering.
Kallkostnad0,17214175 kr. Konservativt samlet **5,55225550 kr**, gjenstående
**4,44774450 kr**. R3 er fortsatt ikke kvalitetsgodkjent.
