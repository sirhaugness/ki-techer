# K1 – tre forberedte Star Wars-oppgaver

Implementeringsleveranse 21. oktober 2026, fra `main` d415dbb (merget dokumentasjons-PR #22). Dette er en prøve med SW01, SW06 og SW19 fra [kapittelplanen](chapters/star-wars-vaders-felle.md), med merkede scenehopp. De øvrige 17 oppgavene er ikke bygget. [SPEC](SPEC.md) styrer retningen.

## Implementert

Inngangen `/leo/stjerneoppdrag` åpner én forberedt pakke. Ingen kapittel-/bildegenerering, worker, polling eller 70-prosentstart kjøres i denne flyten. Egne SVG-scener illustrerer Falcon, stasjonen og hangaren; kontrollerte brikker, polygoner og rollekort bærer matematikken.

- SW01: 24 brikker fordeles på fire skjold. Fordeling og et valgfritt tall vurderes separat. Ulik fordeling bevares ved feil/hjelp; fullføring aktiverer fire skjoldbuer.
- SW06: trekant, rektangel og et parallellogram med 60°/120°-vinkler. Valg av rektangel og markering av alle fire rette hjørner kreves. Rettvinkelmal/enklere eksempel finnes; luken åpnes ved fullføring.
- SW19: egne probehendelser for fri forklaring, eller rollevalg pluss relevant markering. «Begge blir seks» er ikke rolleevidens. Ett oppfølgingsspørsmål, deretter kontrollert forklaring og tilbud om hjulpet fullføring. Korrekt A-evidens kan beholdes når neste korte svar forklarer B, også over pause/gjenopptak.

Undervisning, veiledet øving og selvstendig forsøk er serverstyrt. Hjelp registreres før visning. Løsninger og enklere eksempler er forfatterkontrollerte. KI kan velge undervisningsgrep og tolke probeord gjennom `prepared-tutor.v1`, med oppgave, synlige mengder, handlinger, vurdering, modus, tidligere meldinger/hjelp og probegrunnlag. Svaret er en strukturert beslutning med forankrede sitater; elevvist matematikk kommer fra kode. Lærerens formuleringer er foreløpig forhåndsskrevne, ikke fri generativ undervisning. `tutor.v2` og guards for eldre øving er beholdt.

## Lagring, tilgang og evidens

`preparedChapter` lagres strukturert i eksisterende `sessions.engine_state`; aktiv spilling har egen markør. Nye vanlige økter bevarer fremdriften uten å arve aktiv spillmodus. Turer bruker eksisterende `commit_learning_turn`, med revisjon, oppgave-ID, requestId og atomisk lagring av arbeid, svar og meldinger. Duplikater gjenbruker lagret resultat; gamle revisjoner og feil oppgave/økt avvises før lærerarbeid. Ny start må respektere annen åpen økt og foreldres tid/dagsgrense.

Eksisterende Leo-lås, husholdningstilgang, Origin-/størrelsesgrenser og budsjettstyrt KI-provider brukes. Start, svar og lærerhandlinger bruker eksisterende forespørselskvote; lagring av hver enkelt brikkeflytting gjør ikke et KI-kall og spiser ikke opp denne kvoten. Manipulasjoner kontrolleres av skjema, eierskap, oppgave-ID og revisjon. Ingen SQL-migrasjon eller databaseendring er nødvendig. TTS henter samme servereide prøvetekst som skjermen; STT gir redigerbar tekst før separat sending. Tale-av skjuler lydkontrollene. Opplesingen følger taleteksten, slik at brikkeflyttinger ikke gir nye lydkall eller automatisk omstart; et nytt hint bruker gjeldende serverrevisjon.

Forsøk og korte meldinger med metadata gir foreldreinnsyn. Eksport/full sletting dekker eksisterende øktdata. Ingen rådialog kopieres inn i varig nested fremdrift; fritekst bruker de eksisterende modererte meldingsfeltene og deres oppbevaringsregler. Språkvurdering som ikke kan utføres gir ikke-vurdert-status, og rollekort er fortsatt tilgjengelige.

**Begrenset motorbro:** K1 lagrer kontrollerte oppgavesvar og forståelsesevidens, men tildeler ikke global ferdighetsmestring, FSRS-oppdatering eller medaljong fra de tre forfatteroppgavene. Forsøk har kreditt 0. SW01/SW06 er hjulpet læring; SW19 kan registrere selvstendig rolleevidens, men det gitte regnestykket er ingen selvstendig divisjonsprøve. Kobling av flere forfatteroppgaver til motorens langsiktige progresjon må fullføres i K2 uten å svekke eksisterende terskler.

## Utførte kontroller

- Lint, TypeScript, Prettier og diffkontroll består. Låsefilens eksisterende chokidar/readdirp-plassering måtte repareres for å installere og teste; pakkeversjonene i package.json er uendret.
- 643 Vitest-tester i 47 filer består med høyst to arbeidere. De nye kontrollene dekker mengdebevaring, riktig tall/feil modell, vinkelmodell, hjelpe-/evidensgrenser, korte svar over flere turer, revisjon/idempotens, foreldretid og pause/gjenopptak.
- PGlite kjører eksisterende migrasjoner lokalt og bekrefter at den virkelige SQL-kontrakten lagrer økt, item, forsøk og meldinger samlet, avviser gammel revisjon, gir eksport/innsyn og sletter avhengig fremdrift med eleven. Ingen hosted database ble endret.
- 28 Playwright-tester består med system-Chromium; to tester for lokal Supabase Auth er utelatt uten dette oppsettet. Hele nye kjeden er prøvd: feil → hint → riktig → animert konsekvens → neste utdrag → pause/reload → samme probe → rollevurdering → avslutning. Redusert bevegelse, nettbrettbredde, tale-av og auto-opplesing over 24 brikkeflyttinger er prøvd. Testoppsettets auto-valg nullstilles mellom tilfeller. Den eksisterende CI-testen for ekte lokal Supabase/Auth er utvidet med K1-feil/hint/pause/gjenopptak og hjulpet fullføring; den utvidede testen er observert bestått i [CI på d2a415e](https://github.com/sirhaugness/ki-techer/actions/runs/39556261587), mot isolert lokal Auth/database, ikke leo-dev. Resterende eksisterende spill-/foreldre-/taleflyter er regresjonstestet med syntetiske data.
- Motorsimuleringen og produksjonsbygget består uten KI-kall. Promptfilen er med i deploymentets filspor. Lighthouse gir 100/100 på alle 12 kontrollerte visninger, inkludert K1. Lokale Markdown-lenker/ankere er kontrollert; siste etterkontroll dekker 80 lenker i ni endrede Markdown-filer.

Faktiske responskilder i testene: modellmocks, kodebestemte lærersvar og ikke-vurdert-fallback; **ingen ekte modellkall**. Ingen barn, fysisk iPad/Safari eller læringseffekt er testet.

## Gjennomgang og åpne grenser

Faktiske pedagogy- og design_review-agenter undersøkte gjenbruk, lagring, voice og planlagt samspill. Reviewer gjenopptok kodegjennomgangen etter et tidligere kvoteavbrudd. Funn om korte probesvar over to turer, unødige TTS-kall og avvisning av alternative riktige rolleformuleringer er rettet med regresjoner. Etterkontrollen fant ingen gjenstående konkrete P1/P2 i det undersøkte snittet. Reviewer leste kode/tester og kontrollerte diff, men kjørte ikke app, tjenester eller modell. Hovedagenten utførte de rapporterte testene og nettleserkontrollen. Naturlig språktolkning følger modellrubrikken med forankrede sitater; kodeguarden alene beviser ikke semantisk korrekthet.

Innlogget hosted Preview, ekte lærerspråk og fysisk iPad er ikke dokumentert av de lokale testene. Produksjon ble lest på d415dbb/READY før denne leveransen; ingen produksjonsmerge utføres. Eksisterende godkjenning til Preview-nøkkel og syntetisk devkonto er beholdt, men denne leveransen gjør ingen betalt modellevaluering. Samlet historisk testregnskap er uendret.

## PR og Preview

[Utkast-PR #23](https://github.com/sirhaugness/ki-techer/pull/23) går fra `feat/prepared-star-wars-pilot` til `main`. Runtime på `d2a415e` er observert READY i [Preview](https://ki-techer-6zkb23hmh-team-thor1.vercel.app/leo/stjerneoppdrag), deployment `dpl_14BNne2sWpxNGrmocnYmXF7cqGnU`. Faktisk uinnlogget forespørsel til den nye ruten ender på appens `/login` (HTTP 200 etter videresending).

Ingen innlogget testsesjon er tilgjengelig i dette arbeidsmiljøet. Vercel viser Preview-servernøkkelen som `sensitive` og returnerer ikke verdien ved lesing. Ingen nøkkel er opprettet eller endret, og ingen hosted testkonto/data er opprettet. Den allerede godkjente syntetiske devtesten kan fortsatt utføres når en innlogget testsesjon er tilgjengelig; eksisterende nøkkelgodkjenning trenger ikke gjentas. Lokal nettleserflyt og isolert Auth/SQL i CI erstatter ikke denne hosted testen.
