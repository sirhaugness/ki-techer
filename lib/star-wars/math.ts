import type { Mission, Work } from './contracts';
import { emptyWork } from './contracts';
// Choice is an option id, never free text. Also cleans legacy saved work before
// it is copied into tutor memory or sent to a provider.
export function missionWork(mission: Mission, work: Work): Work {
  return {
    ...structuredClone(work),
    choice: mission.control.options?.some((option) => option.id === work.choice)
      ? work.choice
      : null,
  };
}
// Independent arithmetic/model checks. Never accept an answer or advancement from a model.
export function solutionWork(index: number): Work {
  const w = emptyWork();
  const numbers: Record<number, number[]> = {
    1: [24 / 6],
    2: [8 * 3, 8 * 3 - 6],
    6: [4 * 3],
    8: [7 * 8],
    9: [20 / 5],
    10: [35 + 27],
    11: [36 / 3],
    12: [7 * 4],
    14: [58 - 16],
    15: [16 + 45, 16 + 45 - 58],
    17: [20 + 4, 20 + 8],
    18: [30 - 4 * 6],
  };
  w.numbers = numbers[index] ?? [];
  if (index === 0) w.groups = [24 / 4, 24 / 4, 24 / 4, 24 / 4];
  if (index === 3) w.choice = 'A';
  if (index === 4) w.commands = ['right', 'right', 'up'];
  if (index === 5 || index === 16) {
    w.choice = 'B';
    w.corners = [0, 1, 2, 3];
  }
  if (index === 7) w.choice = 'red';
  if (index === 13) w.choice = 'blue-green-red';
  if (index === 15 || index === 18 || index === 19) w.choice = 'yes';
  return w;
}
export function checkWork(index: number, work: Work) {
  const expected = solutionWork(index);
  const numberIndices = [1, 2, 6, 8, 9, 10, 11, 12, 14, 15, 17, 18];
  const numericCorrect = numberIndices.includes(index)
    ? expected.numbers.every((n, i) => work.numbers[i] === n) &&
      work.numbers.length === expected.numbers.length
    : null;
  let modelCorrect = true;
  if (index === 0) modelCorrect = work.groups.every((n) => n === 6);
  else if (index === 4) {
    // Verify every step of the shown safe path, not only the final coordinate.
    const path = [
      [1, 0],
      [2, 0],
      [2, 1],
      [3, 1],
      [4, 1],
      [4, 2],
    ];
    let x = 0,
      y = 0,
      step = 0;
    modelCorrect = work.commands.length === 3;
    for (let repeat = 0; repeat < 2; repeat++)
      for (const command of work.commands) {
        x += command === 'right' ? 1 : command === 'left' ? -1 : 0;
        y += command === 'up' ? 1 : command === 'down' ? -1 : 0;
        modelCorrect &&= path[step]?.[0] === x && path[step]?.[1] === y;
        step++;
      }
  } else if (index === 5 || index === 16)
    modelCorrect =
      work.choice === 'B' &&
      work.corners.length === 4 &&
      [0, 1, 2, 3].every((c) => work.corners.includes(c));
  else if (index === 19)
    modelCorrect = work.choice === 'yes' || work.choice === 'no';
  else if (expected.choice) modelCorrect = work.choice === expected.choice;
  return {
    numericCorrect,
    modelCorrect,
    correct: numericCorrect !== false && modelCorrect,
  };
}
export function checkedSolution(index: number) {
  const w = solutionWork(index);
  if (index === 0)
    return '24 : 4 = 6. Alle fire skjoldfelt får seks celler: 6 + 6 + 6 + 6 = 24.';
  if (index === 3)
    return 'Rute A fortsetter med 14 og 17: hvert tall øker med 3.';
  if (index === 4)
    return 'Gjenta to ganger: høyre, høyre, opp. Ruten ender på (4,2) og følger alle de trygge rutene.';
  if (index === 5 || index === 16)
    return 'Nøkkel B er et rektangel med fire sider og fire rette vinkler. Å snu nøkkelen endrer ikke vinklene.';
  if (index === 7)
    return 'Gul ligger til venstre, rød i midten og blå til høyre.';
  if (index === 13)
    return 'Blå først, så grønn og rød sist. Det oppfyller begge opplysningene.';
  if (index === 15)
    return '16 + 45 = 61. 61 er større enn 58. 61 − 58 = 3. Ja, sammen har de tre kraftpoeng mer enn Vader.';
  if (index === 18)
    return '4 · 6 = 24. 30 − 24 = 6. Ja, det er akkurat nok til spranget som krever seks.';
  if (index === 19)
    return 'Både ja og nei er gyldige valg. Dette er en avslutning, ingen matematikkprøve.';
  const calculations: Record<number, string> = {
    1: '24 : 6 = 4 asteroider.',
    2: '8 · 3 = 24. 24 − 6 = 18 friske celler.',
    6: '4 · 3 = 12 gulvplater.',
    8: '7 · 8 = 56 kontakter.',
    9: '20 : 5 = 4 til hver seksjon.',
    10: '35 + 27 = 62 meter.',
    11: '36 : 3 = 12 til hver sender.',
    12: '7 · 4 = 28 kontakter.',
    14: '58 − 16 = 42 kraftpoeng.',
    17: '8, 12, 16, 20, 24, 28. Det øker med fire sekunder.',
  };
  return calculations[index] ?? w.numbers.join(', ');
}
export function workFeedback(index: number, work: Work) {
  const check = checkWork(index, work);
  if (index === 0) {
    const total = work.groups.reduce((a, b) => a + b, 0);
    if (total < 24)
      return `Du har ${24 - total} celler igjen å sette inn. Alle fire skjold skal få like mange.`;
    return 'Alle cellene er satt inn. Sammenlign skjoldet med færrest og skjoldet med flest. Kan du flytte en celle mellom dem?';
  }
  if ((index === 5 || index === 16) && work.choice === 'B')
    return 'Nøkkelen har riktig form. Marker alle hjørnene som er rette vinkler.';
  if (index === 5 || index === 16)
    return 'Se på formen til nøkkelhullet. Sammenlign både sidene og hjørnene før du velger nøkkel.';
  if (check.numericCorrect === true && !check.modelCorrect)
    return 'Tallene stemmer. Se også på valget du har markert før du sender på nytt.';
  return 'Vi prøver et steg om gangen. Se på det du har lagt inn, og bruk Kraften hvis du vil ha hjelp.';
}
