# Backlog

Her samles pirk og idéer til senere oppgaver.

## Fra agentteamets kildeundersøkelse (14. oktober 2026)

- **P3 – Gjentatt konsekvenstekst:** Ved valgt rute i oppdrag 5 rendres `payoff.scene` både i fortellingen og konsekvensfeltet (`components/leo/adventure-scene.tsx:140,161`; tilstand i `lib/learning/adventure.ts:898–909`). Designer foreslår én scenetekst og en kort forklaring av hvorfor tidligere valg hjelper nå. Kodeatferden er kildekontrollert; betydningen for spillopplevelsen må prøves i appen før endring.
- **P2 – Utvid lærerevalueringen:** `scripts/eval-agent.ts:16–45` prøver separate scenarioer og måler guard/sikkerhetsflagg/fallback etter responskontroll (`lib/agent/loop.ts:111`). Det dokumenterer ikke kvaliteten på flertursforklaring eller historiekontekst. Tutor-evaluator foreslår syntetiske flertursscenarioer med uavhengig matematisk vurdering og separat registrering av rå modellforsøk, elevvist respons og fallback. Ingen ekte modellkall er kjørt i denne undersøkelsen.
- **P3 – Dokumenter responskilde ved historietesting:** `tests/learning/chapters.test.ts:296–320` bruker håndskrevet provider selv om resultatet merkes `source: 'model'`. Behold skillet mellom appens kodebane og testbevis: registrer ekte modell, stub og reservehistorie separat når faktiske lærersvar og kapitteloverganger senere vurderes. Dette er en begrensning ved tolkning av testene, ikke en påvist feil i kildeflagget.

Punktene er utenfor agentoppsettets omfang. Ingen appkode eller evaluering er endret.
