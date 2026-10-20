# Kostnader og testgrenser

## Gjeldende retning 20. oktober 2026

[SPEC §9](SPEC.md#9-kostnad-og-tilgang) styrer kostnadsvern. Historie/bilder utarbeides under utvikling og gjenbrukes. Den nye elevreisen trenger ingen forfatter, research eller fortellingskritiker per spilling. Levende lærer, forståelsesvurdering og tale beholder budsjettvakt, reservasjon, logging, rategrenser og cache. Ingen ny normalbrukspris eller lærerkvalitet er målt i dokumentasjonsleveransen.

Siste registrerte historiske testregnskap i PROGRESS er 8,24392525 kr av 10 kr, ikke kontrollert på nytt mot tjenesten her. Ingen betalt test inngår nå. Ekte testing følger avtalt mandat og samme varige regnskap, uten nullstilling.

## Historiske beregninger og tester – 15. oktober 2026

Alt nedenfor beskriver datidens kode, priser, testforbruk og PR-status. Seksoppdragskapittel, obligatorisk modellkritiker og forbud mot delt innhold er ikke aktive produktkrav. Prisene er ikke kontrollert på nytt. Bevar tallene som historiske regneeksempler, ikke som nåværende garanti eller ny bestilling. En tidligere åpen/utkast-PR kan senere være merget; se PROGRESS for nåstatus.

Kontrollert 15. oktober 2026. Beløpene er NOK. En kostnadsberegning er ikke en leverandørfaktura.

## Hva ai_calls i produksjon faktisk viser

Read-only aggregat fra leo-prod; ingen dev-/syntetiske testkall er brukt som normalbrukspris. Kildedataenes periode er 11.–15. oktober, med siste samlet uttrekk 15. oktober kl. 21:22 UTC. Kontoene var ikke merket med de syntetiske testenes example.invalid-domene. Loggen skiller ikke all tidligere manuell utprøving fra vanlig elevbruk, så dette er et produksjonsregnskap, ikke en representativ brukerundersøkelse.

| Type og modell                  | Antall | Input/outputtokens totalt | Gammelt bokført anslag | Ny prisberegning av samme tokens |
| ------------------------------- | -----: | ------------------------- | ---------------------: | -------------------------------: |
| Lærer/verktøy/historie, gpt-5.2 |    158 | 516557 /9759              |                55,5593 |                          11,4466 |
| Oppsummering, gpt-5.2           |      9 | 10472 /4643               |                 2,9044 |                           0,9166 |
| Moderering                      |    156 | 0 /0                      |                      0 |                                0 |
| Totalt                          |    323 | 527029 /14402             |                58,4637 |                          12,3632 |

Gamle ai_calls bruker samme 100 kr/million inputtokens og 400 kr/million outputtokens for alle modeller. De historiske beløpene og månedsregnskapet er beholdt, ikke skrevet om. Ny prisberegning ovenfor er separat og inkluderer ingen antatt rabatt for cache. Det er ingen separat registrert story-/researchkalltype i produksjonsuttrekket, og gamle rader mangler økt-/kapittelkobling. Derfor kan vi **ikke** oppgi en målt pris for et vanlig nytt historiekapittel eller dele totalsummen på 11 økter og kalle det vanlig øktpris.

Gjennomsnittlig gammelt lærerkall ble bokført 0,3516 kr; samme faktiske tokenmengde prises til 0,0724 kr med gpt-5.2-standardpris, eller omtrent 0,0103 kr med mini. En gammel oppsummerings tokenmengde ville koste omtrent 0,0145 kr med mini. Dette er omprising av registrerte tokens, ikke bevis på at modellenes svar har lik kvalitet.

## Forventet vanlig bruk etter kostnadskuttet

Ett kapittel er seks oppdrag. Hele planen lages i ett forfatterkall; et separat kall kontrollerer fortellingen. Kontroll må ikke fjernes for å få lavere pris. Følgende konkrete eksempel bruker mini, én godkjent plan uten omskriving, gjenbrukt research og uten tale:

| Type                                    |           Kall | Input/output per kall | Modell              | Beregnet kr |
| --------------------------------------- | -------------: | --------------------- | ------------------- | ----------: |
| Hele kapittelet                         |              1 | 20000 /6000           | gpt-5-mini          |      0,1870 |
| Separat fortellingskontroll             |              1 | 30000 /3000           | gpt-5-mini          |      0,1485 |
| Hjelp/feilforklaring                    |              3 | 4000 /200             | gpt-5-mini          |      0,0462 |
| Oppsummering                            |              1 | 1500 /600             | gpt-5-mini          |      0,0173 |
| Svarvurdering, valg, refresh, animasjon | 0 betalte kall | Kode                  | —                   |           0 |
| Moderering                              |    Etter behov | Egen moderering       | moderation-endpoint |           0 |
| **Én økt med ett nytt kapittel**        |                |                       |                     |  **0,3990** |

**Kapittelet alene: ca. 0,34 kr. Økten i eksemplet: ca. 0,40 kr.** En økt som fortsetter et lagret kapittel, trenger ingen ny forfatter eller kritiker; med samme hjelp/oppsummering er eksemplet ca. 0,06 kr. Ingen generisk historie gjenbrukes på tvers av elever eller ulike valg.

Én omskriving kan gi ytterligere forfatter+kontroll, i dette eksemplet ca. 0,34 kr: økten blir ca. 0,73 kr. Research for en helt ny interesse begrenses til to søk og 1800 outputtokens og gjenbrukes senere; ved et konservativt reservasjonseksempel på 3500 vanlige inputtokens og 16000 hentede konteksttokens er anslaget ca. 0,31 kr ekstra. Førstegangsresearch **sammen med** omskriving kan derfor føre eksemplet over 1 kr. Flere kapitler, lang historikk og mye hjelp kan også gi høyere sum. Under 1 kr er målet, ikke en hard øktgrense eller en påstått måling av normalbruk. Faktiske tokens fra nye økter må følges opp.

Tale er valgfritt og ikke automatisk på som standard. Det er ingen produksjonsrader for tale i dette uttrekket. Nåværende konservative taleanslag er 0,30 kr per 1000 nye teksttegn for TTS, med 0 kr for et lydcachetreff; STT anslås fra filstørrelse med 2 kr/MB. Dette er andre anslagsmetoder, ikke fakturapriser. Derfor er løftet under 1 kr ikke dokumentert for en økt med mye ny tale. Tale ble ikke slått av eller gjort dårligere som et skjult kostnadskutt.

## Priser, logging og tiltak

Standardpriser er kontrollert mot [gpt-5.2](https://developers.openai.com/api/docs/models/gpt-5.2), [gpt-5-mini](https://developers.openai.com/api/docs/models/gpt-5-mini), [gpt-5-nano](https://developers.openai.com/api/docs/models/gpt-5-nano) og [Responses-parametere](https://developers.openai.com/api/reference/resources/responses/methods/create). USD per million input/output: 1,75/14; 0,25/2; 0,05/0,40. Valutaforutsetningen er 11 NOK/USD, ikke en hentet dagskurs. Søk prises med 0,01 USD/kall pluss modellprisen på API-rapporterte tokens. Reservasjonen setter av 8000 ekstra inputtokens per tillatt søk som kontekstmargin; dette er ikke en fast fakturablokk for mini. Den ekstra marginen legges ikke på det oppgjorte tokenforbruket. Cache- og andre leverandørrabatter trekkes ikke fra.

- Felles `OPENAI_MODEL_DEFAULT` er valgfri og bruker mini uten oppsett. Gamle TUTOR/FAST/REFLECT-variabler gir ikke en skjult videreføring av sterk modell. Ingen automatisk oppgradering til dyrere modell.
- Nye logger skiller story-generate, story-review, help, feedback, explanation, contextualize, tutor og reflect. session_id, chapter_number, environment, usage_known og prisversjon gjør fremtidig oppfølging mulig. Research prises og merkes separat. Historiske rader forblir legacy.
- Maksimalt to planutkast totalt (ett førsteutkast og én omskriving). Korte hjelpe-, forklarings-, innrammings- og oppsummeringskall prøves én gang før trygg reserve. SDK-retries er 0.
- Historiegenerering har tak på 12000 outputtokens og separat kontroll 6000, inkludert resonnering. Dette er tak, ikke forventet forbruk. Eksemplet over er et regneeksempel med lavere faktisk bruk; to maksimalt lange forsøk kan koste mer enn 1 kr med input og tilleggskall.
- Ferdig kapittel med kontrollerte oppgaver og research lagres i eksisterende elevtilstand og følger med til neste økt. Alle faktiske historiske hendelser/valg sendes videre, uten dupliserte sistekapitler. Et kapittel fra en annen historie gjenbrukes ikke.
- Alle betalte tekst-/taleprovidere krever budsjettvakt. Ved kjent bruk belastes anslaget selv om JSON/fortellingen avvises. Ved ukjent forbruk beholdes reservasjonstaket; en loggrad med 0 tokens betyr da ikke at forsøket var gratis.

## Tester og bypass

Vanlige tester og `npm run eval:agent` bruker mocks uten betalte kall. Eksplisitt generell live-eval bruker gpt-5-nano og en privat, varig regnskapsfil med hard samlet 10 kr-grense. Samme fil skal brukes hele oppdraget; ingen automatisk nullstilling eller oppheving av grensen. Preview-testen krever autentisert servergrense ≤10 kr og mini/nano før handlinger. For å prøve mini som faktisk produksjonsmodell må nettopp mini brukes, ikke en dyr modell. Thor skal spørres **før** det brukes mer enn 10 kr på ekte KI-testing; tidligere 30/50-godkjenninger gjelder avsluttede runder.

`/tmp/leo-story-eval-bypass.json` inneholdt et tidsbegrenset Vercel-delingstoken. Det åpnet den ytre Preview-beskyttelsen og ga en Vercel-cookie. Det omgikk ikke Supabase-innlogging, enhetstilknytning, Leo-lås, RLS, månedsbudsjett, forespørselsgrense, moderering, hint/fasitvern eller deterministisk svarvurdering. Browserens særskilte TLS-tillit var avgrenset til én prosess og den eksisterende administrerte proxyens CA; dette ligger bare i testskriptet. Appen leser ingen bypassfil eller delingstoken. Den tidligere midlertidige 50 kr-testkonfigurasjonen var en uttrykkelig godkjent Preview-budsjettøkning, ikke forårsaket av delingstokenet; den er avsluttet/ryddet opp.

Det gamle direkte eval-agent-skriptets manglende budsjettvakt er rettet. Ingen ubevoktet live-eval skal presenteres som en tillatt måte å gå utenom appens regnskap på. Testingen i denne runden brukte samme separate, syntetiske devhusholdning med serverhåndhevet 10 kr-tak, uten regnskapsnullstilling eller miljøøkning.

## Faktisk testresultat og begrensning

Sluttregnskapet er **2,99981825 kr**, avrundet **3,00 kr**, med null uoppgjorte reservasjoner. Ett kontrollkall manglet rapportert forbruk; reservasjonstaket på 0,24177725 kr er beholdt i beløpet. Det kallets ai_calls-rad med null tokens skal derfor ikke leses som gratis. Dette er et konservativt testregnskap, ikke faktura eller vanlig øktpris.

På `4f343b9` ble Star Wars-kapittel 4 levert etter én omskriving: to forfatterkall og to kontrollkall kostet samlet **0,69564 kr**. Alle seks oppdrag er gjennomspilt med riktige svar, et feilforsøk, lagring/oppfriskning og et matematisk valg. Tutor-evaluator fant likevel manglende synlig nytte av et tidligere valg, geometri uten tydelig materialregel, motstridende stolpevalg og usammenhengende landing/avgang. Dette er et dokumentert feilaktig modellgodkjent kapittel, ikke et kvalitetsgodkjent normalbrukseksempel.

Kontrollen krever nå eksakte sitater fra faktisk bundet elevtekst, og regelen og tidligere gjenstands handling må være synlig i begge valgforløp. Intern purpose og uses-metadata teller ikke. Tutor-evaluator etterkontrollerte disse kodeendringene. Sitatkontroll beviser at teksten finnes; dens relevans og fortellingens kvalitet krever fortsatt semantisk vurdering. Praktisk gjentakelse vurderes av kritikeren, ikke av en påstått deterministisk malduplikatkontroll.

En faktisk kapittel 5-prøve på `2e21a02` ble avvist før visning da siste kontrollkall ikke fullførte. Den fullførte historien er bevart. Siste integrasjonsrettelser i `4cd18c2` og diagnostikkrettelsen i `ba60ab9` har 478 beståtte enhetstester og grønn CI, men ingen ny ekte godkjent fortsettelse. Åpne historie-/sceneproblemer består. **PR 15 er fortsatt utkast og ikke klar for merge.** Ingen endring fra denne runden er satt i produksjon.

Syntetisk devbruker, husholdning, elev, innlogginger og refresh-tokens er slettet og fravær etterkontrollert. Egne eldre testdelinger ble tilbakekalt; siste deling hadde én times gyldighet og er utløpt. Private testfiler finnes ikke i det aktive miljøet etter omstarten. Ingen Preview-/Production-variabler eller nøkler ble endret i denne runden.
