# K3 – bedre samtalehjelp fra Kraften

22. oktober 2026. Arbeidsgren `feat/force-conversation`. PR #25 var åpen ved første GitHub-kontroll og ble merget eksternt under arbeidet. Grenen ble deretter lagt på `origin/main` **b9d1336**. Historie, bilder, oppgaver, hovedflate og lyssabel fra K2 beholdes. Ingen migrasjon, produksjonsmerge eller nye hemmeligheter.

## Konkrete svakheter og rettelser

- Etter et feil svar og videre redigering fikk modellen bare dagens utkast. Nå følger de tre siste innsendte arbeidene med, hver med ny serverberegnet vurdering, separat fra utkastet.
- Samtalen manglet tydelig støtteproveniens. De åtte siste støttehandlingene og et flagg for vist løsning følger nå oppgaven gjennom lagring og pause/gjenopptak. Tredje forfatterhint er også en vist løsning; eldre K2-lagring med nivå 3 tolkes slik.
- Gjentatt «jeg skjønner fortsatt ikke» ga samme reservehint. Reserven bytter mellom et konkret forfattersteg og et tydelig merket enklere eksempel. «Hvorfor» får en kort forklaring av regnearten/handlingen med oppgavens gjenstander. Antall samtaleturer utløser ikke full løsning.
- Tallvernet avviste omtale av Leos feilaktige tall. Et faktisk observert tall kan nå nevnes i den avgrensede setningen `Du skrev «54».` Tallet blir ikke tillatt i utregninger eller andre matematiske påstander. Oppgavens autoritative tallgrunnlag består.
- Ny aktiv prompt `force-tutor.v2` ber om korte bokmålsvar, oppfølging av små samtalesvar og et annet konkret neste steg ved gjentatt misforståelse. V1 beholdes. Prompt, API-referanse og hendelsesversjon er samordnet.

## Kontrakt og grenser

Modellinput har `learnerMessage`, aktuell `work`/`assessment`, `submittedAttempts`, siste åtte godkjente meldinger, `helpHistory`, `solutionShown`, autoritativ løsning og et foreslått reservesteg. Strategien i støttehistorikken beskriver reserveplanen, ikke en KI-vurdert misoppfatning eller en garanti for modellens valgte metode.

Fritekst ligger fortsatt bare i eksisterende oppbevaringsstyrte meldinger. Oppgaveminnet inneholder tall, tillatte kommandoer og oppgavens gyldige valg-id-er. Vilkårlig `choice`-tekst fjernes både før historikklagring og før modellkall, også fra eldre lagring. Umoderert/privat tekst sendes ikke videre eller lagres som elevmelding. Uten tilgjengelig moderering huskes støtteformen og reservestegene, men ikke rå elevtekst. Ingen ny langlivet kopi av dialog innføres.

Hjelp registreres før visning og før leverandørkontakt. API-claim og den endelige turen bruker samme reservesteg uten dobbel støttehistorikk. RequestId/CAS beskytter fremdeles mot dobbelt modellkjøp og sene svar. Vist løsning i samtalen fyller ikke svarflaten og godkjenner ingenting; den eksisterende løsningsknappen fyller som før. Bare serverens svarvurdering kan fullføre oppgaven. Hjulpet arbeid er ikke selvstendig evidens; global mestring/medaljong gis fortsatt ikke av eventyret.

Noen tydelige falske godkjenninger av hele oppgaven og helt identiske svar på «annen måte» avvises til reserve. Bekreftelse av et riktig samtaledelsteg er tillatt. Lignings-/tallvern og slike tekstregler beviser ikke at enhver matematisk formulering i naturlig språk er riktig.

## Observerte kontroller

- Målrettet Vitest: **28 tester i fire filer** består. Nye tester undersøker faktisk modellinput og videre tilstand, ikke bare håndskrevne sluttreplikker. Omfatter feil 54 → redigert 55, lite samtalesvar, gjentatt misforståelse, hvorfor, hint/eksempel/løsning, eldre K2-lagring, pause/gjenopptak, hjulpet/selvstendig registrering, moderering, privattekst, ukjent valgid, fasitvern, modellfeil og API-claim/retry.
- Seks Star Wars-nettlesertester består i Chromium med syntetisk konto/lagring og kodebestemt reservehjelp. Den nye kjeden prøver feil → hint → hvorfor → annen forklaring → pause/reload → ny forklaring → vist løsning → servergodkjent, hjulpet svar. Eksisterende hele 20-stegsløp, animasjon/automatisk overgang, tapt svar/retry, smal skjerm og tale består også.
- Samlet kvalitetspakke, bygg, CI og siste Preview føres nedenfor når observert.

Pedagogy undersøkte prompt, oppgavepakke og hjelp uten modellkall. Konkrete term-/situasjonsfeil i reserveforklaringene ble rettet. Reviewer undersøkte kode og kjørte isolerte syntetiske forløp. Tre P2 ble rettet og etterkontrollert: løsning etter tredje hint, korrekt bekreftelse av delsteg og fritekst i valg-/svarhistorikk. Ingen gjenstående konkrete P1/P2 i undersøkt kode. Hovedagenten kjører app-/nettlesertestene.

## Ekte KI-kvalitet og kostnad

Ingen betalte modelltester er utført eller bestilt. Modellerstatninger verifiserer kontekst, guards og lagring; reserveforløp verifiserer forfatterhjelpen. Dette dokumenterer ikke at ekte Kraften alltid følger opp godt, forklarer matematikk riktig eller engasjerer Leo. Fysisk iPad og læringseffekt er ikke vurdert. Historisk testregnskap videreføres uendret: **8,24392525 kr av 10 kr**, nytt forbruk **0 kr**. Eksisterende Preview-nøkkel gjenbrukes uten endring.

**Hva Thor må gjøre:** Ingen oppsett. Prøv feil svar med et spørsmål, gjenta «jeg skjønner fortsatt ikke», og prøv pause/gjenopptak etter løsningsvisning. Ingen merge er utført av agenten.
