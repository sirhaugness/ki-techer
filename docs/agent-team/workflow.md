# Én hovedagent med relevante spesialister

Brukeren snakker med én hovedagent som eier oppgaven fra undersøkelse til ferdig testversjon. Hovedagenten starter relevante underagenter selv, gir dem kontekst, venter på resultatene, vurderer funn og retter dokumenterte problemer innenfor oppdraget. Bevar alltid prosjektets øvrige regler i [AGENTS.md](../../AGENTS.md), godkjent OpenAI-oppsett og produksjonsgrenser.

Disse Markdown-filene er gjenbrukbare rollebeskrivelser, ikke registrering av native agenttyper i Codex. Hovedagenten må lese aktuell rollefil ved behov og gi innholdet til en faktisk underagent. Kontroller tilgjengelige start-, meldings- og venteverktøy i den aktuelle chatten; verktøy som `spawn_agent` og `wait_agent` kan brukes der de finnes. Ikke etterlign flere agenter i ett svar. Hvis underagenter mangler, oppgi begrensningen og hvilke vurderinger hovedagenten selv gjorde. Ikke hev at teamet kjørte.

## Gjeldende retning

Følg [SPEC](../SPEC.md) og [byggeplanen](../GAME-REVISION.md) for forberedte kapitler. K0 er dokumentasjon, ikke runtime. Ikke viderefør gammel R3-produksjon eller krev ekspertpanel/manuell lærergodkjenning fra Thor. Undersøk skille mellom undervisning, veiledet øving og selvstendig prøve, og om forståelsesprober har faktisk vurderingsvei.

## Instruksjonsgrunnlag og oppdragstype

Brukerens siste avtalte bestilling og [kanonisk SPEC](../SPEC.md) styrer produktmålene. Rollefiler utfyller [AGENTS.md](../../AGENTS.md). Historiske valg i DECISIONS og tidligere testresultater er evidens om en versjon, ikke permanente produktgrenser. Ved konflikt: undersøk konteksten, bevar kodehåndhevet sikkerhet og dokumenter beslutningen; ikke still rutinespørsmål om allerede avtalte valg.

Disse rollene gjelder Codex-utviklingsteamet. Lærerens runtime-instruksjoner må undersøkes og revideres i de faktiske prompt-/kodefilene. Nye Markdown-krav endrer ikke appens verktøy, skjema eller modellkontekst.

Skill tre oppdragstyper:

- Ren undersøkelse: les og rapporter. Ingen filer, PROGRESS, branch, PR eller tjenester endres.
- Dokumentasjonsrevisjon: kontroller innbyrdes konsistens, lenker og implementeringsstatus. Ikke krev innlogget spilltest for tekst som ikke lastes av appen.
- Runtime-/promptendring: kontroller berørte kodekontrakter, relevante tester og faktisk bruker-/modellflyt når oppdraget omfatter denne prøvingen. Oppgi udekket verifisering.

## 1. Undersøk og definer ferdig

- Les relevante instruksjoner, spesifikasjon, kode og tidligere verifisering. Finn årsaken før du velger løsning.
- Skriv konkrete, observerbare ferdigkriterier: hvilken brukerhandling skal gi hvilket resultat, hvilke feilsituasjoner skal håndteres, og hvilke tester/bevis kreves?
- Ved spillendringer: kontroller tidligere hendelse → matematisk utfordring → elevhandling → feil/hjelp → riktig svar → synlig konsekvens → lagret fortsettelse. Forklar hvorfor regningen trengs i scenen og hva tidligere valg endrer. Nye tall, navn eller svarmekanismer alene dokumenterer ikke variasjon.
- Ved lærerendringer: kartlegg systemprompt, lokale tilleggsinstruksjoner, modellinput, tilgjengelige verktøy, guards og responskilder sammen. Velg scenarioer som kontrollerer disse kontraktene; en mock som gjentar forventet respons beviser ikke pedagogisk kvalitet.
- Avgrens oppdraget og velg relevante spesialister. Små tekstendringer trenger ikke hele teamet. Ikke utvid oppdraget til produksjon, nye hemmeligheter eller funksjoner uten dekning i brukerens instruksjon.
- Kontroller arbeidskopi, brancher og eksisterende PR før du lager en ny branch. Viderefør tilsvarende oppsett fremfor å lage en kopi. PR gjelder leo-dev/Preview; merge til main påvirker produksjon og krever brukerens tillatelse.

## 2. Velg roller og gi kontekst

| Når                                                             | Rolle og mandat                                                                                                                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vesentlig endring i brukeropplevelse, design eller spillfølelse | [Designer](designer.md): mål, handlinger, tempo, variasjon og synlige konsekvenser for en niåring. Bruk tidlig vurdering og kontroller den ferdige flyten ved behov. |
| Endring i lærer, hjelp, dialog, historie eller kapittelkontekst | [Tutor-evaluator](tutor-evaluator.md): faktiske elevsituasjoner, matematikk, forklaring, språk og sammenheng. Oppgi responskilder.                                   |
| Vesentlig kodeendring                                           | [Reviewer](reviewer.md): uavhengig kontroll av ferdigkriterier, feil, regresjoner og relevante tester før levering.                                                  |

Hovedagenten leser relevant rollefil og gir hver underagent:

1. Rollebeskrivelsen og prosjektreglene som gjelder for oppdraget.
2. Et avgrenset spørsmål, ferdigkriterier, oppdragstype og ønsket rapportlengde. Be om feil mot bestillingen og konkrete moteksempler, ikke bare en liste over funksjoner.
3. Relevant kontekst: prosjektsti, base/head eller diff, berørte filer, produktmål, tidligere funn og kjente begrensninger. Del ikke hemmeligheter eller unødvendige persondata.
4. Tilgjengelige bevis: kjørende lokal app eller Preview-lenke, testdata, skjermbilder/opptak, testresultater og opplysning om ekte modell, mock eller fallback.
5. Tillatte handlinger, eventuelt avtalt testvindu, og påminnelsen om kun å undersøke og rapportere. Oppgi ønsket prioritering, filhenvisninger og reproduksjonssteg.

Spesialisten skal lese relevante filer og undersøke bevis selv. Et referat fra hovedagenten er kontekst, ikke uavhengig verifisering. Et positivt funn krever også avgrensning av hva som faktisk er undersøkt.

Gi rolleinnholdet direkte, eller gi en tilgjengelig filsti med uttrykkelig beskjed om å lese hele filen før arbeidet. En rolletittel alene er ikke nok. Ved oppfølging: gi den konkrete rettelsen og nye bevis.

## 3. Samordne arbeid og tester

Bare hovedagenten endrer appkode som standard. Spesialistene undersøker og rapporterer; de endrer heller ikke dokumentasjon eller oppsett uten et uttrykkelig endret mandat. De starter ikke egne underagenter. Hovedagenten har ansvar for all delegering og bruker høyst tre samtidige underagenter, alltid innenfor miljøets tilgjengelige grenser. Ved færre plasser kjøres rollene etter hverandre; ikke opprett ekstra chatter som omgåelse.

Uavhengig lesing kan gå parallelt. Tester som deler app, konto, elevøkt, database, port eller byggkatalog må isoleres eller kjøres etter tur. Hovedagenten tildeler testmiljø, testøkt og rekkefølge, og venter på at en kjøring er ferdig før neste får samme ressurs. Ingen parallell nullstilling, migrasjon eller endring av felles testtilstand. Vanlige kvalitetstester bruker mocks etter prosjektreglene. Ekte modellprøving skjer bare når den inngår i oppdraget, utenfor kvalitetstestene og med godkjent oppsett. Ingen spesialist endrer produksjon eller hemmeligheter.

## 4. Samle funn og rett problemer

Vent på alle bestilte rapporter før endelig levering. Registrer hvilken underagent som faktisk kjørte, oppdrag, undersøkt versjon, metode, funn og manglende tilgang. Et mislykket startforsøk er ikke en gjennomført vurdering.

Samle rapportene i én kort oversikt med funn, prioritet, kilde/bevis og beslutning: rettet, avvist med begrunnelse, utenfor oppdraget eller fortsatt blokkert. Kontroller bevis og løs motstridende råd mot ferdigkriteriene. Skill bekreftet feil, hypotese og ny idé. Et funn kan være blokkert eller ikke undersøkt; det skal ikke omklassifiseres til bestått fordi verktøy eller tilgang mangler. Hovedagenten retter nødvendige, dokumenterte problemer og kjører målrettet verifisering. Be reviewer eller relevant spesialist undersøke rettelsen igjen ved vesentlige funn. Nye produktidéer kan føres i `docs/BACKLOG.md`; de skal ikke skjules som ferdigkriterier.

## 5. Lever én samlet rapport

Følg prosjektets krav til tester, lint, typecheck, formatering og bygg når de er relevante. For rene dokumentasjonsendringer kontrolleres formatering, lokale lenker, diff og at eksisterende regler er bevart; rapporter tydelig at appflyt ikke er testet dersom den ikke er prøvd. Ved endringsoppgaver: oppdater `docs/PROGRESS.md`, commit og opprett eller viderefør PR. Rene undersøkelser leveres uten slike endringer. Ikke merge eller endre produksjon uten tillatelse.

Rapporten til brukeren og PR-beskrivelsen skal inneholde:

- Resultatet mot ferdigkriteriene, endrede filer og eventuelle begrensninger.
- Hvilke underagenter som faktisk kjørte, hva de leverte og hvordan funnene ble samlet og håndtert.
- Dokumentert verifisering: kommandoer, observert resultat, miljø/commit, og tydelig skille mellom kodekontroll, direkte kodebestemte svar, mock/fallback og ekte tjenester/modell. Vurder teknisk funksjon, modellkvalitet og spillopplevelse separat.
- Preview-lenke for riktig branch/commit og hva som faktisk er testet der. Hvis Preview mangler eller er utilgjengelig, oppgi det og nøyaktig hva som gjenstår; ikke oppgi en eldre Preview som bevis for den nye branchen.
- PR-lenke og «Hva Thor må gjøre». Avslutt brukerens rapport med «Neste steg for deg:» og en kort, konkret sjekkliste.

Et grønt bygg eller en samlet agentrapport erstatter ikke testing av den endrede brukerflyten. Ikke hev at GitHub CI, innlogget Preview, ekte modellkvalitet eller fysisk iPad er verifisert uten observerte resultater.
