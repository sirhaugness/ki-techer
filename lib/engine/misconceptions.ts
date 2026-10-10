export const misconceptions = {
  DIV_KOMMUTATIV: {
    description: 'Bytter teller og nevner i divisjon.',
    strategy: 'Sammenlign å dele 12 på 3 med å dele 3 på 12.',
  },
  DIV_SOM_ADD: {
    description: 'Legger sammen i stedet for å dele.',
    strategy: 'Fordel gjenstandene i like grupper.',
  },
  DIV_REST_IGNORERT: {
    description: 'Glemmer resten i divisjon.',
    strategy: 'Tell det som ikke passer i en hel gruppe.',
  },
  DELING_VS_MAALING: {
    description: 'Forveksler gruppestørrelse og antall grupper.',
    strategy: 'Vis hva vi vet om gruppene før vi fordeler.',
  },
  MULT_SOM_ADD: {
    description: 'Legger sammen faktorene.',
    strategy: 'Tegn like grupper og tell alt.',
  },
  NABOFAKTA: {
    description: 'Bruker en nærliggende gangetabellfakta.',
    strategy: 'Legg til eller ta bort én gruppe.',
  },
  PLASSVERDI_FEIL: {
    description: 'Forveksler enere og tiere.',
    strategy: 'Bygg tallet med tierblokker.',
  },
  FIGUR_KANT_HJORNE: {
    description: 'Forveksler kanter, hjørner eller flater.',
    strategy: 'Pek på én av gangen på figuren.',
  },
  ALGORITME_LOKKE: {
    description: 'Glemmer å gjenta alle stegene.',
    strategy: 'Følg løkken én runde av gangen.',
  },
} as const;
export type MisconceptionCode = keyof typeof misconceptions;
export function detectMisconception(
  answer: unknown,
  wrong: readonly { value: unknown; misconceptionCode: MisconceptionCode }[],
): MisconceptionCode | null {
  return (
    wrong.find((w) => JSON.stringify(w.value) === JSON.stringify(answer))
      ?.misconceptionCode ?? null
  );
}
