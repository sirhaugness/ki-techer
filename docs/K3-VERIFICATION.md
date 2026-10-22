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
- Full Vitest: **672 tester i 51 filer** består. Full nettleserpakke: **33 bestått, to lokale Auth-tester utelatt** uten separat lokal Supabase. Lint, typecheck, formatering, motorsimulering, produksjonsbygg og diffkontroll består. Lighthouse gir **100/100 på alle 13 visninger**. Produksjonsbyggets filspor inneholder `force-tutor.v2.md`.
- Den nye nettlesertesten venter nå uttrykkelig på synlig utfylt arbeid etter løsningsvisning før den leser API-tilstanden. Playwright-klikk alene venter ikke på lagring; dette ble synlig med faktisk nettverksforsinkelse i hosted-testen. Målrettet omkjøring består etter ventingen.

Pedagogy undersøkte prompt, oppgavepakke og hjelp uten modellkall. Konkrete term-/situasjonsfeil i reserveforklaringene ble rettet. Reviewer undersøkte kode og kjørte isolerte syntetiske forløp. Tre P2 ble rettet og etterkontrollert: løsning etter tredje hint, korrekt bekreftelse av delsteg og fritekst i valg-/svarhistorikk. Ingen gjenstående konkrete P1/P2 i undersøkt kode. Hovedagenten kjører app-/nettlesertestene.

## Preview og CI

[PR #26](https://github.com/sirhaugness/ki-techer/pull/26) er åpen mot main. [Preview](https://ki-techer-cvy4e4dhg-team-thor1.vercel.app/leo/stjerneoppdrag) på runtimecommit **5b1bd14** er READY, deployment `dpl_FYuCXgWvnD9pMdeAqCMTTkYmdSZ1`, Preview-target (API `target: null`, aldri Production). Etterfølgende endringer gjelder dokumentasjon, testens venting og lokal Auth-CI, ikke appkode.

**Innlogget hosted gjennomspilling bestått:** Midlertidig syntetisk Auth-konto, husholdning, elev og enhet i leo-dev; faktisk Preview-app, eksisterende SQL/RPC og nettverk. Foreldreinnlogging/PIN → Leo-lås → feil svar → hint → hvorfor → gjentatt misforståelse → pause/reload → fortsett med samme arbeid/støtte → annen forklaring → vist løsning → serverkontrollert riktig svar → lagret hjulpet fullføring etter ny pause/reload. Siste SQL-kontroll viste `status=correct`, `assisted=true`, `solutionShown=true`, to innsendte svar og fem støttehandlinger. Testelevens budsjett var 0, og kontrollen viste **0 registrerte KI-kall og 0 kr**. Responsene var kodebestemt forfatterreserve. Ingen e-post ble sendt; konto og innlogging ble klargjort syntetisk. Dette tester ikke e-postlevering eller ekte modellkvalitet.

Nettleserens separate CA-lager stolte ikke på miljøets proxysertifikat. Hosted-kjøringen brukte derfor Playwrights Node-baserte forespørsler med miljøets eksisterende CA-tillit og videresendte responsene til nettleseren. TLS-verifisering ble beholdt. Ingen produksjons- eller beskyttelsesinnstilling ble endret. Testtilgangen var midlertidig og ble tilbakekalt. Konto, Auth-sesjoner, husholdning, elev, enheter og læringsøkter ble slettet; etterkontroll viste null i alle seks kategorier. Lokale innloggingsfiler ble fjernet.

[Kvalitetsjobben på 5b1bd14](https://github.com/sirhaugness/ki-techer/actions/runs/39835584384) bestod hele pakken i CI. Dev-migrasjonskontrollen bestod uten ny migrasjon. Den separate `supabase-e2e`-jobben feilet **før app-testene** ved nedlasting av `ghcr.io/supabase/postgres:17.6.1.075` med `toomanyrequests`. En ny kjøring av samme jobb traff samme rategrense. Dette er en konkret gjenstående CI-infrastrukturbegrensning; lokal Auth-e2e i CI skal ikke omtales som bestått for denne leveransen. CI-jobben bruker nå uttrykkelig `public.ecr.aws`, den fastlåste CLI 2.75.0-versjonens standardregister. CLI-kilden er kontrollert, og manifestet for samme Postgres-tag svarte HTTP 200 der. Dette endrer bare isolert Auth-CI, ingen hosted tjeneste, versjon, hemmelighet eller produksjon. Ny kjøring og siste head/status følges i PR-en.

## Ekte KI-kvalitet og kostnad

Ingen betalte modelltester er utført eller bestilt. Modellerstatninger verifiserer kontekst, guards og lagring; reserveforløp verifiserer forfatterhjelpen. Dette dokumenterer ikke at ekte Kraften alltid følger opp godt, forklarer matematikk riktig eller engasjerer Leo. Fysisk iPad og læringseffekt er ikke vurdert. Historisk testregnskap videreføres uendret: **8,24392525 kr av 10 kr**, nytt forbruk **0 kr**. Eksisterende Preview-nøkkel gjenbrukes uten endring.

**Hva Thor må gjøre:** Ingen oppsett. Prøv feil svar med et spørsmål, gjenta «jeg skjønner fortsatt ikke», og prøv pause/gjenopptak etter løsningsvisning. Ingen merge er utført av agenten.
