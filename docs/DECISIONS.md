# Beslutninger

## M0

- `docs/SPEC.md` var tom (ett linjeskift). Rotfilen `SPEC.md` inneholdt hele
  spesifikasjonen og er kopiert uendret til `docs/SPEC.md`, som er kanonisk fremover.
- M0 lager bare grunnmuren og en ærlig startside. Ingen API-kall, innlogging,
  databasemigrasjoner eller læringsmotor før de respektive milepælene.
- Tailwind 4 og shadcn/ui med CSS-variabler, aliaser og en Button-komponent.
  Systemskrift brukes slik at bygg og visning ikke trenger Google Fonts.
- Modellverdiene i `.env.example` er forslag, ikke bekreftet tilgang eller priser.
  GPT-5.2 foreslås til tutor/refleksjon; GPT-5 mini til korte oppgaver. Tale har
  egne modeller. Valgene må vurderes med scenarioevaluering i M4/M6 og kan endres
  kun i miljøvariabler. Ingen modellnavn er hardkodet i appen.
- Vitest bruker MSW og avviser alle umockede HTTP-kall. Playwright tillater bare
  den lokale appen og blokkerer eksterne forespørsler. Ingen test krever nøkler.
- `simulate` og `eval:agent` dokumenteres, men implementeres først i M3/M4.
  Ekte modellevaluering skal være et eksplisitt, separat valg og aldri del av CI.
- Læreplantekster og kontroll mot Udir hører til M2. M0 oppretter kildemappen.
- Installerte stabile versjoner er låst i `package.json` og `package-lock.json`,
  blant annet Next.js 16.4.0 og React 19.3.0. CI bruker Node.js 24 fordi de nyeste
  testverktøyene krever minst Node.js 22.22.2 eller 24.15.0.
- Playwright kan bruke en ferdig installert Chromium via testverktøyets
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Dette er ikke en appvariabel i `.env.example`.
  I skymiljøet var Playwrights nedlastingsdomene blokkert; lokal Chromium ble brukt.

---

# Beslutninger

## Grunnlag (10. oktober 2026)

`docs/SPEC.md` var tom og `docs/PROGRESS.md` manglet. Den fullstendige rotfilen `SPEC.md` er kopiert til `docs/SPEC.md`, som er arbeidsgrunnlaget. M0 var ikke implementert: nødvendige M0-verktøy bygges sammen med M1, med egen testbar grunnmur. Ingen ekte KI-kall trengs før M4.

## M1

- Magisk lenke med Supabase Auth og PKCE/SSR. Forelder oppretter husholdning atomisk via RPC. Leo trenger ingen egen konto.
- PIN hashes med scrypt og tilfeldig salt, i separat `parent_secrets`-tabell uten klienttilgang. Fire sifre etter spesifikasjonen. Fem feil gir 15 minutters sperre. PIN-innstillinger, låsing og opplåsing kjøres bare på serveren.
- En tilfeldig, HttpOnly enhets-ID knytter Leo-modus til nettleseren. Låsen lagres i databasen, overlever refresh, og kontrolleres også ved server actions. Ny nettleser starter som forelder. PIN er UI-lås, ikke en erstatning for Auth/RLS.
- Alle tabeller har RLS. Husholdningsgrenser gjelder også på fremmednøkler. Referansedata er lesbare for innloggede, kun serveren kan endre dem. `ai_calls` får husholdnings-ID; PIN- og driftsdata er ikke klientlesbare.
- RLS testes på ekte PostgreSQL-semantikk via PGlite (Postgres i WASM), med lokal testimplementasjon av `auth.uid()` og rollene fra Supabase. GitHub CI kjører også mot lokal Supabase gjennom CLI.

## M2

- 35 ferdigheter: 7 i Basecamp og 7 i hver medaljongdel. Intern DAG; del 4 har ingen avhengighet til andre deler. Deltilgang (Basecamp → 1 → 2, 1 → 3, 4 alltid tilgjengelig) håndheves i M3 i tillegg til enkeltferdighetenes forkunnskaper.
- MAT01-06 kontrollert mot Udirs aktuelle sider. Volum og mønstre legges i del 4. Areal hører til 3. trinn. Modellering omfatter overslag og kritisk vurdering; dette dekkes med egne ferdigheter. Lokale mål-ID-er merkes som lokale. Kilder og komplett måltekst for 3.–5. trinn i `docs/curriculum/mat01-06.md`.
- Alle generatorer er rene, seedbare og har fem nivåer. Svar støtter tall, flervalg, rest, sekvens og koordinat. Forklaringsferdigheten har et kontrollerbart strategivalg; fritekstforståelse skal vurderes separat i M4 og kan ikke godkjennes som forståelse=2 fra flervalget alene.
- Generatorene varierer tall, representasjoner eller algoritmelengde etter nivå. Dette er en startkalibrering, ikke empirisk validerte vanskelighetsparametere. Generering avviser gjentatte parametere; hvis RNG ikke gir variasjon, feiler den eksplisitt etter 32 forsøk.
- Læreplan og graf lagres i en SQL-migrasjon, ikke bare `seed.sql`, slik at `supabase db push` installerer referansedata også i prod. En drift-test kontrollerer at SQL-snapshot og TypeScript stemmer overens.

## Integrasjon med M0 som ble merget under arbeidet

Da arbeidsmiljøet startet, var main fremdeles på `7b5af4b` uten M0. Mens M3 ble implementert, var M0-mergen `4c4126c` tilgjengelig. Den er merget inn i arbeidsgrenen. M0s historikk, regler, MSW/React Testing Library og miljøkontrakt beholdes; forside-testene følger nå M1s innlogging. Pakkeversjonene låses, med eksisterende M0-versjoner på felles avhengigheter.

M0s Supabase-navn (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) beholdes også i M1-koden og oppsettveiledningen. `APP_URL` er én nødvendig ekstra variabel for kontrollert callback-adresse. Lokale Supabase JWT-testnøkler kan brukes som verdier i de samme variablene. Ingen ekte OpenAI-kall er lagt til. Full CI-e2e bruker lokal Supabase, mens den eksplisitt bestilte migrasjonsworkflowen er den eneste jobben med ekte Supabase-hemmeligheter.

## M3

- Motoren er ren og får klokke, hendelses-ID og RNG som argumenter. Oslo-kalenderdager brukes for mestring og mesterutfordringer, også rundt sommertid. Idempotente forsøk og hint-hendelser hindrer dobbel bokføring.
- K er 0,6 for de første fem forsøkene, deretter en eksponentielt avtagende verdi mot 0,2. Mestring trenger sannsynlighet, siste fem forsøk, minst to hintfrie dager og vurdering/forståelse. En bekreftet ferdighet beholdes, mens feil fortsatt senker theta og styrer repetisjon og misoppfatningsarbeid.
- FSRS har fuzz av for reproduserbarhet. Kort serialiseres som JSON med ISO-tider. Også ferdigheter i tildelte deler får repetisjon.
- Kandidater respekterer både deltilgang og DAG. ZPD velges blant fem diskrete nivåer; dersom ingen nivåer gir 70–85 %, brukes nivået nærmest 77,5 %, uten å påstå at intervallet alltid kan nås. 3–6 kandidater gis når nok trygge oppgaver finnes; ellers færre eller ingen.
- Blandet øving håndheves fra første hovedferdighet i økta, med en rullerende blokk på ti oppgaver. Før en blokk er full er minstekravet `floor(0,3 × antall)`; ved ti er minst tre fra andre ferdigheter. Oppvarming teller ikke i denne kvoten.
- Etter to feil kreves lettere nivå eller ny representasjon. Etter tre feil kreves nivå 1 med forventet treff minst 85 %, deretter tilbud om pause/gåte. Konkret → bilde → tall gjelder ved introduksjon. Hvis ingen oppgave møter harde regler, får agenten ingen kandidat og må håndtere pause/fallback i M4.
- Første feil gir åpent spørsmål på hintnivå 0. Neste feil eller eksplisitt hintønske kan heve nivået. Nivå 4 er øvre grense. Fasit-lekkasjekontroll av KI-tekst kommer i M4, siden det ikke finnes KI-dialog i M3.
- En mesterutfordring har 8–10 unike oppgaver, dekker alle ferdigheter i delen, bruker nivå 3, krever null hint og minst 80 % riktig. Tidligst neste Oslo-dag etter siste mestring; nytt forsøk tidligst neste dag. Feil gir målrettede ferdigheter. Tildeling tas aldri tilbake.
- Egne modelloppgaver begrenses til skalar heltallsaritmetikk med en AST-tillatelsesliste. Funksjoner, opphøying, variabler, tilordning, matriser og objektoppslag avvises før evaluering. Gangetabeller har egne tallgrenser. Rest-, geometri- og algoritmeoppgaver bruker foreløpig generatorene. Matematisk kontroll erstatter ikke moderering eller semantisk tekstkontroll i M4.
- Simuleringen har tre separate forsøk, alle med 200 økter: kalibrering av stasjonære skjulte ferdigheter (tre elevprofiler), preferanselæring med syntetiske signaler, og en lærende elev med eksplisitt vekstkurve. Svar trekkes fra skjult sannsynlighet og kontrolleres med generatorfasit; de tvinges ikke til å bli riktige. Progresjonseleven bruker kandidat-/oppgaveregler og mesterutfordringer. Statistikken er en reproducerbar regresjonstest, ikke dokumentasjon på effekt for virkelige barn.
- M3-migrasjonen legger til felt for datoer, hendelses-ID-er, forståelse og mesterutfordringsstatus. M4 skal koble disse til serverens persisteringslag; motoren er ennå ikke koblet til matteøkter i UI.

## Rettelser fra full CI

- Auth-callback bruker den validerte `APP_URL` både ved suksess og feil. Next.js 16 normaliserte `request.url` til localhost i lokal kjøring selv om nettleseren brukte 127.0.0.1. Det skiftet cookie-domene og mistet sesjonen. En reell nettlesertest og en enhetstest med ulik intern/ekstern vert kontrollerer regresjonen. Manglende/ugyldig APP_URL gir 503; kun HTTP/HTTPS godtas.
- Hele 200-økters simuleringen har 120 sekunders testgrense. En delt GitHub-runner brukte 31,6 sekunder og overskred den opprinnelige grensen på 30 sekunder; resultatkravene er uendret. Full Auth-e2e starter bare de lokale tjenestene den bruker: PostgreSQL, Auth, REST, Kong og Mailpit.

## Automatisk innloggingsadresse på Preview og produksjon

`APP_URL` er nå valgfri etter at Preview stoppet uten denne variabelen. Felles server-only `authOrigin` brukes både for e-postlenken og callback-redirect: gyldig eksplisitt APP_URL → forespørselens eksterne Host → innebygd VERCEL_URL → request.url hvis ingen andre kilder finnes. Vercels forwarded host godtas bare på Vercel; andre miljøer bruker Host. Eksterne adresser bruker HTTPS, og localhost/127.0.0.1/IPv6-loopback støtter lokal HTTP. Vert med URL, sti, brukerinfo eller komma avvises. En feil eksplisitt overstyring avvises i stedet for å skjules. Supabase Redirect URLs må fortsatt tillate callback på adressen brukeren åpner. Full Auth-e2e og smoke-test kjører med tom APP_URL for å kontrollere den automatiske flyten.

## Feil ved sending av innloggings-e-post

Supabase Auth-feilkoder gir konkrete norske meldinger ved SMTP-begrensning, sendegrense, deaktivert e-post/OTP, avslått registrering, ugyldig adresse, CAPTCHA og feil API-nøkkel. Ukjente feil henviser til Auth-loggen. Bare kode i formatet `[a-z_]{1,64}` og HTTP-status logges; rå provider-melding, e-post, nøkler og lenker eksponeres ikke. Skjermbildet med den tidligere generiske meldingen bekrefter ikke én bestemt årsak. Ekte e-postlevering kan ikke fastslås fra CI med lokal Mailpit; hosted Supabase må også ha fungerende e-postoppsett.

## M4 — sikker agentintegrasjon

- Brukerens spesifikasjon krever en applikasjonseid Responses-løkke; ingen ny hosted agentplattform eller Agents SDK innføres.
- OpenAI `store:false` kombineres med eksplisitt replay av verktøykall/resultater og krypterte reasoning-elementer innen én tur. Modellnavn kommer bare fra de avtalte miljøvariablene. Norsk verktøynavn beholdes internt; API-navnet bruker ASCII.
- Fasitkontroll av tall beviser ikke at en KI-fortelling betyr det samme. Derfor må kontekstualisering bevare generatorspørsmålet ordrett og bare legge til en kort tallfri ramme. Egne oppgaver tillates bare som transparente uttrykkspørsmål etter AST-, ferdighets- og modereringskontroll.
- Før hintnivå 4 avvises numeriske påstander i samtaletekst konservativt. Kontrollerte spørsmål og manipulativer vises separat. Modereringsfeil tillater ikke fritekst til modellen; generatorer og ferdige tekster fungerer fortsatt.
- Kostnader estimeres konservativt til 100 NOK / million input-tokens og 400 NOK / million output-tokens; dette er et estimat, ikke fakturagrunnlag. Oppdatert modellspesifikk pris/budsjettherding hører til M9.
- Observasjonsverktøyet legger forslag i kø; det overstyrer aldri forelderens profil. Full flette-/refleksjonsmotor hører til M7. Skoletemaer støtter sikker, konservativ nøkkelordmapping med terskel 0,6 og sju dagers utløp.
- Nøkkelen beholdes i Vercel etter brukerens uttrykkelige valg. Ekte agent-eval kan derfor ikke erklæres bestått i dette miljøet; alle kvalitetstester bruker mocks.

## M5 — varige økter og nettbrett

- Motorens fullstendige snapshot ligger i sessions.engine_state og overføres mellom økter. Den samme transaksjonen speiler evidens til fagtabeller for innsyn; klienten får bare en eksplisitt offentlig visning. KI-kall skjer før radlåsen tas, slik at eksterne svartider ikke holder databaselåser.
- Én åpen økt per elev hindrer at to enheter overskriver hverandres mestring. Revisjon + requestId sikrer gamle svar og dobbelttrykk. Ny sideinnlasting gjenopptar oppgaven med samme ID og hint-tilstand.
- Kartleggingen har ti varierte oppgaver med adaptiv vanskegrad, ikke en medaljongprøve. Den øker bare start-theta ved riktig uten hint. Den oppretter ingen mestringsevidens. Forelderstyrt ny kartlegging og fullt dashbord kommer i M8.
- En regelstyrt fallback-lærer bruker samme foreslå_mestring-verktøy og doble datakrav som KI-en; dette gjør at mestring kan fortsette uten KI. Slike forslag merkes som regelstyrte i loggen. Forklaringer knyttes til eksisterende, selvstendig riktige forsøk uten å øke antall forsøk.
- Neste oppgave velges ved Leos eksplisitte knapp. KI-en kan ikke bytte oppgave midt i et svar-/hint-/forklaringsturn eller flytte gammelt hintnivå til en ny oppgave.
- Bildeinteresser er kontrollerte apptekster. Egendefinerte interesser og endrede lærernavn krever fungerende moderering; ved feil beholdes tidligere valg. Full interessevekting, profilfletting og fortellingskapitler kommer i M7.
- Nettbretttestene bruker den samme øktmotoren og UI-en med minnelagring i en eksplisitt utviklingsfixture. SQL-lagring/RLS testes separat i PostgreSQL og innlogget matteflyt i lokal-Supabase-CI. Testfixturen er utilgjengelig i produksjon.

## M6 — tale og iPad

- OpenAI TTS og STT bruker kun miljøstyrte modeller/stemme og servernøkkel. Ingen nye miljønavn er innført. API-klienten har 20 sekunders tidsgrense og ingen skjulte SDK-retries.
- All lærertekst på hjem/økt/avslutning kan leses høyt. Første brukertrykk aktiverer lydavspilling på iOS; auto-opplesing krever dette trykket per lastet side. Norsk speechSynthesis er reserve dersom serverlyd er utilgjengelig.
- TTS-ruten aksepterer bare kilde, økt-ID og revisjon, aldri klientvalgt tekst. Privat lydcache er avgrenset per husholdning, tekst, modell og stemme. Storage-bøtten opprettes privat ved første skriving; cachefeil hindrer ikke fersk opplesing.
- MediaRecorder velger MP4 på Safari og WebM/Opus der det støttes. Opptak stopper ved slipp, avbrudd, skjult side og senest 30 sekunder. Slipp mens tillatelsesdialogen er åpen starter ikke et skjult opptak.
- Transkripsjon vises og kan rettes. Bare entydige tall/rest/koordinater eller faktiske svaralternativer kan sendes som talesvar, med eksplisitt bekreftelse. Lydopptak lagres ikke hos appen; trykk mikrofon stopper lærerens opplesing.
- TTS/STT-kostnader logges som grove estimater, ikke fakturabeløp: TTS 0,30 NOK per 1000 tegn, STT 2 NOK per MB opptak. Pris-/budsjettstyring og opprydding er M9. Vercel-funksjoner velger Stockholm (`arn1`) i EU.
- Automatisk verifisering bruker falsk mikrofon og lydfixture, pluss codec-/avbrudds-/tilgangstester. Fysisk iPad Safari/Chrome, ekte norsk uttale og ekte modell-eval krever Preview-test og kan ikke erklæres bestått av mock-resultater.

Fasitvernet deler én kontroll for matematiske tallpåstander mellom samtaler og interesseinnramming. Unicode-tall og sammensatte norske tallord/brøkord avvises før hintnivå 4, også når de ikke matcher fasiten direkte. Iterativ ordsegmentering unngår eksponentiell regex-backtracking. Vanlig «en/et» alene kan brukes i rammetekst med mindre det faktisk røper svaret én. Ukontrollerte matematiske påstander fra KI-en erstattes med betrodd fallback eller det opprinnelige generatorspørsmålet.

## M7 — profil og fortelling (11. oktober 2026)

Refleksjon bruker `OPENAI_MODEL_REFLECT`, godkjente meldingsutdrag, øktstatistikk, verktøynavn/resultatstatus, bandit og eksisterende observasjoner. Fasit, rå verktøyargumenter og sensitiv tekst sendes ikke med. To nye forsøk ved feil; deretter et nøkternt sammendrag uten oppdiktede profilfakta. Nexts `after` kjører etter lagret avslutning. Databasefelt for ventende/reflektert økt og fem minutters lease gjør at neste hjem-besøk kan plukke opp avbrutt arbeid.

Fletting og interesseoppdatering skjer i én service-only SQL-transaksjon. Modellen kan foreslå operasjoner, men får ikke bestemme confidence: start 0,4, ny økt +0,15, motbevis −0,2, arkiv under 0,2 og maks 25 aktive/låste. Samme økt teller én gang per observasjon. «Arkiver» behandles som motbevis, slik at modellen ikke kan omgå terskelen. Låste, avviste og arkiverte observasjoner endres aldri automatisk. Forelders profilendringer skal bruke samme elevlås. Agentkonteksten bruker bare aktive med confidence ≥0,6 og låste.

Interessevekt oppdateres forsiktig fra Leos rapporterte slutthumør, med vekt avgrenset til 0,25–3. Riktige svar er ikke et engasjementsmål. Disse opprinnelige valgene om interessevariasjon og øktbaserte kapitler er erstattet av beslutningen om selvvalgt eventyr nedenfor. Skoletema modereres og gjenkjennes konservativt for divisjon, multiplikasjon, geometri og algoritmer; usikre temaer lagres ikke. Temaet påvirker kandidater bare i sju dager. «Vet ikke» er alltid et greit svar.

## M8 — forelders innsyn og personvern (11. oktober 2026)

Alle foreldresider, eksport, diplom og mutasjoner sjekker både innlogging, Leo-lås og medlemskap i elevens husholdning før servernøkkelen brukes. Nye RPC-er er service-only og security invoker. Dashbordet viser 20 økter per side, de siste 100 sikkerhetsflaggene og to uker med trender; detaljinnsyn og JSON-eksport aggregeres i SQL slik at Supabases REST-grense ikke kutter bort historikk. Eksport inkluderer referansedata og lydcache-referanser, men aldri PIN-hash, nøkler eller innloggingstokener.

Forelders profilendringer bruker samme elevlås som refleksjon. Redigering beholder bevislenker og merkes som forelders endring; låst/avvist beskyttes mot automatikk. Ny kartlegging tillates bare etter avsluttet økt og bevarer mestring og medaljong. Diplomet krever lagret tildeling og har A4-layout uten navigasjon på utskrift.

«Slett alle appdata» fjerner hele husholdningens elevprofiler og avhengige læringsdata, PIN, forbrukslogger og privat lyd, men beholder innloggingskontoen slik at forelder kan starte på nytt. En separat bekreftet handling på profilsiden sletter også den aktuelle forelders Auth-konto etter global utlogging. Den sletter ikke en annen forelders innloggingskonto. Appdatasletting starter med en varig ryddeflagg; ved Storage-feil kan forelder prøve igjen. Databasegrenser avviser gamle økt-/lydforespørsler etter en personvern-nullstilling. Gamle samtalelogger slettes også fra øktsnapshotets meldingskopi, mens matematisk evidens bevares.

## M9 — grenser og opprydding

Månedsbudsjett følger Europe/Oslo, per husholdning. Laveste elevgrense og Vercels overgrense gjelder. 80 % gir foreldervarsel; 100 % eller utilgjengelig budsjettkontroll gir deterministisk læring uten betalte KI-kall. PostgreSQL reserverer et konservativt beløp under radlås før hvert kall og frigir bare kjent ubrukt beløp. Timeout beholder reservasjonen. Estimatet er ikke en leverandørfaktura; budsjettet verner mot samtidige kall og merker perioden selv ved månedsbytte.

Rate limiting lagres per autorisert låst enhet/minutt: 30 app-, 12 TTS- og 6 STT-forespørsler. Faktisk strømstørrelse begrenses, også uten Content-Length. Eleven får vennlig beskjed og kan bruke tastatur ved talefeil. Cached lyd/enhetsstemme kan brukes selv om nye KI-kall er stoppet. Forelders tale-av går foran dette.

Oppbevaring ryddes ved autorisert besøk fremfor en ny cron-tjeneste: samtaler/verktøylogger etter valgt 1–36 måneder, skoletema etter 7 dager, privat opplesingslyd etter 30 dager (maks 100 per besøk), reservasjoner etter 12 måneder, månedsrader etter 24 måneder og minuttellere etter 2 timer. Mestring beholdes. Eksport og sletting omfatter også de nye tekniske tabellene. Inaktive kontoer ryddes ved neste besøk; dette er eksplisitt i personvern/deploy-veiledning.

Lighthouse legges i lokal fullsjekk og CI med mock-only server og lagrede rapporter. Automatisk tilgjengelighet er kontrollert på seks visninger; faktisk iPad, skjermleser, KI-uttale og hosted Preview må vurderes separat. Ingen nye miljønavn eller produksjonsendringer.

Fallback bevarer M4s forståelsesvern: en fritekstforklaring får ikke forståelse=2 uten godkjent rubrikk. Øvingssvar, hint, eksisterende mestring og tilgjengelige mesterutfordringer virker fortsatt, og tildeling er testet med null-provider. Ingen budsjettregel gir gratis mestring; ny forståelsesvurdering venter på fungerende KI.

Hosted Supabase tildeler også direkte EXECUTE til anon ved funksjonsopprettelse. M1s PUBLIC-revoke er supplert med eksplisitt anon-revoke for de tre auth.uid()-avgrensede bootstrap/RLS-funksjonene. PGlite-testene etterligner disse default-grantene og krever at ingen SECURITY DEFINER-funksjon er anonymt kjørbar. Dette ble funnet ved M9s hosted advisor-kontroll; migrasjonen er en ny fil fordi de tidligere allerede er brukt på dev.

## Lærer ved pulten og selvvalgt eventyr (2026-10-12)

Engasjement og faktisk læring er hovedmål. Den eksisterende generator-, mestrings-, PIN- og transaksjonsmotoren beholdes. Spørsmål er en separat `ask`-hendelse. Lærerhjelp har ingen verktøy som kan skifte oppgave, avslutte økten eller foreslå mestring. Oppgave, siste svar og spørsmål/hjelp følger med i modellkonteksten. Manglende moderering skjuler fritekst fra lagring/modell; de faste snarveiene og kontrollerte hjelpemalene er alltid tilgjengelige. Hjelp i mesterutfordringer senker selvstendig poengsum, men lar eleven fortsette.

Én aktiv interesse håndheves med unik delindeks. Valg skjer i en RPC med radlås på eleven og eksisterende husholdningskontroll i API-et. Migrasjonen beholder én sterkest vektet aktiv interesse for gamle profiler; dette er kun konvertering, aldri automatisk interessebytte etterpå. Nye/eksisterende valg bruker samme atomiske transaksjon.

Historien består av navngitte figurer, sted, mål og oppdragsfaser. Kontrollerte maler bruker generatorens tall, og samtale-KI kan aldri omskrive fasit eller historielogikken. Progresjon per interesse ligger i den eksisterende versjonerte økttilstanden, føres videre til neste økt og committes atomisk sammen med svarevidens. Fire korrekt fullførte oppdrag gir nytt kapittel; hjelp og tekniske feil gir ingen ekstra progresjon. Matematisk fremgang påvirkes ikke av interessebytte. Pågående oppgave fullføres i sitt gamle eventyr; neste oppdrag bruker det nye valget.

Multiplikasjonsoppdrag har tall og et uttrykk som samlet svar. Et trygt AST-vern godtar multiplikasjon i begge rekkefølger og gjentatt addisjon, med parenteser og valgfri likhet med korrekt resultat. Det avviser funksjoner, symboler, tildelinger og uttrykk med samme verdi som modellerer andre tall. Læringsmotoren registrerer ett svar når begge delene kontrolleres. Andre oppgavetyper beholder sine etablerte svarformer.

Svarfeltene blir stående etter vurdering. På smale skjermer åpnes lærerhjelp i plassen til talltastaturet, mens svarfelt og hovedhandling forblir synlige og beholder plasseringen. Feiring er et dekorativt overlegg, nøkkelsatt med oppgave-ID og slått av ved redusert bevegelse. Ingen animasjon må fullføres før eleven fortsetter.
