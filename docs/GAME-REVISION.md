# Spillrevisjon: kravkart og kapittelfundament

Avtalt 16. oktober 2026. Dette er gjennomføringsplan og sporbar kravdekning, ikke en erklæring om at hele spillet er ferdig. Kanoniske produktkrav står i [SPEC](SPEC.md), særlig §15. R1–R7 nedenfor er leveranser i revisjonen, ikke GitHub-PR-numre.

## Begreper og elevreise

- **Oppdrag:** én matematikkoppgave i en konkret situasjon. En oppgave kan kreve både tall og regneuttrykk som deler av samme svar.
- **Kapittel:** en sammenhengende lokal historie med oppdrag, eventuelle valg, pausepunkter og avslutning. Ingen obligatorisk åpning eller fast sekvens med seks oppdrag.
- **Saga:** overordnet historie med faktiske gjennomførte hendelser og valg. En planlagt scene er aldri automatisk et historisk faktum.
- **Økt:** tillatt læringstid. Ett kapittel kan gå over flere økter.

Elevreisen er: fortsett uferdig kapittel eller velg nytt → velg/skriv/si interesse → forbered hele kapittelet → kort åpning med mål → oppdrag, støtte, handling og synlig konsekvens → avslutning og lagret fortsettelse. Forberedelsestid regnes ikke som aktiv læringstid. Daglige grenser og tillatte klokkeslett kontrolleres på nytt før spillstart.

Interesseidentiteten normaliserer Unicode, mellomrom og bokstavstørrelse; visningsnavnet beholdes. Dette er ikke fuzzy matching eller moderering. Et uferdig kapittel gjenopptas uten ny generering. Nye kapitler bygger på en oversikt over alle tidligere kapitler, relevante faktiske hendelser og autoritativ verdensstatus.

## Målarkitektur og ansvar

| Del               | Ansvar                                                                                 | Leveranse                                                    |
| ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Saga              | Faktiske hendelser, valg, steder, figurers tilstedeværelse og mengdebasert beholdning  | Kontrakt i R1; lagring/overganger i R3–R4                    |
| Kapittelpakke     | Versjonert historie, oppdrag, grener, kontrollerte oppgavevarianter og ressursmanifest | Grunnkontrakt i R1; produksjon i R3                          |
| Kapittelfremdrift | Aktivt oppdrag, fullførte oppdrag og faktisk valgt rute                                | Ren rutekontroll i R1; autoritativ atomisk avvikling i R4    |
| Forberedelsesjobb | Varige faser, claim/lease, idempotens, kostnad og gjenopptak                           | R3; en databasepost alene er ingen worker                    |
| Felles spiller    | Samme scene/oppgavekontrakt i kartlegging, øving, repetisjon og mesterutfordring       | Første snitt i R2; alle moduser i R4–R5                      |
| Mattelærer        | Aktiv situasjon, synlige mengder, faktisk historikk, vurdering og tillatt hjelp        | Grunnprojeksjon i R1; samtale og visning i R4–R5             |
| Læringsmotor      | Fasit, forkunnskaper, blanding, frustrasjonsvern, hint, selvstendighet og mestring     | Eksisterende motor beholdes; kobles riktig til kapitler i R4 |

Forberedelsesprosessen skal være lagret og gjenopptakbar: kølagt → research → kapittelutkast → kontroll → visuelle ressurser → klar. Separat feilet/avbrutt/budsjettstopp bevarer ferdige faser. Et unikt arbeid for saga, kapittel og grunnrevisjon hindrer dobbeltgenerering før kostnaden oppstår. Fullt innhold, nødvendige ressurser og redaksjonell kontroll kreves før klar-status. Leverandør-/workflowvalg må først verifiseres for EU-region, Hobby-støtte og kostnad. Ingen slik worker finnes i R1.

Ferdig kapittel betyr en kontrollert hovedløype med avgrensede støttevarianter. Motoren velger tillatt støtte underveis. Variasjon i tall må ikke gjøre allerede etablerte ressurser usanne. Den første kontrakten har felles narrativ konsekvens for variantene; ulike verdensutfall krever eksplisitte framtidige grener og separat kontroll. En alternativ variant er ikke automatisk pedagogisk godkjent.

Illustrerte bakgrunner og figurer skal ha sammenhengende stil; matematiske objekter, mengder og respons bindes til samme faglige data som spørsmålet. KI beskriver kontrollerte scenedata; appen kjører ikke vilkårlig generert JavaScript/SVG. Ressurs-ID er en referanse, ikke en fjern-URL eller en bekreftelse på at bildet er lastet. Feilrespons skal støtte, ikke straffe. Redusert bevegelse skal bevare informasjonen.

## Hva R1 faktisk implementerer

`lib/chapters/contracts.ts` og `compile.ts` er et additivt kontraktlag. Dagens API, database, prompter og elevflater bruker det ennå ikke. Gamle eventyr omskrives ikke.

- Pakkeversjon, oppdrags-/valg-/sluttnoder, sagafakta, fremdrift, støttevarianter, scenereferanser og lærertilstand.
- Strenge inngangsskjemaer, unike referanser, gyldige ressurstyper og en nåbar graf som avsluttes uten løkker. Algoritmeoppgaver kan fortsatt ha løkker inne i sin kontrollerte matematikk.
- Oppgaver refererer til motorens ferdighet, nivå, seed og generatorversjon. Fasit, parametre og svarform materialiseres av motoren, aldri fra en vilkårlig KI-påstand om et GeneratedItem. Eksisterende matematisk verifikator brukes i tillegg. Ustøttede oppgaver avvises.
- Spørsmål og tellbare sceneobjekter henter gitte mengder fra samme motoroppgave. Scenen kan ikke oppgi et separat antall eller binde seg til et vilkårlig answer-felt.
- Offentlig oppdragsprojeksjon utelater generatorparametre, seed, fasit, uttrykksfasit, feilfasiter, neste node, slutthook og tilbakemelding for riktig svar. Lovlige svaralternativer kan vises uten markering av riktig alternativ.
- Lærerkonteksten velger et aktivt oppdrag fra serverfremdrift, krever en faktisk gyldig rute og sammenholder fullførte oppdrag med sagaeventene. Den skiller historieforklaring, ordlyd og matematisk hjelp, men endrer ennå ikke appens hjelperegistrering.

Dette er strukturell kontroll, ikke bevis på spennende historie, fysisk logikk eller fasitfri fri fortellertekst. Vanlige tekst-/hintguards, moderering og redaksjonell kontroll må fortsatt kobles inn før den nye flyten tas i bruk. `publicMission` er en serverprojeksjon, ikke et autentisert endepunkt eller tillatelse til å velge en framtidig oppgave. R4 må eie aktive oppdrag og atomiske hendelser. Lærerkontekstens ordinære hjelpebane mottar ikke fasit, heller ikke ved nivå 4; full løsningshjelp får en egen kontrollert bane i R5.

Før persistens i R3 må generatorversjon 1 fryses eller få en kompatibilitetsimplementasjon; eldre kapittelreferanser kan ikke tolkes med endret generator uten migrering. R1 har ingen persistente pakker. Lengdegrenser (40 noder, fire varianter per oppdrag osv.) er beskyttelse mot ubegrensede payloads i første kontrakt, ikke et pedagogisk krav om kapittellengde.

## Kravkart for hele spesifikasjonen

«Behold og kontroller» betyr eksisterende ansvar som må regresjonstestes. Det er ikke en ny godkjenning av dagens funksjon. Alle rader må få observerte resultater før full SPEC-dekning påstås.

| SPEC    | Krav og eier                                        | Nå / videre arbeid                                          | Observerbar kontroll                                                                   | Leveranse          |
| ------- | --------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------ |
| 1–2     | Læring, engasjement, norsk, deterministisk kontroll | Behold prinsippene; revider hele elevreisen                 | Barnet forstår mål/handling; menneskelig kvalitetsvurdering skilles fra kode           | R2–R7              |
| 3–4     | Teknologistabel, leverandørlag, serveransvar        | Behold Next/OpenAI/Supabase; skill produksjon fra avvikling | Ingen hemmeligheter/fasit i klient; jobbrestart uten dobbeltarbeid                     | R1, R3             |
| 5       | Datamodell og husholdningsgrenser                   | Ny lagring for saga/pakke/jobb/fremdrift kreves             | RLS mellom to husholdninger; atomisk versjonskontroll                                  | R3, R6             |
| 6.1–6.2 | LK20 og ferdighetsgraf                              | Behold graf; verifiser ordlyd/dekning mot Udir              | Krav koblet til hver ferdighet; ingen hopp over forkunnskaper                          | R4, R7             |
| 6.3     | Generatorer og svarformer                           | R1 bruker motorreferanser; full bredde må dokumenteres      | Uavhengige orakler og alle nivåer/svarformer                                           | R1, R4–R5          |
| 7.1     | Mestring og selvstendig evidens                     | Behold dobbeltkrav og flere dager                           | Hjulpne svar og forklaring skilles fra tallriktig                                      | R4, R7             |
| 7.2     | FSRS/repetisjon                                     | Behold og integrer i kapittelet                             | Forfalt repetisjon vises uten å nullstille historie                                    | R4                 |
| 7.3     | Kandidater, blanding, frustrasjonsvern              | Ny kontroll før hvert oppdrag kreves                        | To feil gir lettere/ny representasjon; tre gir lett mestring og pausevalg              | R4                 |
| 7.4     | Hint og fasitvern                                   | Behold servergrenser; koble ny kontekst og hjelpetyper      | Historie-/ordspørsmål øker ikke matematisk hintnivå; ingen tidlig løsning              | R4–R5              |
| 7.5     | Preferanselæring/representasjon                     | Behold bandit; ikke merk alle oppgaver som konkret          | Konkret→bilde→tall og relevant læringssignal                                           | R4                 |
| 7.6     | Kartlegging som eventyr                             | Samme spiller med adaptive oppgaver                         | Førstegangsreise uten generisk skogreserve                                             | R4–R5              |
| 7.7     | Øktfaser, tid og humør                              | Læringsfunksjonene beholdes i kapittelflyten                | Forberedelse bruker ikke økttid; pause/gjenopptak og tillatte klokkeslett              | R3–R4              |
| 7.8     | Misoppfatninger                                     | Behold kontrollert feildeteksjon                            | Ingen diagnose fra én feil; relevant støtte etter mønster                              | R4–R5              |
| 7.9     | Medaljong og mesterutfordring                       | Behold motorstyrt tildeling og dagsgrenser                  | Hjelpetilgang gir ikke selvstendig prøveevidens; deler tas aldri bort                  | R4, R7             |
| 8.1–8.2 | Agentverktøy og dialog                              | Behold guards; innfør strukturert situasjon                 | Begrensede verktøy; hjelp bytter ikke oppgave                                          | R4–R5              |
| 8.3     | Matematikk og elevtekst                             | Ny pakke bruker navngitte gitte mengder                     | Samme tall/enhet/situasjon i tekst og scene; fysisk regel vurderes                     | R1–R3, R7          |
| 8.4     | Forklaringsvurdering                                | Behold separat vurdering                                    | Riktig tall med svak forklaring gir ikke falsk forståelsesgodkjenning                  | R4–R5              |
| 8.5     | Refleksjon, profil og skolestoff                    | Behold bevis, låsing og utløp                               | Forelderlåste fakta respekteres; skolestoff utløper                                    | R4, R6             |
| 8.6     | Moderering                                          | Må også dekke nye felt og medier                            | Interesse/research behandles som data; promptinjeksjon avvises                         | R3, R5–R6          |
| 8.7     | Kostnad                                             | Behold budsjettvakt og prislogging                          | Dobbeltstart, retry og ukjent forbruk; pris per godkjent kapittel/økt                  | R3, R7             |
| 9.1     | Auth, Leo-lås og PIN                                | Behold og kontroller                                        | Uautorisert enhet får ikke jobb-/kapitteldata                                          | R3, R6–R7          |
| 9.2     | Felles elevflate, lærer og tilgjengelighet          | Ombygges trinnvis                                           | 20px elevtekst, 48px mål, tastatur/skjermleser og redusert bevegelse                   | R2, R4–R5          |
| 9.2     | Manipulativer og tale                               | Full bredde i samme scene                                   | Gruppering/deling/3D/algoritmer; opplesing følger synlig scene; transkripsjon beholdes | R5                 |
| 9.3     | Foreldreinnsyn og valgfrie innstillinger            | Behold; legg til kapittel-/jobb-/kostnadsstatus             | Logger, profil, ferdigheter, diplom, tid, eksport og sletting                          | R6–R7              |
| 10      | EU, RLS, personvern og dataminimering               | Verifiser også worker/medier og reell region                | Ingen rå elevdata i research; sletting stopper jobber; region dokumenteres             | R3, R6–R7          |
| 11      | Kvalitetsbevis                                      | Nye kontrakttester i R1; øvrig utvides                      | Mocks, ekte modell, kodebestemt svar og reserve rapporteres separat                    | Alle, sluttport R7 |
| 12–13   | Milepæler og arbeidsinstruksjoner                   | Ny serie erstatter ikke beviskravene                        | PROGRESS/DECISIONS/PR viser observert omfang og åpne funn                              | Alle               |
| 14.1    | Samlet situasjon                                    | Ny felles oppgave-/scenekontrakt                            | Hvorfor matematikk trengs, samme mengder og meningsfull effekt                         | R1–R3, R7          |
| 14.2    | Saga og reell variasjon                             | Faktisk verdensstatus og nye hindringer                     | Tidligere valg endrer neste kapittel; brukte ting kommer ikke tilbake                  | R3–R4, R7          |
| 14.3    | Faktisk research                                    | Eksisterende webresearch beholdes og gjenbrukes             | Lagrede kilder underbygger figurer/steder; ingen oppdiktede kilder                     | R3, R7             |
| 14.4    | Visuell respons                                     | Ny felles spiller og utvidbare ressurser                    | Før → handling → feil/støtte → riktig/konsekvens på opptak                             | R2, R5, R7         |
| 14.5    | Komplett kvalitetsprøve                             | Tidlig snitt, deretter ekte produksjon og bredde            | Tre sammenhengende oppdrag; flere kapitler/interesser og fysiske nettbrett             | R2–R3, R7          |

## PR-rekkefølge og porter

1. **R1, dette fundamentet:** kontrakter, referanse-/matematikk-/rutekontroll, sikker projeksjon, kravkart. Ingen ny runtime eller modellkvalitet påstås.
2. **R2, første spillbare snitt:** tre sammenhengende oppdrag fra et helt, tydelig merket kontrollert testkapittel; feil → hjelp → riktig → konsekvens → reload. Vurder faktisk UX før større backendarbeid. Tre er en prøve, ikke en universell åpning.
3. **R3, varig kapittelproduksjon:** interesse ved start, research, helt kapittel, innholdskontroll, ressursklarhet, worker/lease/idempotens, lagring og budsjett. Første ekte genererte kapittel prøves i den nye flaten.
4. **R4, læring og adaptiv avvikling:** autoritativ progresjon, støttevalg, frustrasjonsvern, læringsfaser, kartlegging, repetisjon og mesterutfordring. Samme spiller, ulike evidensregler.
5. **R5, lærer/tale/visuell bredde:** ekte flerturshjelp, sceneforståelse, kontrollerte løsninger, alle svarformer og manipulativer, samordnet lyd og tilgjengelighet.
6. **R6, overgang og innsyn:** gamle aktive oppgaver/progresjon bevares med eksplisitt migrering; forelder/personvern dekker nye data; gamle renderløp fjernes først når erstatningen er verifisert.
7. **R7, full kontroll:** kravmatrisen får faktiske bevis, flere interesser/kapitler, begge valggrener, lange sagaer, nettbrett og regresjon av alle foreldrefunksjoner. Utrulling er en separat godkjent handling.

En strukturelt gyldig pakke, en grønn CI eller en positiv modellkritiker er ikke en kvalitetsgodkjenning. Menneskelig vurdering av faktisk generert og gjennomspilt innhold trengs. Ønsket om å slippe gjentatte bekreftelser gjelder fortsatt. Ekte KI-testing bruker samlet varig ramme på høyst 10 kr, billigste egnede modell og aldri nullstilt regnskap. R1 bruker ingen betalte kall. Kostnadsmålet under én krone må måles på den nye produksjonsflyten; gamle tekstanslag inkluderer ikke nye illustrasjoner eller større støttepakker.
