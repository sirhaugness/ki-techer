# K2 – hele historien og Kraften

Arbeidsgren `feat/star-wars-force-adventure`, fra `origin/main` **5efbd06** (ekstern merge av #24), 21. oktober 2026. Ny bestilling bygger [revidert manus v2](chapters/star-wars-v2.md). Dette dokumentet skiller implementasjon fra observerte tester. Ingen produksjonsmerge, nye hemmeligheter eller betalte modelltester.

## Implementasjon

`lib/star-wars/` er en versjonert forfatterpakke med 20 steg. Kontrollert matematikk, modellkrav og serverstyrt progresjon ligger separat fra innhold og KI. Klientprojeksjonen utelater fasit, hint, eksempler og kommende oppgaver. SW20 er et ja/nei-valg og gir ingen matteforsøk.

Ny hovedflate på `/leo/stjerneoppdrag`, ett hovedvalg på `/leo`. Fire forberedte bilder i `public/star-wars/`; tellbare celler, rutenett, ruter og vinkler tegnes i kode. Kampmotiv med barn ble avvist av bildeverktøyet og er erstattet av korridor-/eksteriørbilder. Figurposisjoner i stemningsbildene er ikke matematisk evidens. Bildeoptimalisering bruker Next Image.

Arbeid lagres med seriell klientkø og serverrevisjon. Et sent svar skal ikke overskrive nyere lokale redigeringer. Eksplisitt handling flusher ventende arbeid; feil beholder lokal tekst og samme requestId ved retry. API bruker eksisterende Leo-lås, Origin, kvote, tids-/budsjettkontroll og `commit_learning_turn`. Ingen migrasjon. Eldre tre-oppdragsprøve finnes på ulenket `/leo/utdrag`; vanlig øving og gamle data beholdes.

Rå elevdialog ligger kun i eksisterende root `messages`/meldingsrader og deres oppbevaringsløp, ikke i nested fremdrift. Generert lærertale ligger også bare i meldingsløpet; fremdriften har et forfatterhint som reserve etter oppbevaringsfristen. Pause/gjenopptak beholder samtalen når forrige økt var dette eventyret. Ved vanlig øving mellom øktene bevares oppgave/arbeid og et forfatterhint; gammel dialog følger ikke med inn i ny øving. Forsøk, hjelp og fullførte oppgaver kan ses/eksporteres/slettes gjennom eksisterende datafunksjoner. Hver fast oppgave gir `credit: 0`; ingen global ferdighetsmestring eller medaljong tildeles her.

## Kraften og responskilder

`force-tutor.v1` er aktiv bare i den nye flaten. Modellen får faktisk oppgave, arbeid, autoritativ vurdering, hjelp og begrenset dialoghistorikk. Den kan formulere korte svar, men kan ikke endre oppgave, fasit, fremdrift eller mestring. Hjelp registreres før visning.

Moderering gjelder før elevtekst sendes videre og før modelltekst vises. Et separat servereid tallgrunnlag og kontroll av skrevne ligninger avviser kjente avvik; elevens egne tall blir ikke automatisk autoritative. Dette beviser ikke alle matematiske utsagn i naturlig språk. Ved avslag, feil, manglende nøkkel eller tomt budsjett vises et merket forfatterhint.

Et betalt spørsmål får en varig revisjonsclaim med trygt hint og requestId før leverandøren kontaktes. Samtidig retry kan hente hintet uten nytt modellkall. Etter krasj blir det trygge hintet stående; barnet kan spørre på nytt med en ny handling. Et sent modellresultat kan ikke overskrive nyere arbeid. Tapt svar etter lagring kan gjentas uten nytt forsøk eller viderehopp.

## Observerte kontroller

- 659 Vitest-tester i 50 filer bestått lokalt, med maks to arbeidere. Inkluderer alle fasiter, rute-/vinkelkrav, hjelp, tidsvern, både ja/nei-slutt, CAS/retry og ekte eksisterende SQL-kontrakt/eksport/sletting i PGlite. Ingen ekte modell.
- Hele nye 20-stegsløpet bestod i Chromium: feil/hjelp/pause → lyssabel med faktisk målt CSS-bevegelse → automatisk neste → lagret ja-slutt. Siste fem nye nettlesertester bestod samlet, også tapt lagringssvar/retry, senere redigering under ventende lagring, opplesing og 390 px/reducedmotion. Totalt 33 syntetiske nettleserscenarioer bestod på tvers av fullkjøring og målrettet omkjøring; 2 Auth-scenarioer krever lokal Supabase og ble utelatt lokalt. Første fullkjøring hadde én feil i testens alert-locator (Nexts egen alert ble telt), rettet og etterkontrollert.
- Lint, typecheck, formatering, motorsimulering, produksjonsbygg og diffkontroll bestod. Lighthouse: 100/100 på 13 visninger, inkludert ny hovedflate. 89 lokale lenker i endrede Markdown-filer peker på eksisterende filer. Alle 20 scener/spørsmål i lesemanuset samsvarer med runtimeinnholdet. Produksjonsbyggets filspor inneholder force-tutor.v1.md, og filen finnes.
- Designer og pedagogy skrev avgrenset svarflate og forfatterinnhold etter uttrykkelig delegert mandat. Uavhengig reviewer leste kode og regnet fasiter uten å kjøre app/modell. Tre P2 ble rettet og etterkontrollert: elevtall i lærerens tallgrunnlag, divisjonstegnet ÷ i ligningskontrollen og samtidige betalte retries. Ingen gjenstående konkrete P1/P2 i det undersøkte snittet. Hovedagenten kjører testene.

## Senere CI-funn og rettelse

Kvalitetsjobben på 2afd214 bestod hele pakken. Den autentiserte Supabase-testen traff derimot en ekte UI-feil etter vellykket innlogging, refresh, oppgavearbeid og pause/gjenopptak: Et klikk på Hjem mens pausesvaret fortsatt ventet, ble ignorert. Diagnostiske stoppunkter og kortere handlingstimeout på 6eda0ff viste at testen ble stående i spilleren før foreldreopplåsing.

Hjem bruker nå en egen navigeringssperre og samme skrivekø: vent ferdig skriving, behold arbeid ved feil, lagre eventuelle siste redigeringer og pause bare hvis økten fortsatt kjører. En ny nettlesertest holder tilbake pausesvaret og bekrefter hjemnavigering, bevart arbeid og nøyaktig én pause. Alle fem nye nettlesertester bestod lokalt. Reviewer etterleste rettelsen uten konkrete P1/P2. Ny CI/Preview på siste head følges i PR-en.

En isolert test med samme Chromium 153 som CI bekreftet normal lasting av bildet, lukking/gjenåpning av vedvarende nettleser og skriving i fixtureflyten. Dette er ikke hosted Auth-verifisering.

## Åpne grenser

Ekte KI-lærerspråk, innlogget hosted Preview og fysisk iPad er ikke verifisert gjennom lokale mocks. Testene viser teknisk funksjon, ikke dokumentert læringseffekt eller engasjement. Ingen ny betalt test; historisk regnskap forblir 8,24392525 kr av 10 kr. Preview-/CI-lenker og observert tjenestestatus føres i PR-en ved levering.
