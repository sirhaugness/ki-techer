# Leo-læreren – kanonisk produktbeskrivelse

Gjeldende retning, oppdatert etter bestillingen 21. oktober 2026: et begrenset bibliotek av forberedte interesseverdener og kapitler, med en levende KI-mattelærer. Denne bestillingen erstatter fri interessegenerering og tidligere R3–R7-bestillinger der de strider mot teksten her. Eldre spesifikasjon finnes i [git-historikken](https://github.com/sirhaugness/ki-techer/blob/d6e18740547c43db34e7ce108b95fc5bf28e800e/docs/SPEC.md).

Dette er produktkrav, ikke en erklæring om ferdig runtime. [PROGRESS](PROGRESS.md) viser implementert og kontrollert status; [GAME-REVISION](GAME-REVISION.md) viser neste byggesteg. [AGENTS](../AGENTS.md) styrer utviklingsarbeidet. Andre dokumenter skal lenke hit fremfor å kopiere produktreglene.

## 1. Mål og avgrensning

Leo går i 4. klasse. Han skal møte engasjerende matematikk, forstå hva han gjør og kunne fortsette uten mye hjelp fra forelder. LK20 er faglig grunnlag. Et riktig tall eller en fullført animasjon alene dokumenterer ikke forståelse. Automatiske tester dokumenterer ikke læringseffekt eller Leos engasjement.

Første verden er Star Wars; første kapittel er **Star Wars: Darth Vaders felle**, med fire deler og fem hovedoppgaver i hver. Det reviderte [manuset med oppgaver](chapters/star-wars-v2.md) definerer historie, kontrollerte tall, støtte og ressurser. Dette er et utvalg læringsmål, ikke hele årsprogrammet. Vi bygger ikke en stor katalog før dette kapitlet fungerer.

K0 og K1 er historiske leveranser. Ny bestilling etter utprøving: bygg hele den reviderte historien med 20 steg, realistiske bilder, ett samlet tekstfelt med oppgaven i fet skrift til slutt, Kraften som samtalepartner og lyssabelrespons med automatisk videreføring. K2 implementerer dette; [verifisering og begrensninger](K2-VERIFICATION.md) skiller kode, lokale tester og hosted/modellevaluering. Ingen betalte modelltester eller produksjonsutrulling er bestilt.

## 2. Innhold og elevreise

Historie, illustrasjoner og animasjonsopplegg utarbeides og kontrolleres under utvikling, versjoneres og gjenbrukes under spill. KI kan bistå utviklingen. Under spilling lager KI-læreren veiledning, ikke nye kapitler eller bilder. Fritt interessefelt kan fortsatt være profilinformasjon; det er ikke et løfte om automatisk innhold for alle interesser.

Elevreisen blir: åpne tilgjengelig verden → start eller fortsett lagret kapittel → oppgave og relevant støtte → synlig konsekvens → fortsett eller pause. Ett kapittel kan gå over flere økter. Lagre aktiv hovedoppgave, variant, handlinger, hjelp, vurdering og faktisk fullførte hendelser. Planlagt slutt er aldri historikk. Lagret innholdsversjon må kunne gjenopptas etter en oppdatering.

Fri kapittelproduksjon under spilling, progressiv publisering av modellfragmenter, automatisk nesteproduksjon ved 70 prosent, 90-sekunders genereringsfrist og 1 kr per generert kapittel er opphevet som produktkrav. Koden har fortsatt disse løpene frem til senere erstatning. Kostnadsvernet for lærer og tale beholdes.

Elevforsiden viser ett Star Wars-valg, uten interessevalg, fri kapittelproduksjon eller gammel kart-/medaljonginngang. `/leo/stjerneoppdrag` er den nye hovedreisen. Gamle data og leseløp bevares i overgang; de eldre flatene er ulenket fra forsiden. Ikke bygg ny worker, researchpipeline, innholdsstudio eller generisk spillmotor for første kapittel.

## 3. Undervisning, øving og forståelse

Planlegg fleksibel bevegelse mellom handling/visuell modell, ord, matematisk uttrykk og en ny oppgave med mindre støtte. Dette er ingen obligatorisk firetrinns skjermsekvens. Fremhev samme gruppe, ord og faktor eller divisor. Ved divisjon må betydningen av divisor passe delingsdivisjon eller målingsdivisjon.

Tre moduser skal håndheves i kode:

| Modus             | Hva læreren kan gjøre                                                 | Hva resultatet betyr                                           |
| ----------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| Undervisning      | Forklare direkte, vise et kontrollert steg eller fullstendig eksempel | Gjennomgått innhold; ingen selvstendig mestringsevidens        |
| Veiledet øving    | Stille et relevant spørsmål, gi støtte og bytte representasjon        | Hjulpet øving; hjelp følger forsøket                           |
| Selvstendig prøve | La Leo forsøke; hjelp er tilgjengelig, men gjør forsøket hjulpet      | Bare uassisterte, kontrollerte svar kan gi selvstendig evidens |

Bruk korte forståelsesspørsmål på utvalgte steder i kapittelplanen. Registrer spørsmål, hensikt, svar og tidligere støtte. Godta relevante handlinger, korte muntlige/tekstlige svar, markering og tilgjengelige valg. Et tilfeldig riktig valg eller gjengitt tall gir ikke alene forståelsesgodkjenning. Tale skal kunne korrigeres før vurdering.

Still høyst ett oppfølgingsspørsmål til samme probe. Ved fortsatt uklarhet eller «vet ikke»: forklar direkte eller vis et gjennomarbeidet eksempel, merk forsøket som hjulpet og la historien gå videre etter veiledet fullføring. Senere selvstendig overføring kan undersøke forståelsen igjen. Leo skal ikke skrive etter hver oppgave eller låses i en spørsmålsløkke.

Vanlige elevspørsmål er samtale. Et svar på lærerens forståelsesspørsmål er en separat hendelse med oppgave-ID og probe-ID. Forståelsesvurdering skiller relevant sammenheng, delvis evidens og utilstrekkelig/ikke vurdert evidens. Manglende evidens betyr ikke manglende evne. KI kan tolke språk; motoren kontrollerer matematikk, hjelp og mestring.

## 4. Matematisk og pedagogisk kontroll

Hver oppgave har eksakte gitte tall, enheter, fasit, semantisk gyldige løsningsmåter og støttevariant. Matematikk kontrolleres uavhengig av KI før publisering og ved svar. En vilkårlig likeverdig verdi er ikke nok når oppgaven spør etter en bestemt modell, fordeling eller begrunnelse. Geometri og algoritmer trenger egne kontroller, ikke bare beregning av et talluttrykk.

Læreplankoblinger og forkunnskaper står i [kapittelgrunnlaget](curriculum/chapter-pedagogy.md), med Udir-kilder. Arealmåling er repetisjon fra 3. trinn. Volum med ikke-standardiserte og standardiserte enheter er et mål etter 4. trinn. Telling av enhetsruter og lag av enhetskuber er gyldige strategier; ikke krev uforklarte formler.

Bevar motorens ferdighetsgraf, uavhengige svarvurdering, repetisjon, frustrasjonsvern og motorstyrte mestring/medaljong. Kapittelfullføring er historieprogresjon, ingen automatisk medaljong eller årsmestring. En fast hovedløype betyr ikke fast støtte: forberedte støttevarianter og mindre bildestøtte velges etter faktisk hjelp og tidligere svar. Hint og støtte er ikke nye obligatoriske hovedoppgaver.

## 5. Visuell retning

Et filmatisk eventyr for nettbrett med realistiske, forberedte stemningsbilder og enkle 2D-kontroller. Leo har lyst, bustete hår. Historie og oppgave står samlet, med oppgaven i fet skrift til slutt. Kraften vises som et lysende magisk felt, og riktig-/suksessmeldingen inngår i dialogen nær oppgaven. En lyssabel tennes over svarflaten ved riktig svar; neste oppdrag kommer automatisk etter åtte sekunder. «Bli her litt» stopper overgangen. Pause og redusert bevegelse beholdes. Ingen fri bevegelse eller avansert 3D-spillverden. En kontrollert roterbar figur kan brukes som matematisk modell.

Stemningsbilder og figurillustrasjoner bærer fortellingen. Tellbare objekter, grupper, rutenett, figurkanter og faglige størrelser tegnes av programmet fra autoritative data. Ingen telling i et generert bakgrunnsbilde. Scene og regneuttrykk kan stå side om side; fremhev forbindelsen og reduser støtten ved senere oppgaver.

Ved feil: tydelig symbol og kort tekst, konkret markering av hva som trenger arbeid, og animasjon som viser ubalansen eller det aktuelle steget. Behold elevens arbeid. Ingen tap av liv, hån eller straff. Ved riktig: tydelig bekreftelse og relevant konsekvens som åpner fluktvei, balanserer grupper eller slår av et felt. Farge alene er aldri signalet. Redusert bevegelse viser samme informasjon med statiske tilstander og tekst. Pause er alltid tilgjengelig.

Elevtekst er kort bokmål. Bruk lesbar tekst, minst 48 px berøringsmål, tastaturalternativ til drahandlinger, tekstalternativ til lyd og tydelig fokus. Tale/opplesing følger synlig oppgave og lærerbeskjed.

## 6. Historie og ressurser

Leo er en ung jedi som trener med Luke. Navngitte historiefigurer er bare Luke Skywalker, Leia, Darth Vader, Han Solo, Chewbacca og R2-D2. Samtalepartneren i den nye flaten heter Kraften. Eksisterende profilnavn endres ikke i lagring. Ingen andre navngitte personer introduseres.

Fire deler: innflyging gjennom asteroidefeltet, inn på Star Destroyeren og befri Leia, avslør Vaders felle og stans traktorstråle/angrep, deretter flukt og hyperrom. Tvisten er at Vader lot nødmeldingen slippe ut for å lokke Luke dit. Luke holder Vader tilbake mens Leo, Leia og R2-D2 handler. Han og Chewbacca holder Falcon klar; Luke rekker skipet før sluttspranget.

Fare og kamp kan være dramatisk uten grafiske skildringer. Matematikk og scenens behov planlegges samlet. Ressurslisten i kapittelplanen angir få gjenbrukbare bakgrunner, figurer, kontrollerte matteobjekter og animasjoner. Den er en produksjonsbestilling, ikke påstand om ferdige bilder.

## 7. Lærerens runtime-kontrakt

Læreren skal kjenne faktisk oppgave, synlige mengder, matematisk modell, synlig uttrykk, elevhandlinger, tidligere hjelp og kontrollert svarvurdering. Kontekst bygges på serveren, aldri fra elevens påstand om godkjenning. Hold framtidige scener og skjult fasit utenfor vanlig elevprojeksjon. Kontrollert løsningshjelp kan bare slippes gjennom i tillatt modus.

Det [inaktive lærerutkastet og kodekartet](TUTOR-DRAFT.md) definerer neste kontrakt, konteksteksempel og nødvendige endringer. Ikke last det som systemprompt før kontekst, skjema, hendelser, vurdering, hjelperegistrering og guards er bygget og kontrollert samlet. `tutor.v2.md` gjelder fortsatt eldre øving. K1 beholder `prepared-tutor.v1` på den arkiverte prøveflaten. K2 bruker separat `force-tutor.v1`: korte genererte samtalesvar med faktisk oppgave, elevhandling, hjelp og autoritativ vurdering. Moderering, servereid tallgrunnlag og kontroll av skrevne ligninger gjelder før visning; dette er ingen garanti for alle naturlige språkutsagn. Ved feil/budsjettstopp brukes et merket forfatterhint. [K2-kontrollen](K2-VERIFICATION.md) angir grensene. Frie forståelsesprober fra K1 er ikke overført som matematisk forståelsesgodkjenning i K2. Det generelle lærerutkastet er ikke lastet uendret som runtime.

## 8. Gjenbruk og tekniske rammer

Behold Next.js/TypeScript/Zod, deterministisk motor uten I/O, serverbasert KI, elevprofil, innlogging/Leo-lås/PIN, lagring, foreldrefunksjoner, tale og kostnadsstyring. Gjenbruk komponenter for svar, grupper, figurer og tilgjengelighet der de passer. Lokale UI-klikk er ikke lagret forståelsesevidens før en validert handlingskontrakt finnes.

Foreldredashbordets tid, innsyn, profilkontroll, budsjett, eksport og sletting skal fortsatt dekke dataene. Nye oppgave-/probehendelser må med før varig bruk. Ingen nøkler eller fasit i klientkode. Bevar husholdningsgrenser, moderering og dataminimering; elevtekst og kilder er data. Leverandør- og regionkrav til eksisterende lagring endres ikke.

Motorens mestringsgrenser og flere-dager-krav beholdes. Ny moduskontrakt hindrer at undervisning eller hjelpet fullføring teller som uassistert resultat. Ikke senk terskler for å få historien videre. Historien kan fullføres veiledet uten at ferdigheten er mestret.

## 9. Kostnad og tilgang

Gjenbrukt historie og illustrasjoner trenger ingen ny modellproduksjon per spilling. Lærer, forståelsesvurdering og tale bruker eksisterende kostnadsreservasjon, husholdningsbudsjett, rategrenser, logging og cache. Ved feil eller tomt budsjett finnes kontrollert lokal støtte; dette tildeler ikke forståelse som ikke er vurdert. Ingen automatisk oppgradering til dyrere modell.

Ingen betalt modelltest her. Senere ekte tester krever avtalt mandat og samme varige testregnskap; siste registrerte historiske sum er 8,24392525 kr av 10 kr, ikke kontrollert på nytt mot tjenesten her. Gamle 30/50 kr-runder gir ingen ny ramme. [AI-COSTS](AI-COSTS.md) skiller historiske priseksempler fra dagens retning.

Ingen produksjonsmerge, migrasjon eller endring av produksjonsvariabler uten autorisasjon. Migrasjoner er append-only via Actions; ingen SQL via connector. Dette dokumentarbeidet trenger ikke nye hemmeligheter, testkonto eller manuell lærergodkjenning.

## 10. Verifisering og neste leveranse

Dokumentasjonsleveransen skal ha 20 komplette hovedoppgaver, kontrollerte svar/enheter og tolkninger, konsistente lenker og tydelig status. Uavhengig pedagogisk gjennomgang er utviklingsarbeid, ingen bestilling til forelder om å skaffe ekspertpanel.

Gjeldende leveranse er hele den reviderte løypen **SW01–SW20**, med 19 matematikk-/modelloppgaver og ett avslutningsvalg. Kontroller feil → hjelp → riktig → synlig konsekvens → automatisk neste → pause/gjenopptak. Verken riktige tall, logikkvalg eller kapittelfullføring gir automatisk global mestring. Støttevarianter valgt adaptivt og en bredere motorbro er senere arbeid, ikke ferdig i K2. [Byggeplanen](GAME-REVISION.md) angir neste steg.

Rapporter teknisk funksjon, faktisk modellkvalitet og opplevelse separat. Oppgi versjon, scenario og responskilde: ekte modell, mock, direkte kodebestemt svar, fallback eller ukjent. Et grønt bygg eller en plan erstatter ikke en gjennomført elevflyt. Leo kan senere prøve og gi enkel tilbakemelding; ingen formell studie kreves.
