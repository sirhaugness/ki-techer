/** Authored package v1. Student-safe text; answer keys stay in math.ts on the server. */
export const missions = [
  {
    id: 'SW01',
    title: 'Fire skjold',
    scene: 'Utdrag 1 av 3 · Gjennom asteroidefeltet',
    question:
      'Fordel 24 energibrikker likt på 4 skjold. Hvor mange får hvert skjold?',
    expression: '24 : 4 = ?',
    opening:
      'Leia er fanget på en romstasjon. Han og Chewbacca flyr gjennom asteroidefeltet. Luke viser deg skjoldpanelet.',
    success:
      '✓ Skjoldene har like mye energi. Fire skjoldbuer beskytter Falcon gjennom steinene.',
    hints: [
      'Finn de fire skjoldene som skal dele likt.',
      'Legg én brikke i hvert skjoldfelt. Fortsett med like runder.',
      '24 : 4 = 6. Hvert skjold får 6 brikker; 4 · 6 = 24.',
    ],
    example:
      'På øvepanelet: 8 brikker fordelt på 4 skjold gir 2 til hvert. Nå fordeler vi de 24 sammen.',
  },
  {
    id: 'SW06',
    title: 'Den riktige luken',
    scene: 'Utdrag 2 av 3 · Scenehopp: inn på stasjonen',
    question:
      'Låsen trenger en plate med 4 sider og 4 rette vinkler. Velg platen og marker de rette hjørnene.',
    expression: 'Sider: 4 · Rette vinkler: 4',
    opening:
      'Han og Chewbacca venter i Falcon. Du, Luke og R2-D2 følger serviceveien mot Leia. En låst luke stenger veien.',
    success:
      '✓ Platen passer med fire rette vinkler. Luken åpner servicekorridoren.',
    hints: [
      'Tell sidene først. Sammenlign så hjørnene.',
      'Legg en rettvinkelmal mot et hjørne. Et skrått hjørne passer ikke til malen.',
      'Plate B er rektangelet. Alle de fire hjørnene er rette vinkler.',
    ],
    example:
      'Se på bare trekanten og rektangelet først. Trekantens tre sider passer ikke til regelen om fire.',
  },
  {
    id: 'SW19',
    title: 'Samme regnestykke, to betydninger',
    scene: 'Utdrag 3 av 3 · Scenehopp: den siste fluktveien',
    question:
      'Begge panelene viser 18 : 3 = 6. Hva betyr 3-tallet på hvert panel?',
    expression: '18 : 3 = 6',
    opening:
      'Leia er fri. Vader lokket Luke hit med nødmeldingen. Luke holdt ham tilbake mens dere frigjorde Falcon. Nå må du stille inn ledesignalet og avledningen.',
    success:
      '✓ Ledesignalet og pakkene er riktig stilt inn. Luke rekker rampen; alle er om bord før spranget.',
    hints: [
      'På panel A: hva er det tre av i teksten?',
      'På B bruker hver pakke tre brikker. Er det antall pakker eller innholdet i én pakke?',
      'A: 3 sendere deler, 6 brikker til hver. B: 3 brikker i hver pakke, 6 pakker.',
    ],
    example:
      'Øvepanel: 6 : 2 = 3. To sendere får tre hver; pakker med to brikker gir tre pakker.',
  },
] as const;
export const emptyWork = () => ({
  value: null,
  groups: [0, 0, 0, 0],
  plate: null,
  corners: [],
  roleA: null,
  roleB: null,
  demonstration: null,
});
