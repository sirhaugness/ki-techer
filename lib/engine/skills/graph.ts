import { curriculum, type AimCode } from './curriculum';
export type PartId = 1 | 2 | 3 | 4;
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type Skill = {
  id: string;
  title: string;
  description: string;
  aim: AimCode;
  part: PartId | null;
  prerequisites: readonly string[];
  generatorKey: string;
  difficultyLevels: 5;
  order: number;
  maxOperand: number;
  operations: readonly string[];
};
type Definition = [string, string, AimCode, PartId | null, string[], string?];
const definitions: Definition[] = [
  ['mult-telling-grupper', 'Tell like grupper', '3-mult', null, []],
  [
    'mult-tabell-2-5-10',
    'Gang med 2, 5 og 10',
    '3-mult',
    null,
    ['mult-telling-grupper'],
  ],
  [
    'mult-tabell-3-4',
    'Gang med 3 og 4',
    '3-mult',
    null,
    ['mult-tabell-2-5-10'],
  ],
  ['mult-tabell-6-9', 'Gang med 6 til 9', '3-mult', null, ['mult-tabell-3-4']],
  [
    'mult-kommutativ-strategi',
    'Bytt rekkefølge i ganging',
    '3-properties',
    null,
    ['mult-tabell-3-4'],
  ],
  ['dobling-halvering', 'Doble og halver', '3-double', null, []],
  ['likhetstegn', 'Forstå likhetstegnet', '3-equality', null, []],
  [
    'div-deling-konkret',
    'Fordel likt',
    '4-division',
    1,
    ['mult-telling-grupper'],
  ],
  [
    'div-maaling-konkret',
    'Lag like store grupper',
    '4-division',
    1,
    ['mult-telling-grupper'],
  ],
  [
    'div-representasjoner',
    'Fra tegning til deling',
    '4-represent',
    1,
    ['div-deling-konkret', 'div-maaling-konkret'],
  ],
  [
    'div-som-omvendt-mult',
    'Deling og ganging hører sammen',
    '4-relations',
    1,
    ['mult-tabell-2-5-10', 'div-deling-konkret'],
  ],
  [
    'div-rutenett',
    'Del et rutenett',
    '4-represent',
    1,
    ['div-representasjoner'],
  ],
  [
    'div-tallinje',
    'Del med hopp på tallinjen',
    '4-represent',
    1,
    ['div-maaling-konkret'],
  ],
  [
    'div-ukjent-faktor',
    'Finn tallet som mangler',
    '4-relations',
    1,
    ['div-som-omvendt-mult'],
  ],
  [
    'div-med-rest',
    'Deling med rest',
    '4-strategies',
    2,
    ['div-maaling-konkret'],
  ],
  [
    'div-strategier-hoderegning',
    'Del i hodet',
    '4-strategies',
    2,
    ['div-som-omvendt-mult'],
  ],
  [
    'div-distributiv',
    'Del opp et stort tall',
    '4-strategies',
    2,
    ['div-strategier-hoderegning'],
  ],
  [
    'fire-regnearter-sammenheng',
    'Se sammenhenger',
    '4-relations',
    2,
    ['div-som-omvendt-mult', 'likhetstegn'],
  ],
  [
    'omvendt-operasjon-kontroll',
    'Sjekk med motsatt regneart',
    '4-relations',
    2,
    ['fire-regnearter-sammenheng'],
  ],
  [
    'div-skriftlig',
    'Del steg for steg',
    '4-strategies',
    2,
    ['div-distributiv'],
  ],
  ['overslag', 'Gjør et overslag', '4-model', 2, ['dobling-halvering']],
  [
    'regneuttrykk-fra-situasjon',
    'Velg et regneuttrykk',
    '4-expression',
    3,
    ['div-deling-konkret'],
  ],
  [
    'situasjon-fra-regneuttrykk',
    'Finn en passende fortelling',
    '4-expression',
    3,
    ['div-maaling-konkret'],
  ],
  [
    'tekstoppgaver-flertrinn',
    'Løs en oppgave i flere steg',
    '4-model',
    3,
    ['regneuttrykk-fra-situasjon'],
  ],
  [
    'forklare-tenkemaate',
    'Velg og forklar en strategi',
    '4-model',
    3,
    ['situasjon-fra-regneuttrykk'],
  ],
  [
    'hverdag-handel',
    'Regn i butikken',
    '4-model',
    3,
    ['regneuttrykk-fra-situasjon'],
  ],
  [
    'vurdere-modell',
    'Vurder en løsning',
    '4-model',
    3,
    ['tekstoppgaver-flertrinn'],
  ],
  [
    'hverdag-ukjent',
    'Finn det ukjente i hverdagen',
    '4-expression',
    3,
    ['regneuttrykk-fra-situasjon'],
  ],
  [
    'figur-2d-egenskaper',
    'Utforsk sider, hjørner og vinkler',
    '4-geometry',
    4,
    [],
  ],
  ['figur-3d-kanter-hjorner-flater', 'Utforsk romfigurer', '4-geometry', 4, []],
  ['volum-maaleenheter', 'Mål volum med klosser og liter', '4-volume', 4, []],
  ['monster-spill', 'Oppdag et mønster', '4-pattern', 4, []],
  ['algoritme-folg-instruksjon', 'Følg en oppskrift', '4-algorithm', 4, []],
  [
    'algoritme-lag-med-lokke',
    'Bruk variabler og løkker',
    '4-algorithm',
    4,
    ['algoritme-folg-instruksjon'],
  ],
  [
    'algoritme-vilkaar',
    'Bruk hvis og ellers',
    '4-algorithm',
    4,
    ['algoritme-folg-instruksjon'],
  ],
];
export const skills: readonly Skill[] = definitions.map(
  ([id, title, aim, part, prerequisites], order) => ({
    id,
    title,
    description: title,
    aim,
    part,
    prerequisites,
    generatorKey: id,
    difficultyLevels: 5,
    order,
    maxOperand: id.startsWith('mult-tabell') ? 100 : part === null ? 200 : 1000,
    operations: id.startsWith('mult-')
      ? ['*']
      : id === 'dobling-halvering'
        ? ['*', '/']
        : part === 4
          ? ['+', '*']
          : ['+', '-', '*', '/'],
  }),
);
export function skillById(id: string): Skill {
  const skill = skills.find((s) => s.id === id);
  if (!skill) throw new Error('Ukjent ferdighet.');
  return skill;
}
export function validateGraph(graph: readonly Skill[] = skills): void {
  const byId = new Map(graph.map((s) => [s.id, s]));
  if (byId.size !== graph.length) throw new Error('Duplikate ferdigheter.');
  const visiting = new Set<string>(),
    done = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new Error('Syklus i ferdighetsgrafen.');
    if (done.has(id)) return;
    const s = byId.get(id);
    if (!s || !curriculum[s.aim])
      throw new Error('Ukjent forkunnskap eller læreplanmål.');
    visiting.add(id);
    s.prerequisites.forEach(visit);
    visiting.delete(id);
    done.add(id);
  }
  graph.forEach((s) => visit(s.id));
}
