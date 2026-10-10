// VERIFISER MOT udir.no/lk20/mat01-06
// Verified 2026-10-10. Codes below are LOCAL stable identifiers, not Udir API IDs.
export const curriculum = {
  '3-mult': {
    grade: 3,
    text: 'beskrive og utforske multiplikasjon ved teljing og gruppering',
  },
  '3-double': {
    grade: 3,
    text: 'bruke dobling og halvering i hovudrekning og skriftleg rekning',
  },
  '3-properties': {
    grade: 3,
    text: 'bruke kommutative, assosiative og distributive eigenskapar ved multiplikasjon i hovudrekning og skriftleg rekning',
  },
  '3-equality': {
    grade: 3,
    text: 'bruke likskaps- og ulikskapsteikn som relasjonelle symbol for å samanlikne storleikar, mengder, uttrykk og tal',
  },
  '4-division': {
    grade: 4,
    text: 'utforske og bruke målings- og delingsdivisjon i praktiske situasjonar',
  },
  '4-represent': {
    grade: 4,
    text: 'bruke tal, tekst, teikning og konkret for å utforske divisjon på ulike måtar og omsetje mellom dei ulike representasjonane',
  },
  '4-strategies': {
    grade: 4,
    text: 'bruke og forklare ulike divisjonsstrategiar',
  },
  '4-relations': {
    grade: 4,
    text: 'bruke hovudrekning og skriftleg rekning til å utforske og forklare samanhengar mellom dei fire rekneartane',
  },
  '4-model': {
    grade: 4,
    text: 'estimere, gjere overslag, forklare tenkjemåtar og vurdere kritisk eigne og andre sine modellar og løysingar i arbeid med praktiske situasjonar',
  },
  '4-expression': {
    grade: 4,
    text: 'lage rekneuttrykk til praktiske situasjonar og finne praktiske situasjonar som passar til oppgitte rekneuttrykk',
  },
  '4-geometry': {
    grade: 4,
    text: 'beskrive og utforske eigenskapar ved to- og tredimensjonale figurar ved å bruke vinklar, kantar, hjørne og flater',
  },
  '4-volume': {
    grade: 4,
    text: 'måle volum i praktiske situasjonar med ikkje-standardiserte og standardiserte måleiningar og samtale om resultata',
  },
  '4-pattern': {
    grade: 4,
    text: 'beskrive og utforske strukturar og mønster i leik og spel',
  },
  '4-algorithm': {
    grade: 4,
    text: 'lage algoritmar og uttrykkje dei ved bruk av variablar, vilkår og lykkjer',
  },
} as const;
export type AimCode = keyof typeof curriculum;
export const medallionParts = [
  {
    id: 1,
    title: 'Forstå divisjon',
    description: 'Del og lag grupper.',
    symbol: 'grupper',
    color: '#267d70',
  },
  {
    id: 2,
    title: 'Regnestrategier',
    description: 'Finn flere veier til svaret.',
    symbol: 'stjerne',
    color: '#89602d',
  },
  {
    id: 3,
    title: 'Matte i hverdagen',
    description: 'Utforsk hverdagens matte.',
    symbol: 'bro',
    color: '#765999',
  },
  {
    id: 4,
    title: 'Former og algoritmer',
    description: 'Oppdag former, mønstre og kode.',
    symbol: 'spiral',
    color: '#336a9a',
  },
] as const;
