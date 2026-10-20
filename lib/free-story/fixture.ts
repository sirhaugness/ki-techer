import 'server-only';
import { randomUUID } from 'node:crypto';
import { fixture, fixtureEnabled } from '../learning/fixture';
import { planMath } from './planner';
import { produceChapter } from './generation';
import type { FreeChapter } from './types';

const scope = globalThis as typeof globalThis & {
  freeChapters?: Map<string, FreeChapter>;
};
export function chapterFixtures() {
  if (!fixtureEnabled()) throw Error('Testkapitler er avslått.');
  return (scope.freeChapters ??= new Map());
}
export function resetChapterFixtures() {
  chapterFixtures().clear();
}

// Handwritten plot fixture, never a saved model attempt. Mathematics always
// comes from the same planner as production. No provider or database is called.
const plot = [
  'Leo oppdager en lukket port. Den åpnes når han fyller brettet med grupper av klosser.',
  'Leo finner kartbiter i en støvete skuff og legger dem på bordet.',
  'Leo følger en svak lyd gjennom gangen til verkstedet.',
  'Leo løfter et deksel og ser kabler som må sorteres.',
  'Leo undersøker heisen som leder ned til observatoriet.',
  'Leo finner en vogn med utstyr for den videre reisen.',
  'Leo legger en trygg rute over den skadde broen.',
  'Leo kikker inn i lageret og leter etter reservedeler.',
  'Leo hører skritt og møter en liten robot som trenger hjelp.',
  'Leo viser roboten kartet og undersøker signalene.',
  'Leo åpner en kasse med brikker til styringsbordet.',
  'Leo prøver å stille inn antennen på taket.',
  'Leo ser et blink fra nabostasjonen gjennom kikkerten.',
  'Leo planlegger reisen dit og finner frem forsyninger.',
  'Leo undersøker motoren før vognen kan kjøre videre.',
  'Leo stanser ved tunnelen og leser merkene på veggen.',
  'Leo finner inngangen til kontrollrommet bak en skjult dør.',
  'Leo kobler sammen tavlene for å sende et svar tilbake.',
  'Leo ser at lyset kommer tilbake i vinduene langs sporet.',
  'Leo gjør den siste kontrollen før stasjonen kan åpnes igjen.',
];
const consequences = [
  'Leo legger klossene på brettet. Porten glir opp, og et svakt lys viser veien inn.',
  'Kartbitene passer sammen, og Leo ser hvor signalet kommer fra.',
  'Lyden blir tydeligere når Leo åpner døren til verkstedet.',
  'Kablene ligger riktig, og panelet lyser opp foran Leo.',
  'Heisen senker Leo trygt ned til observatoriet.',
  'Utstyret får plass på vognen, og Leo kan ta det med.',
  'Leo fester broplankene og kommer trygt over.',
  'Reservedelene passer, og Leo tar dem med tilbake.',
  'Roboten får hjelp og viser Leo en skjult gang.',
  'Signalene peker mot taket, og Leo følger trappen opp.',
  'Leo legger brikkene på plass og låser opp styringsbordet.',
  'Antennen dreier seg, og Leo får kontakt med nabostasjonen.',
  'Leo forstår blinket og finner målet for reisen.',
  'Forsyningene er klare, og Leo ruller vognen ut.',
  'Motoren starter rolig etter Leos kontroll.',
  'Merkene viser en trygg tunnel, og Leo kjører gjennom.',
  'Døren åpner seg, og Leo finner kontrollrommet.',
  'Svaret går gjennom tavlene og når frem til stasjonen.',
  'Vinduene lyser langs sporet mens Leo følger med.',
  'Leo frigjør sporet, og det første toget nærmer seg perrongen.',
];
export async function prepareFixture(
  interests: string[],
  parent: FreeChapter | null,
) {
  const f = fixture(),
    rows = chapterFixtures();
  const existing = [...rows.values()].find(
    (c) =>
      c.previous_id === (parent?.id ?? null) &&
      c.interests.join('|') === interests.join('|'),
  );
  if (existing) return existing;
  const now = new Date().toISOString(),
    slots = planMath(f.state, now, rows.size + 741);
  const chapter: FreeChapter = {
    id: randomUUID(),
    learner_id: f.profile.id,
    household_id: f.profile.householdId,
    previous_id: parent?.id ?? null,
    interests,
    context: { previousSummary: parent?.header?.summary ?? '' },
    slots,
    header: null,
    missions: [],
    status: 'running',
    owner: randomUUID(),
    created_at: now,
    deadline: new Date(Date.now() + 90_000).toISOString(),
    spent: 0,
    finished_at: null,
    completed: false,
    calls: {},
  };
  rows.set(chapter.id, chapter);
  const response = {
    title: 'Signaler fra den glemte stasjonen',
    summary:
      'Leo åpner en gammel stasjon og hjelper roboten å få lys langs sporet.',
    setting: 'stasjonen',
    opening: `Leo utforsker ${interests.join(' og ')} og finner et nødsignal fra en glemt stasjon.`,
    ending:
      'Leo ser toget rulle inn mens roboten vinker fra den opplyste perrongen.',
    missions: slots.map((s, i) => ({
      slotId: s.id,
      skillId: s.item.skillId,
      difficulty: s.item.difficulty,
      text: plot[i],
      place: 'stasjonens verksted',
      art: 'workshop',
      question: s.item.question,
      expression: s.item.expression,
      answer: s.item.answer,
      hint: `Tegn situasjonen ved ${['porten', 'kartbordet', 'gangen', 'kablene', 'heisen', 'vognen', 'broen', 'lageret', 'roboten', 'signalene', 'kassen', 'antennen', 'kikkerten', 'forsyningene', 'motoren', 'tunnelen', 'døren', 'tavlene', 'sporet', 'kontrollen'][i]}, og se etter tallene du trenger.`,
      success: consequences[i],
      retry: `Undersøk regningen som hører til ${['porten', 'kartet', 'lyden', 'kablene', 'heisen', 'utstyret', 'broen', 'reservedelene', 'roboten', 'kartmerkene', 'brikkene', 'antennen', 'blinket', 'reisen', 'motoren', 'merkene', 'inngangen', 'svaret', 'lyset', 'stasjonen'][i]}.`,
    })),
  };
  await produceChapter({
    slots,
    interests,
    previousSummary: chapter.context.previousSummary,
    deadline: Date.parse(chapter.deadline),
    source: async function* () {
      yield JSON.stringify(response);
    },
    publish: async (header, missions, done) => {
      chapter.header = header;
      chapter.missions = missions;
      if (done) {
        chapter.status = 'done';
        chapter.finished_at = new Date().toISOString();
      }
    },
  });
  return chapter;
}
