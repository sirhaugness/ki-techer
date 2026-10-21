# Byggeplan for det forberedte kapitlet

Gjeldende 20. oktober 2026. [SPEC](SPEC.md) er kanonisk produktretning; [kapittelplanen](chapters/star-wars-vaders-felle.md) er innholdsbestillingen. Tidligere R3–R7-plan er erstattet; den finnes i [historisk versjon](https://github.com/sirhaugness/ki-techer/blob/d6e18740547c43db34e7ce108b95fc5bf28e800e/docs/GAME-REVISION.md). R1/R2 og PR #21 er kilde til gjenbruk, ingen bestilling om å bygge fri generering videre.

## Nå: dokumentasjonsleveranse K0

Ferdig innhold: kanonisk retning, 20 komplette hovedoppgaver i fire deler, Udir-kobling, støtte-/overføringsopplegg, liten ressursliste og inaktivt lærerutkast med kodegrenser. Ingen ny runtime, bilder, migrasjoner eller ekte modelltest. Faktiske kontroller registreres i [PROGRESS](PROGRESS.md).

## K1: en spillbar prøve med tre oppgaver

Implementert i egen runtimeleveranse; [K1-VERIFICATION](K1-VERIFICATION.md) viser hva som faktisk er kontrollert og gjenstående hosted/modellevaluering. Punktene under er akseptkriteriene, ikke bevis på at alle tjenester er prøvd.

Bruk **SW01 → SW06 → SW19**, med uttrykkelig merkede scenehopp mellom utdrag fra kapitlet. Tre valgte oppgaver demonstrerer divisjon, geometri og forståelsessamtale; de skal ikke fremstilles som hele fortellingen eller årsdekning. Ingen stor verdenvelger eller katalog kreves: én kapittelinngang er nok.

1. **Minimal innholdskontrakt:** Én håndskrevet, versjonert pakke i repoet med akkurat prøvens oppgaver, støtte og ressurser. Gjenbruk `lib/chapters/` der det passer. Nåværende generatorreferanse kan ikke uten videre representere alle eksakte forfatteroppgavene: legg til en streng datatype eller frossen referanse, med egen uavhengig fasit-/modellkontroll. Ikke bygg et innholdsstudio eller en produksjonsworker.
2. **Samme faglige data i tekst og scene:** Kontrollerte mengder og plater fra samme oppgavegrunnlag, enkel illustrert bakgrunn og 2D-bevegelse. Vis feil med symbol/tekst og konkret hjelp, og riktig med meningsfull konsekvens. Behold arbeid, fokus og tilgjengelige svaralternativer.
3. **Modus og lærer:** Implementer undervisning, veiledet øving og selvstendig prøve som serverstyrt tilstand. Følg [TUTOR-DRAFT](TUTOR-DRAFT.md): samordne prompt, lokale hjelpeinstrukser, kontekst, guards, kontrollert løsning og probe-/vurderingshendelser. Aktiver ikke utkastet først og håp at øvrig kode passer. Begrens verktøy til det som trengs.
4. **Evidens og gjenopptak:** Riktig tall, riktig modell og forståelsesevidens lagres separat. Hjelp markeres før visning. Undervisning blir aldri selvstendig mestring. Lagre oppgave/variant, pakkeversjon, probe, støtte, handlinger og konsekvens med samme autoritative revisjon/idempotens som resten av appen. Prøven må kunne fortsettes etter pause/reload, også midt i forståelsessamtalen.
5. **Bevar eksisterende grenser:** Innlogging, Leo-lås, foreldregrenser, budsjett/tale og innsyn/eksport/sletting gjelder også nye data. Vurder eksisterende lagring før eventuell separat migrasjonsleveranse; ingen databasemigrasjon hører til K0. Veiledet historieprogresjon må ikke kreve falsk opplåsing av medaljongdeler.

Ferdigkriterier for K1:

- SW01: ujevn fordeling → støtte → fire grupper på seks → fire like skjold. Den viste undervisningen registreres som hjelp.
- SW06: feil parallellogram → rettvinkelmal/konkret forklaring → rektangel med fire rette vinkler → luke åpnes.
- SW19: riktig tall uten rolleforklaring gir ikke full forståelsesmerking. Korte ord, markering og tilrettelagte valg har en vurderingsvei. Etter høyst én oppfølging tilbys direkte forklaring og hjulpet fullføring.
- Samme oppgave/samtale gjenopptas; duplikat/sent svar flytter ikke et annet forsøk eller gjentar konsekvens. Ingen ny historie-/bildeproduksjon ved start eller 70 prosent i prøveflyten.
- Målrettede motor-/API-/UI-tester og en hel nettleserkjede kontrollerer faktisk oppførsel med syntetiske data. Responskilder oppgis. Ekte lærerspråk må senere prøves innen særskilt avtalt mandat; mocks beviser ikke modellkvalitet. Ingen formell studie eller lærergodkjenning fra Thor kreves.

## Deretter: K2 og overgang

Når prøvens konkrete feil er rettet, fyll samme pakke med de resterende 17 planlagte hovedoppgavene og ressursene. Bevar lagring over flere økter, bruk støttevarianter etter faktisk behov og kontroller hele fortellingen. Større katalog, ny sagaarkitektur og kontinuerlig innholdsproduksjon er ikke forutsetninger.

Før senere erstatning av dagens elevflate: kontroller gammel fremdrift/profil, eksport/sletting, tale, tids-/kostnadsvern og tilgjengelighet på den nye. Behold nødvendige leseløp for gamle data i overgangsperioden; fjern parallelle elevinnganger og genereringskode når erstatningen er kontrollert. Nytt innhold kan deles; elevens fremdrift og data er fortsatt private. Produksjonsutrulling er en separat autorisert handling.

## Gjenbruksbeslutning

| Behold                                                                                   | Tilpass                                                                                                          | Legg bort fra ny elevreise                                                                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Elevprofil, motor, mestring/repetisjon, auth/Leo-lås, foreldre, tale/cache, budsjettvern | Versjonert kapittelpakke, presise matteobjekter, svarflate, handlingsevidens, lærer-/probekontekst og gjenopptak | Fritekst som bestiller nytt eventyr, fri kapittelgenerator, progressiv publisering/polling, 70-prosentstart, research-/kritikerworker for spilleinnhold |

At en funksjon legges bort som produktretning betyr ikke at den er slettet fra runtime i dokumentasjonsleveransen. [Kodekartet](TUTOR-DRAFT.md) angir berørte grenser. Åpne PR #20 skal ikke merges for å realisere denne retningen.
