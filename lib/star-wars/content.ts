import type { Mission } from './contracts';

/** Authored scenes; runtime reads this package without generating new chapters. */
export const missions: Mission[] = [
  {
    id: 'SW01',
    title: 'Nødskjoldet',
    act: 'Del 1 · Gjennom asteroidefeltet',
    image: 'cockpit',
    narrative: [
      'Leia er fanget på en Star Destroyer. Han og Chewbacca flyr Falcon gjennom et asteroidefelt for å redde henne. En diger stein kommer rett mot skipet.',
      '«Leo! Hent nødskjoldet!» roper Luke. Du bærer det bort til vinduet. Det har fire skjoldfelt og 24 energiceller. Feltene må få like mange celler for å beskytte hele vinduet.',
    ],
    question: 'Fordel 24 energiceller likt mellom de 4 skjoldfeltene.',
    control: {
      kind: 'groups',
      labels: ['Skjoldfelt 1', 'Skjoldfelt 2', 'Skjoldfelt 3', 'Skjoldfelt 4'],
    },
    skillId: 'div-deling-konkret',
    mode: 'teaching',
    success:
      'Du har gitt hvert skjoldfelt 6 celler. Nødskjoldet tennes, og steinen slår mot lyset uten å treffe vinduet.',
    hints: [
      'Alle de fire skjoldfeltene skal få like mange celler. Ingen celler skal bli igjen.',
      'Legg én celle i hvert felt. Fortsett med like runder til alle cellene er fordelt.',
      '24 : 4 = 6. Legg 6 celler i hvert av de fire feltene. Da bruker du alle 24.',
    ],
    example:
      'På øvepanelet: 8 celler fordelt likt på 4 felt gir 2 i hvert. Nå gjør vi det samme med de 24 cellene.',
  },
  {
    id: 'SW02',
    title: 'Rydd vei med laserne',
    act: 'Del 1 · Gjennom asteroidefeltet',
    image: 'cockpit',
    narrative: [
      'Chewbacca brøler og peker på alle asteroidene. Han oversetter i full fart: «Skjoldet er ikke nok! Det er for mange! Vi må skyte dem også!»',
      '«Vi har bare 24 laserskudd igjen», roper Han. «Hver asteroide må treffes 6 ganger før den knuses.»',
    ],
    question: '«Hvor mange asteroider får vi skutt, Leo?»',
    control: { kind: 'numbers', labels: ['Antall asteroider'] },
    skillId: 'div-maaling-konkret',
    mode: 'guided-practice',
    success:
      'Dere kan knuse 4 asteroider. Chewbacca fyrer av laserne, og de fire steinene sprekker foran Falcon.',
    hints: [
      'Finn hvor mange skudd én asteroide krever. Det er ikke antall asteroider.',
      'Ta bort 6 skudd for hver stein. Tell hvor mange slike grupper du kan lage.',
      '24 : 6 = 4. Fire grupper med 6 skudd bruker alle de 24 skuddene.',
    ],
    example:
      'På øvepanelet: Med 12 skudd og 6 til hver stein kan du knuse 2 steiner. Prøv nå med 24 skudd.',
  },
  {
    id: 'SW03',
    title: 'R2-D2 får seg en trøkk',
    act: 'Del 1 · Gjennom asteroidefeltet',
    image: 'cockpit',
    narrative: [
      'Laserkanonene sprenger asteroidene før de treffer skipet. Men en liten bit smetter forbi skjoldkanten, slår gjennom vinduet og treffer R2-D2. Han piper som en stukken gris! Nødskjoldet tetter hullet med en gang, men R2-D2 gnistrer.',
      '«Vi trenger reserveenergi!» roper Luke. Han finner 8 pakker med 3 energiceller i hver, men ser at 6 celler er skadet.',
    ],
    question:
      '«Leo, hvor mange celler hadde vi til sammen, og hvor mange er fortsatt uskadde?»',
    control: {
      kind: 'numbers',
      labels: ['Celler til sammen', 'Uskadde celler'],
    },
    skillId: 'tekstoppgaver-flertrinn',
    mode: 'guided-practice',
    success:
      'Pakkene hadde 24 celler, og 18 er uskadde. Luke setter dem trygt til side. R2-D2 blinker igjen, men trenger en ordentlig reparasjon.',
    hints: [
      'Finn først hvor mange celler de åtte pakkene inneholder. Deretter tar du bort de skadde.',
      'Hver pakke har 3 celler. Regn 8 · 3 før du trekker fra 6.',
      '8 · 3 = 24 celler til sammen. 24 − 6 = 18 uskadde celler.',
    ],
    example:
      'På øvepanelet: 4 pakker med 3 celler gir 12. Hvis 2 er skadet, er 10 uskadde. Bruk så tallene fra oppgaven.',
  },
  {
    id: 'SW04',
    title: 'Fullfør kartet',
    act: 'Del 1 · Gjennom asteroidefeltet',
    image: 'cockpit',
    narrative: [
      'R2-D2 har funnet starten på en trygg vei ut av asteroidebeltet. Kartet viser punktene 2, 5, 8 og 11. Så kortslutter han etter asteroideskaden, og kartet deler seg i tre mulige ruter.',
      'Chewbacca brøler så høyt at du skvetter. «Leo, finn resten av veien!» roper Han. «R2-D2 har økt tallet like mye for hvert punkt. Bare én rute fortsetter på samme måte!»',
    ],
    question: 'Hvilke to tall fortsetter ruten 2, 5, 8, 11?',
    control: {
      kind: 'route',
      labels: ['Velg de to neste punktene'],
      options: [
        { id: 'A', label: '14 og 17', values: [14, 17] },
        { id: 'B', label: '13 og 16', values: [13, 16] },
        { id: 'C', label: '14 og 18', values: [14, 18] },
      ],
    },
    skillId: 'monster-spill',
    mode: 'guided-practice',
    success:
      'Ruten fortsetter med 14 og 17. Han følger kartet ditt, og Falcon kommer ut av asteroidefeltet.',
    hints: [
      'Sammenlign to tall ved siden av hverandre. Hvor mye øker tallet?',
      'Fra 2 til 5 og fra 5 til 8 er det 3 mer. Fortsett med samme tillegg etter 11.',
      '11 + 3 = 14, og 14 + 3 = 17. Rute A fortsetter mønsteret.',
    ],
    example:
      'På øvepanelet: 1, 4, 7 fortsetter med 10 og 13. Vi legger til 3 hver gang. Bruk samme regel på kartet.',
  },
  {
    id: 'SW05',
    title: 'Den skjulte servicehavnen',
    act: 'Del 1 · Gjennom asteroidefeltet',
    image: 'cockpit',
    narrative: [
      'Star Destroyeren fyller vinduet. Han vil lande ved en liten servicehavn som vaktene ikke bruker. Kartet viser veien forbi skipets store kanoner.',
      'Fra startpunktet går ruten høyre, høyre, opp. Den samme sekvensen må gjentas 2 ganger. Du programmerer kartet mens Han holder Falcon skjult.',
    ],
    question: 'Legg inn de 3 pilene som skal gjentas 2 ganger på kartet.',
    control: {
      kind: 'program',
      labels: ['Tre piler i gjenta-blokken'],
      grid: { columns: 6, rows: 4 },
    },
    skillId: 'algoritme-lag-med-lokke',
    mode: 'guided-practice',
    success:
      'Høyre, høyre, opp gjentas to ganger. Han følger ruten til servicehavnen. Han og Chewbacca blir i Falcon mens du, Luke og R2-D2 går inn.',
    hints: [
      'Finn de tre bevegelsene i teksten. Hele rekken skal gjentas.',
      'De to første pilene går mot høyre. Den siste går opp.',
      'Legg inn høyre, høyre, opp. Gjenta to ganger gir fire steg til høyre og to opp fra start.',
    ],
    example:
      'På øvepanelet: Gjenta [høyre, opp] 2 ganger gir høyre, opp, høyre, opp. Nå bruker du oppgavens tre piler.',
  },
  {
    id: 'SW06',
    title: 'Nøkkelen til luken',
    act: 'Del 2 · Inn på Star Destroyeren',
    image: 'corridor',
    narrative: [
      'En låst dør sperrer korridoren. Bak dere begynner stormtrooperne å skyte. «R2-D2, kjapp deg! Lås opp døren!» roper du mens Luke slår skuddene unna.',
      'R2-D2 er fortsatt skrullete etter asteroideskaden. Han henter frem tre nøkler, men klarer ikke å velge. Han piper fortvilet og ser på deg. Nøkkelhullet har 4 sider og 4 rette vinkler.',
    ],
    question: 'Velg nøkkelen med 4 sider og marker de 4 rette vinklene.',
    control: {
      kind: 'shape',
      labels: ['Velg nøkkel', 'Marker de rette vinklene'],
      options: [
        { id: 'A', label: 'Nøkkel A' },
        { id: 'B', label: 'Nøkkel B' },
        { id: 'C', label: 'Nøkkel C' },
      ],
    },
    skillId: 'figur-2d-egenskaper',
    mode: 'teaching',
    success:
      'Nøkkel B har fire sider og fire rette vinkler. Du setter den i låsen, og dere kommer gjennom før stormtrooperne når frem.',
    hints: [
      'Tell sidene først. Sammenlign deretter vinklene der sidene møtes.',
      'Et rett hjørne passer til hjørnet på en firkantet vinkelmal. Prøv malen mot nøklene.',
      'Velg rektangelet, nøkkel B, og marker alle de fire hjørnene. Alle har rette vinkler.',
    ],
    example:
      'På øvepanelet: En trekant har bare 3 sider. Et rektangel har 4 sider og 4 rette vinkler. Sammenlign så de tre nøklene.',
  },
  {
    id: 'SW07',
    title: 'Over sjakten',
    act: 'Del 2 · Inn på Star Destroyeren',
    image: 'corridor',
    narrative: [
      'Stormtrooperne skyter fortsatt bak dere. Du bruker Kraften til å beskytte vennene dine, men noen skudd treffer gulvet på den andre siden av døren. Gulvet sprenges i filler, og en sjakt sperrer veien.',
      '«Jeg fant gulvplater i hyllen!» roper Luke. Hver plate er 1 meter lang og 1 meter bred. Hullet er 4 meter langt og 3 meter bredt.',
    ],
    question: '«Leo, hvor mange plater trenger jeg for å dekke hele hullet?»',
    control: {
      kind: 'numbers',
      labels: ['Antall plater'],
      grid: { columns: 4, rows: 3 },
    },
    skillId: 'mult-telling-grupper',
    mode: 'guided-practice',
    success:
      'Det trengs 12 plater. Luke legger dem tett over sjakten, og dere krysser gulvet uten hull eller overlapp.',
    hints: [
      'Du skal dekke hele flaten. Å telle langs kanten er ikke nok.',
      'Det er plass til 4 plater i hver av 3 rader. Tell radene eller legg sammen fire tre ganger.',
      '4 · 3 = 12. Tolv plater dekker 12 m².',
    ],
    example:
      'På øvepanelet: 2 rader med 3 plater dekker 6 ruter. Se deretter på oppgavens 3 rader med 4.',
  },
  {
    id: 'SW08',
    title: 'Reparer R2-D2',
    act: 'Del 2 · Inn på Star Destroyeren',
    image: 'corridor',
    narrative: [
      'Ved neste dør klarer ikke R2-D2 å rulle videre. Luke åpner et lite deksel på ryggen hans. Tre ledninger har løsnet og må kobles i riktig rekkefølge.',
      'Luke leser reparasjonskortet: «Gul skal være til venstre for rød. Blå skal være til høyre for rød. Alle tre skal stå på én rekke.»',
    ],
    question: '«Hvilken ledning skal i midten, Leo?» spør Luke.',
    control: {
      kind: 'choice',
      labels: ['Ledningen i midten'],
      options: [
        { id: 'red', label: 'Rød' },
        { id: 'blue', label: 'Blå' },
        { id: 'yellow', label: 'Gul' },
      ],
    },
    skillId: 'algoritme-folg-instruksjon',
    mode: 'guided-practice',
    success:
      'Rekkefølgen er gul, rød, blå. Luke kobler ledningene. R2-D2 piper klart og ruller bort til dørlåsen.',
    hints: [
      'Prøv å plassere de tre fargene fra venstre mot høyre.',
      'Gul må komme før rød, og blå må komme etter rød. Da har rød en farge på hver side.',
      'Gul står til venstre, rød i midten og blå til høyre. Velg rød.',
    ],
    example:
      'På øvepanelet: Hvis Han står til venstre for Leo og Luke til høyre for Leo, står Leo i midten. Prøv så med ledningenes farger.',
  },
  {
    id: 'SW09',
    title: 'Låsen til Leias celle',
    act: 'Del 2 · Inn på Star Destroyeren',
    image: 'corridor',
    narrative: [
      '«Leo! Luke!» Leia står bak døren til cellen sin. R2-D2 finner låsen, men må sende et signal gjennom alle kontaktene for å åpne den.',
      'Leia ser gjennom gitteret: «Låsen har 7 skinner med 8 kontakter på hver. R2-D2 må sende signal gjennom alle sammen!»',
    ],
    question: '«Hvor mange kontakter må han sende signal gjennom, Leo?»',
    control: { kind: 'numbers', labels: ['Kontakter til sammen'] },
    skillId: 'mult-tabell-6-9',
    mode: 'guided-practice',
    success:
      'Det er 56 kontakter. R2-D2 sender signalet gjennom alle sammen. Celledøren åpnes, men et energigitter sperrer den siste veien ut.',
    hints: [
      'Hver av de sju skinnene har like mange kontakter. Du skal finne alle kontaktene.',
      'Regn 5 · 8 og 2 · 8. Legg de to delene sammen.',
      '5 · 8 = 40 og 2 · 8 = 16. 40 + 16 = 56 kontakter.',
    ],
    example:
      'På øvepanelet: 3 skinner med 4 kontakter på hver gir 12. Bruk så 7 skinner og 8 på hver.',
  },
  {
    id: 'SW10',
    title: 'Vader kommer',
    act: 'Del 2 · Inn på Star Destroyeren',
    image: 'corridor',
    narrative: [
      'Darth Vader trer ut av skyggene. «Nødmeldingen var min felle, Skywalker.» Du tenner lyssabelen, men Luke stiller seg foran deg.',
      '«Nei! Du må redde Leia! Løp, Leo! Jeg holder ham her.» R2-D2 viser deg gitterets bryter: 20 energiceller må fordeles likt på 5 felt for at gitteret skal slås av.',
    ],
    question:
      'Leia roper: «Hvor mange av de 20 cellene skal hvert av de 5 feltene få, Leo?»',
    control: { kind: 'numbers', labels: ['Celler i hvert felt'] },
    skillId: 'div-deling-konkret',
    mode: 'independent-check',
    success:
      'Hvert felt får 4 celler, og gitteret slås av. Du tar Leia med mot Falcon. Bak dere møtes Lukes og Vaders lyssabler.',
    hints: [
      'Det finnes allerede fem felt. Du skal finne hvor mange celler hvert felt får.',
      'Fordel én celle til hvert felt om gangen. Hvor mange runder rekker de tjue cellene til?',
      '20 : 5 = 4. Fire celler i hvert av fem felt bruker alle tjue.',
    ],
    example:
      'På øvepanelet: 10 celler fordelt likt på 5 felt gir 2 i hvert. Bruk samme måte med 20 celler.',
  },
  {
    id: 'SW11',
    title: 'Tilbake til Falcon',
    act: 'Del 3 · Vaders felle',
    image: 'hangar',
    narrative: [
      'Du, Leia og R2-D2 løper fra cellen mot hangaren der Falcon venter. Luke blir igjen og holder Vader tilbake.',
      'Rutekartet viser 35 meter til den store svingen og deretter 27 meter til Falcon. Han spør over sambandet hvor langt dere har igjen.',
    ],
    question:
      '«Hvor mange meter er det til Falcon, Leo?» spør Han over sambandet.',
    control: { kind: 'numbers', labels: ['Meter til sammen'] },
    skillId: 'regneuttrykk-fra-situasjon',
    mode: 'guided-practice',
    success:
      'Ruten er 62 meter. Han holder rampen nede. Dere kommer inn i hangaren og ser Falcon rett foran dere.',
    hints: [
      'Begge strekningene er deler av veien dere skal gå. De skal legges sammen.',
      'Legg først til 20 meter på 35. Legg så til de siste 7 meterne.',
      '35 + 27 = 62. Hele ruten er 62 meter.',
    ],
    example:
      'På øvepanelet: 12 meter til en sving og 8 meter videre gir 20 meter til sammen. Legg så sammen oppgavens strekninger.',
  },
  {
    id: 'SW12',
    title: 'Slå av traktorstrålen',
    act: 'Del 3 · Vaders felle',
    image: 'hangar',
    narrative: [
      'Han gir motorene kraft, men Falcon rikker seg ikke. En traktorstråle holder skipet fast i hangaren.',
      'R2-D2 kobler seg til skjermen ved rampen. 36 energipoeng er fordelt likt på 3 sendere. Du må finne hvor mye som skal kobles fra ved hver sender.',
    ],
    question:
      '«Leo! Hvor mange energipoeng må kobles fra ved hver av de 3 senderne?» roper Han.',
    control: { kind: 'numbers', labels: ['Energipoeng per sender'] },
    skillId: 'div-distributiv',
    mode: 'guided-practice',
    success:
      'R2-D2 kobler fra 12 poeng ved hver sender. Traktorstrålen slipper taket. Du, Leia og R2-D2 går opp rampen til Han og Chewbacca.',
    hints: [
      'De tre senderne deler energien likt. Finn mengden ved én sender.',
      'Del 36 i 30 og 6. Fordel begge delene likt mellom de tre senderne.',
      '30 : 3 = 10 og 6 : 3 = 2. Hver sender har 10 + 2 = 12 energipoeng.',
    ],
    example:
      'På øvepanelet: 18 poeng på 3 sendere gir 6 til hver. Prøv så å dele 36 ved å bruke to lettere deler.',
  },
  {
    id: 'SW13',
    title: 'Angrepet mot opprørerne',
    act: 'Del 3 · Vaders felle',
    image: 'hangar',
    narrative: [
      'Du er i cockpiten med Leia, Han og Chewbacca. R2-D2 står ved døren. Luke kjemper fortsatt mot Vader inne på Star Destroyeren.',
      'Dere skal til å dra da Leia roper: «Stopp!» Du ser overrasket på henne. «De planlegger et angrep mot opprørsbasen! Vi kan stanse det ved å bryte nødsignalet fra den skjermen!» Hun peker ut i hangaren. Du puster tungt, men løper ned rampen igjen. R2-D2 følger.',
    ],
    question:
      'Leia roper etter deg: «Signalet går gjennom 7 rekker med 4 kontakter i hver! Hvor mange kontakter må R2-D2 koble fra til sammen, Leo?»',
    control: { kind: 'numbers', labels: ['Angrepskontakter til sammen'] },
    skillId: 'mult-tabell-3-4',
    mode: 'independent-check',
    success:
      'R2-D2 kobler fra alle 28 kontaktene. Nødsignalet stanser et øyeblikk, men en reservestrøm prøver å starte det igjen. Dere må låse senderen helt av.',
    hints: [
      'Finn alle kontaktene i de sju rekkene. Hver rekke har fire.',
      'Fem rekker har 20 kontakter. Finn kontaktene i de to siste rekkene og legg dem til.',
      '7 · 4 = 28. Det er 28 angrepskontakter til sammen.',
    ],
    example:
      'På øvepanelet: 3 rekker med 4 kontakter har 12 kontakter. Prøv så med 7 rekker.',
  },
  {
    id: 'SW14',
    title: 'Bryt nødsignalet',
    act: 'Del 3 · Vaders felle',
    image: 'hangar',
    narrative: [
      'R2-D2 viser tre brytere på senderen: blå, grønn og rød. Hver skal trykkes én gang for å stoppe reservestrømmen.',
      'På skjermen står regelen: Trykk blå før grønn. Trykk rød sist. Du velger rekkefølgen, og R2-D2 kobler ut signalet.',
    ],
    question:
      '«Hvilken rekkefølge låser senderen av?» spør Leia over sambandet.',
    control: {
      kind: 'choice',
      labels: ['Rekkefølgen på bryterne'],
      options: [
        { id: 'blue-green-red', label: 'Blå → grønn → rød' },
        { id: 'green-blue-red', label: 'Grønn → blå → rød' },
        { id: 'blue-red-green', label: 'Blå → rød → grønn' },
      ],
    },
    skillId: 'algoritme-folg-instruksjon',
    mode: 'independent-check',
    success:
      'Blå, grønn, rød bryter nødsignalet. Angrepet er stanset. Du og R2-D2 skynder dere tilbake om bord i Falcon.',
    hints: [
      'Begge reglene må stemme i samme rekkefølge.',
      'Sett rød sist. De to plassene foran må ha blå før grønn.',
      'Trykk blå først, grønn etterpå og rød til slutt.',
    ],
    example:
      'På øvepanelet: Hvis Han går før Leia og Leo går sist, blir rekkefølgen Han, Leia, Leo. Bruk så reglene for bryterne.',
  },
  {
    id: 'SW15',
    title: 'Vader holder skipet',
    act: 'Del 3 · Vaders felle',
    image: 'force',
    narrative: [
      'Falcon letter fra gulvet. Da kommer Vader inn i hangaren og strekker ut hånden. Skipet rister og stopper like over gulvet med rampen åpen.',
      'Du løper fra cockpiten til toppen av rampen og møter grepet hans med Kraften. Du klarer det ikke alene. Kraftmåleren viser 58 poeng for Vader og 16 for deg. Finn forskjellen, så du vet hvor mye kraft du mangler for å nå hans styrke.',
    ],
    question:
      'Hvor mye kraft mangler du for å nå Vaders 58 kraftpoeng når du selv har 16?',
    control: { kind: 'numbers', labels: ['Forskjell i kraftpoeng'] },
    skillId: 'hverdag-ukjent',
    mode: 'guided-practice',
    success:
      'Vader har 42 poeng mer enn deg. Du klarer å holde imot en stund, men trenger hjelp for å rive Falcon løs.',
    hints: [
      'Du skal finne forskjellen mellom 58 og 16, ikke legge styrkene sammen.',
      'Trekk først 10 fra 58. Trekk så fra de siste 6.',
      '58 − 16 = 42. Vader har 42 flere kraftpoeng enn deg.',
    ],
    example:
      'På øvepanelet: En styrke på 20 og en på 8 har forskjellen 12. Finn så forskjellen mellom 58 og 16.',
  },
  {
    id: 'SW16',
    title: 'Sammen med Luke',
    act: 'Del 4 · Det siste spranget',
    image: 'force',
    narrative: [
      'Luke kommer løpende til rampen. Han snur seg mot Vader og løfter hånden ved siden av din. Nå kan dere bruke Kraften sammen.',
      'Luke har 45 kraftpoeng, og du har 16. Vader har fortsatt 58. Dere må ha mer kraft enn ham for å frigjøre Falcon.',
    ],
    question:
      '«Leo, hvor mye kraft har vi sammen? Er det nok, og hvor mye mer har vi enn Vader?» roper Luke.',
    control: {
      kind: 'numbers',
      labels: ['Kraftpoeng sammen', 'Poeng mer enn Vader'],
      options: [
        { id: 'yes', label: 'Ja, det er nok' },
        { id: 'no', label: 'Nei, det er ikke nok' },
      ],
    },
    skillId: 'tekstoppgaver-flertrinn',
    mode: 'guided-practice',
    success:
      'Dere har 61 poeng, 3 mer enn Vader. Sammen river dere Falcon løs. Luke hopper inn, og dere er begge om bord.',
    hints: [
      'Finn først summen av din og Lukes kraft. Sammenlign så med Vaders 58.',
      'Legg 16 til 45. Trekk deretter 58 fra summen for å finne hvor mye sterkere dere er.',
      '45 + 16 = 61. 61 − 58 = 3. Ja, dere har 3 poeng mer enn Vader.',
    ],
    example:
      'På øvepanelet: 20 og 12 gir 32 sammen. Mot 30 er det 2 mer, så det er nok. Bruk så deres kraftpoeng.',
  },
  {
    id: 'SW17',
    title: 'Lukk rampen',
    act: 'Del 4 · Det siste spranget',
    image: 'force',
    narrative: [
      'Han styrer mot hangaråpningen, men rampen vil ikke lukke seg. R2-D2 finner en løs kontakt og rekker deg tre nøkler.',
      'Kontakten har samme form som låsen dere åpnet tidligere: 4 sider og 4 rette vinkler. Nøklene er snudd, så du må se på vinklene, ikke hvilken vei nøkkelen peker.',
    ],
    question: 'Velg riktig nøkkel og marker de 4 rette vinklene.',
    control: {
      kind: 'shape',
      labels: ['Velg nøkkel', 'Marker de rette vinklene'],
      rotated: true,
      options: [
        { id: 'A', label: 'Nøkkel A' },
        { id: 'B', label: 'Nøkkel B' },
        { id: 'C', label: 'Nøkkel C' },
      ],
    },
    skillId: 'figur-2d-egenskaper',
    mode: 'independent-check',
    success:
      'Nøkkel B passer selv om den er snudd. Du fester kontakten, og rampen lukker seg bak Luke.',
    hints: [
      'En figur beholder sidene og vinklene sine når hele figuren snus.',
      'Sammenlign hjørnene med en rettvinkelmal. Alle fire må passe.',
      'Velg det roterte rektangelet, nøkkel B. Marker alle fire hjørnene med rette vinkler.',
    ],
    example:
      'På øvepanelet: Et rektangulært kort har fortsatt fire rette vinkler når du snur det. Se så på nøklene.',
  },
  {
    id: 'SW18',
    title: 'Falske fottrinn',
    act: 'Del 4 · Det siste spranget',
    image: 'force',
    narrative: [
      'Stormtroopere løper mot Falcon. Fra skipet styrer R2-D2 høyttalerne i hangaren og sender lyden av fottrinn i motsatt retning.',
      'Han spiller av lyden etter 8, 12, 16 og 20 sekunder. Det skal gå like mange sekunder mellom hver avspilling. Du velger de to neste tidspunktene.',
    ],
    question: '«Leo, når skal de to neste fottrinnlydene spilles?» spør Han.',
    control: {
      kind: 'numbers',
      labels: [
        'Neste tidspunkt i sekunder',
        'Tidspunktet etter det i sekunder',
      ],
    },
    skillId: 'monster-spill',
    mode: 'independent-check',
    success:
      'De neste lydene kommer etter 24 og 28 sekunder. Vaktene følger det falske sporet mens Han flyr Falcon ut av hangaren.',
    hints: [
      'Finn hvor mange sekunder det er mellom to tidspunkter ved siden av hverandre.',
      'Fra 12 til 16 er det 4 sekunder. Legg til det samme etter 20.',
      '20 + 4 = 24 og 24 + 4 = 28. Skriv 24 og 28 sekunder.',
    ],
    example:
      'På øvepanelet: Tidspunktene 4, 8, 12 fortsetter med 16 og 20. Bruk samme tillegg etter oppgavens 20.',
  },
  {
    id: 'SW19',
    title: 'Nok til hyperrommet?',
    act: 'Del 4 · Det siste spranget',
    image: 'cockpit',
    narrative: [
      'Alle er samlet i Falcon. Star Destroyeren ligger bak dere, men dere er ikke trygge før dere kommer i hyperrommet.',
      'Drivstoffmåleren viste 30 enheter før avgang. De 4 startmotorene brukte 6 enheter hver. Hyperromsspranget trenger 6 enheter. Han venter på at du kontrollerer om det er nok igjen.',
    ],
    question:
      '«Hvor mye drivstoff har vi igjen, Leo? Er det nok til spranget?» roper Han.',
    control: {
      kind: 'numbers',
      labels: ['Drivstoffenheter igjen'],
      options: [
        { id: 'yes', label: 'Ja, det er nok' },
        { id: 'no', label: 'Nei, det er ikke nok' },
      ],
    },
    skillId: 'tekstoppgaver-flertrinn',
    mode: 'independent-check',
    success:
      'Motorene brukte 24 enheter, så 6 er igjen. Ja, det er akkurat nok til spranget. Han griper spakene og gjør Falcon klar.',
    hints: [
      'Finn forbruket til alle fire startmotorene før du regner ut hva som er igjen.',
      'Regn 4 · 6. Trekk forbruket fra 30, og sammenlign resten med de 6 enhetene spranget trenger.',
      '4 · 6 = 24, og 30 − 24 = 6. Ja, de 6 enhetene er akkurat nok.',
    ],
    example:
      'På øvepanelet: Med 16 enheter og to motorer som bruker 5 hver, er 6 igjen. Et sprang som trenger 6, har akkurat nok.',
  },
  {
    id: 'SW20',
    title: 'Stjernene blir til lys',
    act: 'Del 4 · Det siste spranget',
    image: 'cockpit',
    narrative: [
      'Han skyver spakene frem. Stjernene strekker seg til lange lysstriper, og Falcon forsvinner inn i hyperrommet. Vader blir stående igjen. Fellen hans har mislyktes.',
      '«Takk for at du reddet meg, Leo», sier Leia. Chewbacca brøler fornøyd, og R2-D2 svarer med et lyst pip.',
      'Luke legger hånden på skulderen din. «Godt jobbet, min unge padawan. Du brukte både hodet og Kraften. Jeg tror du er klar for flere eventyr. Eller hva tenker du?»',
    ],
    question: 'Vil du ut på flere eventyr en annen gang?',
    control: {
      kind: 'ending',
      labels: ['Ditt valg'],
      options: [
        { id: 'yes', label: 'Ja!' },
        { id: 'no', label: 'Nei, ikke nå' },
      ],
    },
    skillId: 'forklare-tenkemaate',
    mode: 'teaching',
    success:
      'Du reddet Leia og fikk vennene dine trygt ut av Vaders felle. Eventyret er fullført, og du kan ta pause.',
    hints: [
      'Her velger du bare hva du har lyst til. Det finnes ikke et galt svar.',
      'Ja betyr at du har lyst på et nytt eventyr senere. Ikke nå betyr at du vil stoppe her.',
      'Du kan velge enten Ja eller Ikke nå. Begge avslutter dette eventyret.',
    ],
    example:
      'Dette er et valg, ikke en regneoppgave. Du kan avslutte selv om du har lyst til å spille igjen senere.',
  },
];
