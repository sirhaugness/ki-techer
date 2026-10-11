import type { Interest } from '../learning/types';
export function chapter(interests: Interest[], completed: number) {
  const best = interests
    .filter((i) => i.active)
    .sort(
      (a, b) => (b.weight ?? 1) - (a.weight ?? 1) || a.id.localeCompare(b.id),
    )[0];
  const stages = [
    'Vi finner en sti og utforsker matte sammen.',
    'På stien deler vi utstyr og finner mønstre.',
    'Vi tegner et kart og prøver nye løsninger.',
    'Vi ser tilbake på det vi har utforsket. Nye stier venter.',
  ];
  const number = Math.max(0, Math.floor(completed));
  const setting =
    best?.label === 'Dinosaurer'
      ? 'Vi følger spor i dinosaurskogen.'
      : best?.label === 'Fotball'
        ? 'Laget vårt utforsker en ny treningsbane.'
        : best?.label === 'Verdensrommet'
          ? 'Vi reiser til en ny planet.'
          : best?.label === 'Dyr'
            ? 'Vi hjelper dyrene på en oppdagelsesferd.'
            : best?.label === 'Bygging'
              ? 'Vi bygger en vei til en ny landsby.'
              : 'Vi legger ut på en oppdagelsesferd.';
  return {
    title: best ? `Matteeventyret: ${best.label}` : 'Matteeventyret',
    number: number + 1,
    text: `${setting} ${stages[number % stages.length]}`,
  };
}
