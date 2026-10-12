import type { Interest } from '../learning/types';
import type { GeneratedItem } from '../engine/skills/generators';

export type StoryProgress = Record<
  string,
  { completed: number; part: 1 | 2 | 3 | 4 | null }
>;
export function activeInterest(interests: Interest[]) {
  return interests
    .filter((i) => i.active)
    .sort(
      (a, b) => (b.weight ?? 1) - (a.weight ?? 1) || a.id.localeCompare(b.id),
    )[0];
}
const worlds: Record<
  string,
  {
    actor: string;
    place: string;
    goal: string;
    object: string;
    group: string;
    icon: string;
  }
> = {
  'Star Wars': {
    actor: 'Luke og R2-D2',
    place: 'opprørernes rombase',
    goal: 'gjøre romskipet klart til å hjelpe vennene sine',
    object: 'energiceller',
    group: 'romskip',
    icon: '🌟',
  },
  Dinosaurer: {
    actor: 'Dina og sporhunden',
    place: 'dinosaurskogen',
    goal: 'finne en trygg vei til dinosaurungene',
    object: 'bær',
    group: 'dinosaurer',
    icon: '🦕',
  },
  Fotball: {
    actor: 'Leo og laget',
    place: 'fotballbanen',
    goal: 'gjøre laget klart til vennskapsturneringen',
    object: 'baller',
    group: 'lag',
    icon: '⚽',
  },
  Verdensrommet: {
    actor: 'Nova og roboten',
    place: 'romstasjonen',
    goal: 'utforske en ny planet',
    object: 'energiceller',
    group: 'romskip',
    icon: '🚀',
  },
  Dyr: {
    actor: 'Mia og reven',
    place: 'dyreskogen',
    goal: 'hjelpe dyrene hjem',
    object: 'epler',
    group: 'dyr',
    icon: '🐾',
  },
  Bygging: {
    actor: 'Bo og gravemaskinen',
    place: 'byggeplassen',
    goal: 'bygge en bro til landsbyen',
    object: 'klosser',
    group: 'vogner',
    icon: '🧱',
  },
};
function world(label: string) {
  return (
    worlds[label] ?? {
      actor: 'Leo og hjelperen',
      place: `eventyret om ${label}`,
      goal: 'løse oppdraget og finne veien videre',
      object: 'utstyrsdeler',
      group: 'lag',
      icon: '✨',
    }
  );
}
export function chapter(
  interests: Interest[],
  completed: number,
  part: 1 | 2 | 3 | 4 | null = null,
) {
  const best = activeInterest(interests);
  const number = Math.max(0, Math.floor(completed));
  const w = world(best?.label ?? 'Bygging');
  const stages = [
    'Vi samler utstyr til reisen.',
    'Vi fordeler utstyret og åpner veien videre.',
    'Vi følger kartet og hjelper vennene våre.',
    'Vi gjør oppdraget ferdig og planlegger neste reise.',
  ];
  const scene =
    best?.label === 'Star Wars'
      ? [
          'Luke og R2-D2 gjør romskipet klart.',
          'Romskipet er klart. Nå skal vennene få utstyr.',
          'Vennene har utstyr. Vi følger kartet hjem.',
          'Vennene er trygge. Vi gjør basen klar til neste reise.',
        ][Math.floor(number / 4) % 4]
      : stages[Math.floor(number / 4) % stages.length];
  return {
    scene,
    title: best ? `Matteeventyret: ${best.label}` : 'Matteeventyret',
    number: Math.floor(number / 4) + 1,
    completed: number,
    part,
    interest: best?.label ?? null,
    icon: w.icon,
    text: `${w.actor} er ved ${w.place}. Målet er å ${w.goal}. ${scene}`,
  };
}

/** Templates derive story quantities directly from verified generator parameters. */
export function adventureTask(
  item: GeneratedItem,
  label: string,
  completed: number,
) {
  const w = world(label),
    p = item.params;
  let question = item.question;
  let expressionRequired = false;
  let embedded = false;
  if (
    [
      'mult-telling-grupper',
      'mult-tabell-2-5-10',
      'mult-tabell-3-4',
      'mult-tabell-6-9',
    ].includes(item.skillId) &&
    typeof p.a === 'number' &&
    typeof p.b === 'number'
  ) {
    expressionRequired = true;
    embedded = true;
    question =
      label === 'Star Wars' && completed === 0
        ? `Luke skyter ${p.b} laserskudd mot hver av ${p.a} stormtroopere. a) Hvor mange laserskudd skyter han til sammen? b) Skriv et regnestykke som viser dette.`
        : `${w.actor} pakker ${p.a} grupper med ${p.b} ${w.object} i hver gruppe. a) Hvor mange ${w.object} er det til sammen? b) Skriv et regnestykke som viser dette.`;
  } else if (
    item.skillId.startsWith('div-') &&
    typeof p.total === 'number' &&
    typeof p.b === 'number' &&
    !['div-distributiv', 'div-med-rest'].includes(item.skillId)
  ) {
    embedded = true;
    question =
      item.skillId === 'div-maaling-konkret'
        ? `${w.actor} har ${p.total} ${w.object}. Hver gruppe trenger ${p.b}. Hvor mange grupper kan de lage?`
        : `${w.actor} fordeler ${p.total} ${w.object} likt på ${p.b} ${w.group}. Hvor mange får hver?`;
  } else if (item.skillId === 'tekstoppgaver-flertrinn') {
    embedded = true;
    question = `${w.actor} har ${p.a} poser med ${p.b} ${w.object} i hver. De får ${p.c} til. Hvor mange har de nå?`;
  } else {
    // Conservative substitutions preserve every operation and question verbatim.
    question = question
      .replaceAll('klosser', w.object)
      .replaceAll('bær', w.object)
      .replaceAll('epler', w.object)
      .replaceAll('barn', w.group);
  }
  const stages = [
    'Vi samler det vi trenger.',
    'Utstyret skal hjelpe oss videre.',
    'Vi følger kartet mot vennene våre.',
    'Nå nærmer vi oss målet.',
  ];
  return {
    text: embedded
      ? question
      : `${w.actor} er ved ${w.place}. ${stages[Math.floor(completed / 4) % stages.length]} ${question}`,
    expressionRequired,
  };
}
