# Beslutninger

## Les historikken riktig

Dette er daterte implementeringsvalg. Nyere avtalte krav i [SPEC](SPEC.md) og brukerens bestilling styrer videreutviklingen. Eldre begrensninger er ikke automatisk varige produktregler; se revisjonsbeslutningen nederst. Historiske resultater dokumenterer bare den undersøkte versjonen.

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

## 2026-10-13: sammenhengende, planlagte kapitler

Modellen planlegger ett kapittel med seks hendelser, karakterer, konkret mål, to ruter med forskjellige konsekvenser og et nytt mål. Planen bruker motorens tilgjengelige ferdigheter og kapittelvurderingen. Modellen skriver fortellingen, men får ikke sette tall eller fasit i oppgavene. Koden setter inn selvstendig kontrollerte generatoroppgaver; aritmetikk tolkes med en tillatt AST uten kjøring av elevtekst. Valg bygger på den kontrollerte mengden forsyninger. Valgt rute, forbruk, gjenstander, relasjoner og hendelser inngår i neste kapittels hukommelse. Seks interesseuniverser har komplette reservekapitler når tjenesten ikke svarer. Nye interesser kan få egne modellplaner; ved modellfeil brukes en mer generell reservefortelling.

Kapittelvurderingen samler forsøk per oppdrag, slik at gjentatte forsøk på én oppgave ikke teller som flere vanskelige oppgaver. Den bruker hele det siste kapittelets seks oppdrag, skiller notasjon fra feil tall og registrerer uttrykk, forklaring, hint og støtte. Tekstbehov registreres fra elevens spørsmål; dette er ikke en sikker diagnose av årsaken til en feil. Hintbruk alene senker ikke nivået. Gjentatte regnevansker får mer plass, og blandet øving beholdes. Riktig tall med ufullstendig uttrykk gir ikke negativ mestrings- eller frustrasjonsevidens. Det venter fortsatt på riktig regnemåte før historien går videre.

Kapittelplan, seks kontrollerte oppgaver, historietilstand og pausepunkt lagres i eksisterende `sessions.engine_state` gjennom den atomiske skrivefunksjonen. Ingen migrasjon, nye hemmeligheter eller miljøvariabler er nødvendige. Ved interessebytte settes det gamle eventyret på pause, inkludert oppgave, svarvurdering og hintnivå. Læringsprofil og evidens deles. En ny økt fortsetter også et uferdig oppdrag eller et ventende valg.

Svarvurdering venter ikke på KI. En separat, lesende `feedback`-forespørsel henter lærerforklaring etter vurderingen og endrer verken revisjon, hint, mestring eller fremdrift. Oppgave-ID, økt og revisjon sjekkes på serveren; avbrudd og oppgaveidentitet beskytter mot sene svar i klienten. Den fullførte vurderingen er autoritativ også i lærerhjelp og forklaringsvurdering. Skrivefeltet ligger over en egen rullbar dialog med nyeste utveksling først. Faste interessebilder ligger lokalt med kildeoversikt; nye modellinteresser kan hente et Wikipedia-bilde med tidsgrense og begrensning til Wikimedia. Bildefeil viser en lesbar scene og blokkerer ikke spillet.

## 2026-10-14: illustrert handling og varierte oppdrag

Kapittelplanen beskriver nå tegnet sted (`stage`), synlig konsekvens (`effect`), gjenstander, beholdere, karakterdialog, formål og elevens handling. KI-planen og de komplette reservekapitlene bruker samme kontrakt og samme produksjonsrendering. Modellen setter ikke fasit eller illustrerte tall. `lib/engine/mission.ts` avleder mengdene fra den kontrollerte generatoroppgaven og validerer både bildeparametrene og minst tre faktisk kompilerte samhandlingsformer før et nytt kapittel kan vises. En modellplan som blir ensformig etter kompilering, erstattes av et helt, kontrollert reservekapittel. Feilkategorien lagres i kapitteltilstanden.

Scenen tegnes lokalt som SVG med personer, landskap, farkost, porter, broer, last og synlige mengder. Dette krever ingen ny bildetjeneste, API-nøkkel eller ekstern bildeforespørsel. Den tidligere Wikipedia-/interessebildemodulen er ikke lenger del av kapittelgenereringen. Bevegelse følger løst tilstand: porten løftes, broer bygges, last flyttes, signaler sendes og skipet tar av. Ved redusert bevegelse beholdes sluttposisjoner og endret scene uten animasjon. Riktig svar bringer scenen tilbake i synsfeltet; svarfeltene beholder verdier og dokumentplassering.

Samhandling omfatter mengdeknapper med tegning, fordeling på brett, sammenligning av alternativer, bygging av regneuttrykk, illustrerte fortellingsvalg og eksisterende svarformer. Modellering med uttrykksvalg kan også gi en kodeverifisert ressursmengde når ingen numerisk kandidat er tilgjengelig. Rutevalget krever at restmengden regnes riktig. Feil endrer verken beholdning eller valgt vei. Valget gir en gjenstand eller relasjon som påvirker en senere tegnet hendelse. Verdensminnet lagrer inventar, følgesvenner, faktiske utfall, siste hendelse og uløst mål og sendes videre til modellen.

`judgeTaskAnswer` gir én autoritativ vurdering for progresjon, evidens og hjelp. Gangeuttrykk bruker fortsatt den begrensede AST-kontrollen; uttrykksvalg godtar også vanlige regnetegn som kolon. Fordeling kontrolleres både som total og som like grupper. Læreren får situasjonen i spillverdenen sammen med matematikken og det allerede vurderte svaret. Tilpasningen baseres fortsatt på flere oppdrag, og notasjon eller ett hint senker ikke regnenivået. Gamle lagrede oppgaver får presentasjonsfeltene ved lesing/neste tur uten å miste oppgave-ID, svar, evidens eller progresjon. Alt lagres i eksisterende JSON-transaksjon; ingen ny migrasjon.

Thor har godkjent gjenbruk av eksisterende OpenAI-oppsett i Preview. Dette er også notert i AGENTS.md slik at samme valg ikke etterspørres igjen. Produksjon eller nøkkelverdier endres ikke.

## 2026-10-14: reviderte instruksjoner for Codex-teamet og KI-læreren

- `docs/SPEC.md` er eneste fullstendige produktspesifikasjon. Rotfilen peker dit; den opprinnelige kopien finnes i git-historikken. AGENTS angir leserekkefølge og skiller Codex-roller fra lærerens runtime-prompter.
- Avtalt retning er et sammenhengende eventyr der hendelser skaper matematikk og Leos handlinger får synlige, lagrede konsekvenser. Historikk påvirker fortsettelsen; ingen fast åpning eller obligatorisk figurgruppe. Variasjon er mer enn nye tall, navn eller svarfelt. Research krever faktiske kilder.
- Tidligere valg om ordrette generatorspørsmål, tallfri ramme, fire/seks oppdrag, faste scenetyper og lokalt SVG-bibliotek beskriver eldre eller nåværende implementering. De er ikke permanente produktgrenser. Fasitvern, semantisk kontroll, hint, sikkerhet og uavhengig mestring beholdes. Skjema/guards/rendering må endres samlet når grensene utvides; denne revisjonen bygger ikke ny research-, minne- eller spillarkitektur.
- Aktiv lærerprompt blir `tutor.v2`; v1 beholdes for sporbarhet. V2 skiller verktøytur fra hjelp uten verktøy, bruker motorens vurdering og tilpasser tallinstruksjoner til dagens guard. Lokale instruksjoner for hjelp, planlegging, kontekstualisering, forklaringsvurdering og refleksjon revideres innenfor eksisterende skjema.
- Codex-teamet bruker samme produktmål og evidenskrav. Rene undersøkelser gir ingen fil-/PR-endringer; endringsoppgaver dokumenteres og verifiseres etter faktisk omfang. Designer vurderer hele årsakskjeden; tutor-evaluator sporer også direkte kodebestemte svar; reviewer kontrollerer kontrakter på tvers av filer.
- Teknisk funksjon, ekte modellkvalitet og spillopplevelse rapporteres separat. Dagens 30-scenario-eval måler sluttrespons, ikke full pedagogisk kvalitet eller råforsøk. Utvidet evaluering står som gjenstående krav, ikke som et utført resultat. Eksisterende Preview-nøkkelgodkjenning og produksjonsgrenser beholdes.

## 2026-10-15: faktisk fortsettelse og uavhengig historiekontroll

Siste faktisk gjennomførte hendelse og lagrede valg er autoritative. En planlagt krok er et forslag, ikke en ordre om å gjenåpne et løst problem. Første oppdrag i videreførte kapitler må referere siste faktiske hendelse; historiske krav gjelder ikke et første kapittel uten historikk. Forfatteren og den separate kritikeren bruker det konfigurerte sterke tutor-modellvalget, med egne kontekster og 120/60-sekunders kallgrenser innenfor samlet planleggingsfrist. Inntil tre korrigeringer gjelder samme utkast og samme budsjett; det finnes ingen ubegrenset automatisk omstart. Matematikk, figurdata, kostnad og rest bestemmes fortsatt av kode. Felles payoff kan ikke kreve råstoff på nytt eller liste begge alternative gjenstander. Dette skjerper kontrakten, men modell-/spillkvalitet må fortsatt vises i ekte forløp.

## 2026-10-15: kostnadsmål og budsjettstyrt fortellingskontroll

Thors nye kostnadsmandat erstatter den sterke modellstandarden over: alle tekstroller bruker gpt-5-mini via valgfri OPENAI_MODEL_DEFAULT, også ett helt kapittel og separat fortellingskontroll. Gammelt gpt-5.2-oppsett i rollevariabler overstyrer ikke den nye standarden. Høyst ett korrigert planutkast etter første forsøk; korte tilleggskall har ett forsøk. Research og kontrollerte kapitler gjenbrukes i den samme historien, ikke på tvers av elever/valg. Alle historiske faktiske hendelser beholdes uten duplikate sistekapitler.

Modellpriser/valutaforutsetning versjoneres i nye ai_calls. Historiske flate anslag omskrives ikke; økt-/kapittel-ID og egne kalltyper gir fremtidig attribusjon. Ukjent forbruk beholder reservasjonen; kjent bruk prises selv ved avvist modellresultat. Tekst- og taleprovider krever eksplisitt budsjettvakt.

Kritikeren må levere evidens for kontinuitet, praktisk variasjon og historiske valgs konkrete virkning, samt matematisk nødvendighet, fysisk regel og samsvarende konsekvens for hvert av seks oppdrag. Kode bestemmer godkjenning og validerer eksakte oppdrags-/historikkreferanser. Dette erstatter en enkelt valid=true, uten å gjøre mocks til bevis på modellens forståelse.

Tester er mocks som standard; eksplisitte ekte tester bruker billigste egnede modell og en samlet varig grense på 10 kr for arbeidet. Generell agent-eval bruker nano med lokal låst regnskapsfil; faktisk mini-fortelling prøves med mini og eksisterende serverhåndhevet husholdningsgrense 10 kr. Ingen forhøyelse eller ny testkonto for å omgå brukt ramme. Mer enn 10 kr må godkjennes først. Vercel-deling åpner bare ytre Preview-beskyttelse, ikke appens sikkerhet eller budsjett. PR holdes utkast til fortellingskontrollen og åpne kvalitetsfunn er ferdig vurdert.

## 2026-10-16: evidens må komme fra faktisk elevtekst

En faktisk mini-godkjenning av kapittel 4 var ikke tilstrekkelig: uavhengig evaluering fant fortsatt P2. Fysisk regel og konkret nytte av tidligere gjenstand krever derfor eksakte sitater, kontrollert mot bundet elevtekst og begge mulige valgforløp. Intern purpose og uses-metadata teller ikke som synlig handling. Sitatets relevans og variasjon vurderes fortsatt semantisk; tekstmatching er ikke et fullstendig fortellerbevis. Åpne funn og manglende ny ekte kontroll etter siste kodeendring holder PR-en som utkast.

Thor ønsker ikke gjentatte bekreftelser for allerede autorisert arbeid. Fortsett innenfor mandatet og unngå unødvendige nye dialoger. Verktøyets egne bekreftelseskrav kan ikke fjernes av en prosjektregel. Testgrensen og produksjonsgrensen gjelder fortsatt.

## 2026-10-16: første leveranse i spillrevisjonen

Thors avtalte revisjon gjennomføres etter SPEC §15 og GAME-REVISION.md. Oppdrag er én oppgave, kapittel er en lokal historie, saga er faktisk overordnet historie og økt er læringstid. Kapittelforberedelse skilles fra avvikling, med én felles elevflate som mål. Eksisterende læringsmotor, auth og budsjett beholdes.

R1 er et additivt, versjonert kontraktlag som ikke kobles til dagens runtime ennå. Matematikk refereres med motorversjon/ferdighet/nivå/seed og materialiseres i kode. Et vilkårlig KI-generert sett med params/expression/answer er ikke betrodd inngang. Dette følger uavhengig reviewers påviste moteksempel der endrede parametre kunne beholde gammel fasit.

Scener binder gitte mengder fra samme motoroppgave. Elev-/ordinær lærerprojeksjon utelater skjult fasit og framtidig avslutning. Lærerkontekst krever riktig faktisk rute og fullførte hendelser i rekkefølge; bare medlemskap i en ID-liste er utilstrekkelig. Et annet reviewfunn viste at en slik svak kontroll ellers slapp inn framtidige oppdrag.

R1 er ikke redaksjonell godkjenning, en ny spiller eller en varig worker. Ingen schema-/databasemigrasjon eller konvertering av lagrede eventyr gjøres her. Generatorversjonen må få en frosset/kompatibel implementasjon før pakker lagres i R3. Hjelpebane med full løsning krever særskilt kontroll i R5; ordinær kontekst mottar ikke fasit selv ved tillatt hintnivå 4.

## 2026-10-16: varig byggeplan og PR-avhengigheter

PROGRESS.md får en oppdatert «Start her»-del med faktisk status, neste leveranse, avtalte rammer og gjenopptaksinstruksjon. SPEC er produktkrav, GAME-REVISION er kravkart/byggeplan, og PROGRESS er utførelsesstatus og evidens. Hele chatloggen skal ikke være nødvendig for videreføring når disse filene og riktig repository er tilgjengelige.

R2 opprettes fra R1 med R1-branchen som PR-base. PR #16 trenger ikke merges før R2; merge til main er fortsatt produksjonsgrense og krever tillatelse. Senere PR-er opprettes etter kontroll av faktisk avhengighet og status, ikke automatisk som en syvleddet stabel. Denne oppdateringen er dokumentasjon, ikke påbegynt R2-kode.

## 2026-10-16: R2 prøver ny spiller før varig produksjon

R2 er et håndskrevet kapittel i R1-format på en egen autentisert prøveside, med tre ulike nødvendige handlinger i én sammenhengende vik. Hele pakken og lokale ressurser finnes før spillstart. Prøven bruker serverens deterministiske fasitkontroll, R1-projeksjon og faktisk rekonstruert historikk, men lager ingen ekte økt, mestring, medaljong eller KI-kostnad. Historieforklaring og matematisk støtte er separate kodebestemte handlinger; ingen KI-kvalitet påstås.

Nettleserlagring per elev og innholdsversjon gir en avgrenset gjenopptaksprøve uten å foregripe R3s database-/jobbdesign. Gjenopptak kontrollerer tidligere svar på nytt, og feilrespons knyttes til det vurderte utkastet. Dette er eksplisitt ikke manipulasjonssikker progresjon eller fullført eksport/sletting på tvers av enheter. R3/R4/R6 må løse de varige ansvarene samlet. Bare eksisterende tilgangskontroll gjenbrukes; ingen auth-, database- eller miljøendring.

Faktiske designer-/pedagog-/reviewer-vurderinger førte til retting av fysisk kontinuitet, Miras plassering, foreldet feilstatus og svarfelt under skjermkanten. [R2-VERIFICATION](R2-VERIFICATION.md) skiller kodekontroll, observerte scener/bevegelse, direkte hjelp og gjenstående Preview-/modell-/nettbrettprøving. R2-branchen bygger på R1 uten produksjonsmerge.

Automatisk godkjenningskontroll avviste opprettelse av syntetiske Auth-/husholdnings-/elev-/enhetsdata i delt leo-dev som ikke uttrykkelig autorisert. Ingen rader ble opprettet; null testbrukere er etterkontrollert. Avslaget omgås ikke. Den eksisterende isolerte lokale Supabase/Auth-testen i CI utvides til prøvesiden som trygg separat kontroll, men dette erstatter ikke autentisert Preview. Særskilt midlertidig testdatatilgang med opprydding må godkjennes før dette delte testoppsettet brukes. Ingen testbruker eller privat testinnlogging er etterlatt.

Overleveringen peker på R2/PR #18 mot main og den åpne porten. R3 er neste nye leveranse etter porten, med R2 som avhengig base dersom den ikke er merget eksternt. README og AGENTS peker til «Start her»; eldre milepæler og beslutninger beholdes som historikk.

## 2026-10-16: PR-base rettet etter eksterne merger

PR #16 ble merget eksternt til main (5ad9807). Deretter ble PR #17 med bare første R2-commit 4ae1549 merget til den gamle R1-branchen (d3f4f34), slik at R2 fortsatt ikke var på main. Sluttrettelsene 5710f6b og overleveringen a8c3407 kom etter den mergen. Agenten integrerte main i featurebranchen uten kodekonflikter (eff9a3d) og opprettet utkast-PR #18 fra samme feat/chapter-player direkte mot main. Dette viderefører hele R2 med korrekt diff og gjør siste dokumentasjon tilgjengelig i en åpen PR. Ingen produksjonsmerge ble utført av agenten. Ny samtale bruker PR #18, lukker den åpne R2-porten og fortsetter deretter med R3.

## 2026-10-16: vent på bekreftet prøvesvar før reload i Auth-test

CI på `fa1aa98` viste `working` etter umiddelbar reload etter svarinnsending. Playwright-klikk venter ikke på server-action og nettleserlagring. Auth-testen venter derfor på synlig `solved` før reload og verifiserer samme tilstand etterpå, som prøvekapittelets eksisterende nettlesertest. Dette retter testens kappløp; det gjør ikke nettleserlagring autoritativ eller holdbar før serverens svar. Ingen app-/sikkerhetsgrense endres.

## 2026-10-16: godkjent syntetisk testtilgang og innlogget R2-port

Thor har uttrykkelig godkjent midlertidig syntetisk konto med husholdning/elev/enhet i leo-dev og sletting/etterkontroll, og ønsker færrest mulig nye godkjenningsspørsmål. Dette mandatet beholdes i AGENTS. Det omfatter avtalt Preview-/dev-verifisering, ikke produksjonsendringer eller forhøyet KI-budsjett. Innlogget R2 på 55cdbdd er bestått uten KI-kall. Tekniske slettingsfeil fra connectoren registreres som gjenstående opprydding, ikke som avslag eller utført sletting.

## 17. oktober 2026: R3 bruker Workflow 5 og varig kalljournal

Kapittelforberedelse flyttes til Workflow 5.2.2 med eksplisitt `arn1`, etter
kontroll av multi-region/Hobby-støtte. Supabase beholder varig status og innhold;
Workflow har kortere historikkretensjon. Start aksepteres før domain-jobbopprettelse.
Separate, unike kalljournaler med stabil budsjettreservasjon hindrer automatisk
gjenkjøp ved pending/unknown. Betalte steg har ingen SDK-retry; orkestratoren
kan gjenoppta trygge sjekkpunkter. Generator v1 fryses før pakker persisteres.
Kontrollert vektorbibliotek brukes i dette første produksjonssnittet; nye
genererte medier og visuell bredde kommer i R5. Se R3-VERIFICATION for faktiske
prøver, prisramme og begrensninger. R3 er ikke ferdig modellverifisert ennå.

## 17. oktober 2026: kontroller alle faktiske kapittelruter

Ekte modellprøve viste at en global kontinuitetsforklaring kunne overse startvalg
som hoppet over nødvendig arbeid. Før kritikk teller kode nå alle ruter, med
maks64 som lukket kontrollgrense. R3s tidlige prøve krever minst tre oppdrag
på hver rute. Kritikeren får eksplisitte ruter og returnerer én vurdering med
eksakt oppdragsrekkefølge og slutt per rute. Semantikken kontrolleres fortsatt
av modell og menneske; riktige ID-er alene betyr ikke god fortelling.

## 19. oktober2026: kritikerens bevis må være faktisk elevtekst

Ekte prøve12 ga approved=true med fysiske-regel-sitater hentet fra intern
renderingbeskrivelse. Eksisterende kodeport avviste korrekt. Kritikerens
responsgrammatikk velger nå sitat fra et oppdragsspesifikt enum av faktiske
elevsetninger. none tillater ærlig avvisning når en fysisk regel mangler;
rene regneinstruksjoner er ingen regel. Kodeporten håndhever fortsatt samme
grense og sender konkret avvisningsgrunn til ett kontrollert rettingsforsøk.
Dette beviser sitatets kilde, ikke semantikken eller generell modellkvalitet.

## 19. oktober2026: ett betalt kall per varig kontrollsteg

Kritikk, retting og ny kritikk ble delt for å holde hver kjøring innenfor
Hobby-grensen på300sekunder. Ett langt korrekt forløp skal kunne ta mer enn
fem minutter totalt uten at et nytt uavklart modellkjøp avbrytes av stegets
tidsgrense. Samme kalljournal og lease-/eierkontroll beholdes mellom stegene.

## 19. oktober: mer ventetid innen separate Workflow-steg

Trettende forfatterkall stoppet ved120sekunder uten kjent forbruk eller utkast.
Hele reservasjonen beholdes. Etter oppdelingen av kritikk/revisjon får hvert
modellkall180sekunders timeout innen funksjonsgrensen300sekunder; ingen
modell-, token- eller budsjettøkning. Unknown-kallet kjøpes aldri på nytt.

## 19. oktober: lavere forfatter-reasoning etter to lokale tidsavbrudd

Både120- og180sekundersprøven ga unknown uten utkast/usage. Neste separate
prøve bruker low hos forfatteren med samme12000token/180sekunder. Den separate
kritikeren beholder medium, og alle kodeporter beholdes. Ingen ukjente kall
kjøpes på nytt, og alle tre usikre reservasjoner teller fullt i10kronersrammen.

## 19. oktober: én ressursreferanse for quantity-mengder i forfatter-wire

Etter at begge utkast i prøve15blandet signalstolpe/planke for total/known,
velger forfatteren countedAssetId én gang. Koden binder begge mengder til
den ressursen. Lagret kontrakt og eldre utkast endres ikke. Dette fjerner et
redundant modellvalg; det er ingen semantisk godkjenning eller reparasjon av
råforsøk. Numerisk spørsmålsform og ingen interne node-IDer presiseres også.
