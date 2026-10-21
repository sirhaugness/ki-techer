# Darth Vaders felle – revidert historie

Gjeldende manus v2, 21. oktober 2026. Dette er historien og oppgavene som er bygget inn i `/leo/stjerneoppdrag`, revidert etter Thors tilbakemeldinger. [Runtimeinnholdet](../../lib/star-wars/content.ts) er kilden; [kontrollert matematikk](../../lib/star-wars/math.ts) avgjør svarene. [Verifisering og begrensninger](../K2-VERIFICATION.md) føres separat.

Leo er en ni år gammel padawan med lyst, bustete hår. Kraften er samtalepartneren i grensesnittet. Fortellerbildene er realistiske stemningsbilder; tellbare celler, kart, piler og nøkler tegnes av programmet. Volumoppgavene fra v1 er erstattet med logikk, og gange brukes flere steder. De fire delene kan spilles over flere økter.

## Del 1 · Gjennom asteroidefeltet

### 1. Nødskjoldet

Leia er fanget på en Star Destroyer. Han og Chewbacca flyr Falcon gjennom et asteroidefelt for å redde henne. En diger stein kommer rett mot skipet.

«Leo! Hent nødskjoldet!» roper Luke. Du bærer det bort til vinduet. Det har fire skjoldfelt og 24 energiceller. Feltene må få like mange celler for å beskytte hele vinduet.

**Fordel 24 energiceller likt mellom de 4 skjoldfeltene.**

**Kontrollert svar:** 24 : 4 = 6. Alle fire skjoldfelt får seks celler: 6 + 6 + 6 + 6 = 24.

**Ved riktig svar:** Du har gitt hvert skjoldfelt 6 celler. Nødskjoldet tennes, og steinen slår mot lyset uten å treffe vinduet.

### 2. Rydd vei med laserne

Chewbacca brøler og peker på alle asteroidene. Han oversetter i full fart: «Skjoldet er ikke nok! Det er for mange! Vi må skyte dem også!»

«Vi har bare 24 laserskudd igjen», roper Han. «Hver asteroide må treffes 6 ganger før den knuses.»

**«Hvor mange asteroider får vi skutt, Leo?»**

**Kontrollert svar:** 24 : 6 = 4 asteroider.

**Ved riktig svar:** Dere kan knuse 4 asteroider. Chewbacca fyrer av laserne, og de fire steinene sprekker foran Falcon.

### 3. R2-D2 får seg en trøkk

Laserkanonene sprenger asteroidene før de treffer skipet. Men en liten bit smetter forbi skjoldkanten, slår gjennom vinduet og treffer R2-D2. Han piper som en stukken gris! Nødskjoldet tetter hullet med en gang, men R2-D2 gnistrer.

«Vi trenger reserveenergi!» roper Luke. Han finner 8 pakker med 3 energiceller i hver, men ser at 6 celler er skadet.

**«Leo, hvor mange celler hadde vi til sammen, og hvor mange er fortsatt uskadde?»**

**Kontrollert svar:** 8 · 3 = 24. 24 − 6 = 18 friske celler.

**Ved riktig svar:** Pakkene hadde 24 celler, og 18 er uskadde. Luke setter dem trygt til side. R2-D2 blinker igjen, men trenger en ordentlig reparasjon.

### 4. Fullfør kartet

R2-D2 har funnet starten på en trygg vei ut av asteroidebeltet. Kartet viser punktene 2, 5, 8 og 11. Så kortslutter han etter asteroideskaden, og kartet deler seg i tre mulige ruter.

Chewbacca brøler så høyt at du skvetter. «Leo, finn resten av veien!» roper Han. «R2-D2 har økt tallet like mye for hvert punkt. Bare én rute fortsetter på samme måte!»

**Hvilke to tall fortsetter ruten 2, 5, 8, 11?**

Valg: 14 og 17 · 13 og 16 · 14 og 18.

**Kontrollert svar:** Rute A fortsetter med 14 og 17: hvert tall øker med 3.

**Ved riktig svar:** Ruten fortsetter med 14 og 17. Han følger kartet ditt, og Falcon kommer ut av asteroidefeltet.

### 5. Den skjulte servicehavnen

Star Destroyeren fyller vinduet. Han vil lande ved en liten servicehavn som vaktene ikke bruker. Kartet viser veien forbi skipets store kanoner.

Fra startpunktet går ruten høyre, høyre, opp. Den samme sekvensen må gjentas 2 ganger. Du programmerer kartet mens Han holder Falcon skjult.

**Legg inn de 3 pilene som skal gjentas 2 ganger på kartet.**

**Kontrollert svar:** Gjenta to ganger: høyre, høyre, opp. Ruten ender på (4,2) og følger alle de trygge rutene.

**Ved riktig svar:** Høyre, høyre, opp gjentas to ganger. Han følger ruten til servicehavnen. Han og Chewbacca blir i Falcon mens du, Luke og R2-D2 går inn.

## Del 2 · Inn på Star Destroyeren

### 6. Nøkkelen til luken

En låst dør sperrer korridoren. Bak dere begynner stormtrooperne å skyte. «R2-D2, kjapp deg! Lås opp døren!» roper du mens Luke slår skuddene unna.

R2-D2 er fortsatt skrullete etter asteroideskaden. Han henter frem tre nøkler, men klarer ikke å velge. Han piper fortvilet og ser på deg. Nøkkelhullet har 4 sider og 4 rette vinkler.

**Velg nøkkelen med 4 sider og marker de 4 rette vinklene.**

Valg: Nøkkel A · Nøkkel B · Nøkkel C.

**Kontrollert svar:** Nøkkel B er et rektangel med fire sider og fire rette vinkler. Å snu nøkkelen endrer ikke vinklene.

**Ved riktig svar:** Nøkkel B har fire sider og fire rette vinkler. Du setter den i låsen, og dere kommer gjennom før stormtrooperne når frem.

### 7. Over sjakten

Stormtrooperne skyter fortsatt bak dere. Du bruker Kraften til å beskytte vennene dine, men noen skudd treffer gulvet på den andre siden av døren. Gulvet sprenges i filler, og en sjakt sperrer veien.

«Jeg fant gulvplater i hyllen!» roper Luke. Hver plate er 1 meter lang og 1 meter bred. Hullet er 4 meter langt og 3 meter bredt.

**«Leo, hvor mange plater trenger jeg for å dekke hele hullet?»**

**Kontrollert svar:** 4 · 3 = 12 gulvplater.

**Ved riktig svar:** Det trengs 12 plater. Luke legger dem tett over sjakten, og dere krysser gulvet uten hull eller overlapp.

### 8. Reparer R2-D2

Ved neste dør klarer ikke R2-D2 å rulle videre. Luke åpner et lite deksel på ryggen hans. Tre ledninger har løsnet og må kobles i riktig rekkefølge.

Luke leser reparasjonskortet: «Gul skal være til venstre for rød. Blå skal være til høyre for rød. Alle tre skal stå på én rekke.»

**«Hvilken ledning skal i midten, Leo?» spør Luke.**

Valg: Rød · Blå · Gul.

**Kontrollert svar:** Gul ligger til venstre, rød i midten og blå til høyre.

**Ved riktig svar:** Rekkefølgen er gul, rød, blå. Luke kobler ledningene. R2-D2 piper klart og ruller bort til dørlåsen.

### 9. Låsen til Leias celle

«Leo! Luke!» Leia står bak døren til cellen sin. R2-D2 finner låsen, men må sende et signal gjennom alle kontaktene for å åpne den.

Leia ser gjennom gitteret: «Låsen har 7 skinner med 8 kontakter på hver. R2-D2 må sende signal gjennom alle sammen!»

**«Hvor mange kontakter må han sende signal gjennom, Leo?»**

**Kontrollert svar:** 7 · 8 = 56 kontakter.

**Ved riktig svar:** Det er 56 kontakter. R2-D2 sender signalet gjennom alle sammen. Celledøren åpnes, men et energigitter sperrer den siste veien ut.

### 10. Vader kommer

Darth Vader trer ut av skyggene. «Nødmeldingen var min felle, Skywalker.» Du tenner lyssabelen, men Luke stiller seg foran deg.

«Nei! Du må redde Leia! Løp, Leo! Jeg holder ham her.» R2-D2 viser deg gitterets bryter: 20 energiceller må fordeles likt på 5 felt for at gitteret skal slås av.

**Leia roper: «Hvor mange av de 20 cellene skal hvert av de 5 feltene få, Leo?»**

**Kontrollert svar:** 20 : 5 = 4 til hver seksjon.

**Ved riktig svar:** Hvert felt får 4 celler, og gitteret slås av. Du tar Leia med mot Falcon. Bak dere møtes Lukes og Vaders lyssabler.

## Del 3 · Vaders felle

### 11. Tilbake til Falcon

Du, Leia og R2-D2 løper fra cellen mot hangaren der Falcon venter. Luke blir igjen og holder Vader tilbake.

Rutekartet viser 35 meter til den store svingen og deretter 27 meter til Falcon. Han spør over sambandet hvor langt dere har igjen.

**«Hvor mange meter er det til Falcon, Leo?» spør Han over sambandet.**

**Kontrollert svar:** 35 + 27 = 62 meter.

**Ved riktig svar:** Ruten er 62 meter. Han holder rampen nede. Dere kommer inn i hangaren og ser Falcon rett foran dere.

### 12. Slå av traktorstrålen

Han gir motorene kraft, men Falcon rikker seg ikke. En traktorstråle holder skipet fast i hangaren.

R2-D2 kobler seg til skjermen ved rampen. 36 energipoeng er fordelt likt på 3 sendere. Du må finne hvor mye som skal kobles fra ved hver sender.

**«Leo! Hvor mange energipoeng må kobles fra ved hver av de 3 senderne?» roper Han.**

**Kontrollert svar:** 36 : 3 = 12 til hver sender.

**Ved riktig svar:** R2-D2 kobler fra 12 poeng ved hver sender. Traktorstrålen slipper taket. Du, Leia og R2-D2 går opp rampen til Han og Chewbacca.

### 13. Angrepet mot opprørerne

Du er i cockpiten med Leia, Han og Chewbacca. R2-D2 står ved døren. Luke kjemper fortsatt mot Vader inne på Star Destroyeren.

Dere skal til å dra da Leia roper: «Stopp!» Du ser overrasket på henne. «De planlegger et angrep mot opprørsbasen! Vi kan stanse det ved å bryte nødsignalet fra den skjermen!» Hun peker ut i hangaren. Du puster tungt, men løper ned rampen igjen. R2-D2 følger.

**Leia roper etter deg: «Signalet går gjennom 7 rekker med 4 kontakter i hver! Hvor mange kontakter må R2-D2 koble fra til sammen, Leo?»**

**Kontrollert svar:** 7 · 4 = 28 kontakter.

**Ved riktig svar:** R2-D2 kobler fra alle 28 kontaktene. Nødsignalet stanser et øyeblikk, men en reservestrøm prøver å starte det igjen. Dere må låse senderen helt av.

### 14. Bryt nødsignalet

R2-D2 viser tre brytere på senderen: blå, grønn og rød. Hver skal trykkes én gang for å stoppe reservestrømmen.

På skjermen står regelen: Trykk blå før grønn. Trykk rød sist. Du velger rekkefølgen, og R2-D2 kobler ut signalet.

**«Hvilken rekkefølge låser senderen av?» spør Leia over sambandet.**

Valg: Blå → grønn → rød · Grønn → blå → rød · Blå → rød → grønn.

**Kontrollert svar:** Blå først, så grønn og rød sist. Det oppfyller begge opplysningene.

**Ved riktig svar:** Blå, grønn, rød bryter nødsignalet. Angrepet er stanset. Du og R2-D2 skynder dere tilbake om bord i Falcon.

### 15. Vader holder skipet

Falcon letter fra gulvet. Da kommer Vader inn i hangaren og strekker ut hånden. Skipet rister og stopper like over gulvet med rampen åpen.

Du løper fra cockpiten til toppen av rampen og møter grepet hans med Kraften. Du klarer det ikke alene. Kraftmåleren viser 58 poeng for Vader og 16 for deg. Finn forskjellen, så du vet hvor mye kraft du mangler for å nå hans styrke.

**Hvor mye kraft mangler du for å nå Vaders 58 kraftpoeng når du selv har 16?**

**Kontrollert svar:** 58 − 16 = 42 kraftpoeng.

**Ved riktig svar:** Vader har 42 poeng mer enn deg. Du klarer å holde imot en stund, men trenger hjelp for å rive Falcon løs.

## Del 4 · Det siste spranget

### 16. Sammen med Luke

Luke kommer løpende til rampen. Han snur seg mot Vader og løfter hånden ved siden av din. Nå kan dere bruke Kraften sammen.

Luke har 45 kraftpoeng, og du har 16. Vader har fortsatt 58. Dere må ha mer kraft enn ham for å frigjøre Falcon.

**«Leo, hvor mye kraft har vi sammen? Er det nok, og hvor mye mer har vi enn Vader?» roper Luke.**

Valg: Ja, det er nok · Nei, det er ikke nok.

**Kontrollert svar:** 16 + 45 = 61. 61 er større enn 58. 61 − 58 = 3. Ja, sammen har de tre kraftpoeng mer enn Vader.

**Ved riktig svar:** Dere har 61 poeng, 3 mer enn Vader. Sammen river dere Falcon løs. Luke hopper inn, og dere er begge om bord.

### 17. Lukk rampen

Han styrer mot hangaråpningen, men rampen vil ikke lukke seg. R2-D2 finner en løs kontakt og rekker deg tre nøkler.

Kontakten har samme form som låsen dere åpnet tidligere: 4 sider og 4 rette vinkler. Nøklene er snudd, så du må se på vinklene, ikke hvilken vei nøkkelen peker.

**Velg riktig nøkkel og marker de 4 rette vinklene.**

Valg: Nøkkel A · Nøkkel B · Nøkkel C.

**Kontrollert svar:** Nøkkel B er et rektangel med fire sider og fire rette vinkler. Å snu nøkkelen endrer ikke vinklene.

**Ved riktig svar:** Nøkkel B passer selv om den er snudd. Du fester kontakten, og rampen lukker seg bak Luke.

### 18. Falske fottrinn

Stormtroopere løper mot Falcon. Fra skipet styrer R2-D2 høyttalerne i hangaren og sender lyden av fottrinn i motsatt retning.

Han spiller av lyden etter 8, 12, 16 og 20 sekunder. Det skal gå like mange sekunder mellom hver avspilling. Du velger de to neste tidspunktene.

**«Leo, når skal de to neste fottrinnlydene spilles?» spør Han.**

**Kontrollert svar:** 8, 12, 16, 20, 24, 28. Det øker med fire sekunder.

**Ved riktig svar:** De neste lydene kommer etter 24 og 28 sekunder. Vaktene følger det falske sporet mens Han flyr Falcon ut av hangaren.

### 19. Nok til hyperrommet?

Alle er samlet i Falcon. Star Destroyeren ligger bak dere, men dere er ikke trygge før dere kommer i hyperrommet.

Drivstoffmåleren viste 30 enheter før avgang. De 4 startmotorene brukte 6 enheter hver. Hyperromsspranget trenger 6 enheter. Han venter på at du kontrollerer om det er nok igjen.

**«Hvor mye drivstoff har vi igjen, Leo? Er det nok til spranget?» roper Han.**

Valg: Ja, det er nok · Nei, det er ikke nok.

**Kontrollert svar:** 4 · 6 = 24. 30 − 24 = 6. Ja, det er akkurat nok til spranget som krever seks.

**Ved riktig svar:** Motorene brukte 24 enheter, så 6 er igjen. Ja, det er akkurat nok til spranget. Han griper spakene og gjør Falcon klar.

### 20. Stjernene blir til lys

Han skyver spakene frem. Stjernene strekker seg til lange lysstriper, og Falcon forsvinner inn i hyperrommet. Vader blir stående igjen. Fellen hans har mislyktes.

«Takk for at du reddet meg, Leo», sier Leia. Chewbacca brøler fornøyd, og R2-D2 svarer med et lyst pip.

Luke legger hånden på skulderen din. «Godt jobbet, min unge padawan. Du brukte både hodet og Kraften. Jeg tror du er klar for flere eventyr. Eller hva tenker du?»

**Vil du ut på flere eventyr en annen gang?**

Valg: Ja! · Nei, ikke nå.

**Kontrollert svar:** Både ja og nei er gyldige valg. Dette er en avslutning, ingen matematikkprøve.

**Ved riktig svar:** Ja: Luke smiler: «Da må du be den kule faren din lage flere eventyr!»

Nei: Luke nikker: «Spenning nok for en dag? Det forstår jeg. Hvis du ønsker flere slike eventyr, må du prate med faren din.»

## Hjelp og vurdering

Hvert oppdrag har tre forberedte hint, et enklere eksempel og en kodekontrollert løsning. Kraften kan dessuten formulere svar på Leos spørsmål med eksisterende KI-oppsett. Oppgave, elevhandling og vurdering sendes samlet; moderering og tall-/ligningskontroll gjelder før visning. Ved feil eller utilgjengelig KI brukes et merket, lagret hint. Fritekstsvar er ikke en matematisk garanti.

Hjelp registreres før den vises. Hovedoppgaven beholdes. Historien kan fullføres med hjelp; disse faste oppgavene gir ingen automatisk global mestring, medaljong eller forståelsesgodkjenning. Avslutningsvalget er ikke en matematikkprøve.

Ved riktig svar tennes en lyssabel over svarflaten, og konsekvensen står hos Kraften. Neste oppdrag kommer etter åtte sekunder. «Bli her litt» stopper overgangen, og pause lagrer. Redusert bevegelse beholder statisk lyssabel og tekst.
