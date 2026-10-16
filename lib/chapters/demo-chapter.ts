import 'server-only';
import type { ChapterMission, ChapterPackage } from './contracts';
import { identifyInterest } from './contracts';
import { validateChapterPackage } from './compile';

// Authored R2 quality sample, never model output or a universal chapter template.
// Bump the browser save version whenever this packet or its generator output changes.
const scenes = [
  {
    id: 'lights',
    title: 'Tenn leia',
    before:
      'Postbåten venter utenfor grunna. Mira trenger lys som viser den trygge leia inn til brygga.',
    goal: 'Finn hvor mange lyssteiner Mira skal hente.',
    question:
      'Langs leia står {{groups}} lykter. Hver lykt trenger {{each}} lyssteiner. Hvor mange lyssteiner må Mira hente?',
    clue: 'Se på {{groups}} lykter med plass til {{each}} lyssteiner i hver.',
    success:
      'Mira henter lyssteinene og tenner lyktene. Postbåten følger lysene trygt inn til brygga.',
    skill: 'mult-telling-grupper',
    seed: 10,
    objects: [
      {
        id: 'lanterns',
        label: 'Lykter',
        assetId: 'lantern',
        quantityKey: 'groups',
      },
      {
        id: 'stones',
        label: 'Plasser i hver lykt',
        assetId: 'stone',
        quantityKey: 'each',
      },
    ],
    interaction: 'grouping',
    target: 'lanterns',
    action: 'fill',
    working: 'Forslaget ditt vises som lyssteiner i lyktene.',
    incorrect:
      'Se på plassene i hver lykt. Alle lyktene trenger like mange lyssteiner.',
    correct: 'Lyktene lyser. Postbåten ligger nå ved brygga.',
  },
  {
    id: 'gangway',
    title: 'Gjør landgangen klar',
    before:
      'Båten er framme, men Mira kan ikke bære posten i land. Landgangen mangler planker.',
    goal: 'Finn hvor mange nye planker som trengs.',
    question:
      'Landgangen har plass til {{total}} planker. {{known}} planker ligger allerede på plass. Hvor mange nye planker må Mira legge?',
    clue: 'Hele landgangen trenger {{total}} planker. De {{known}} mørke plankene er allerede lagt.',
    success:
      'Mira legger de nye plankene i de tomme plassene. Nå kan hun bære postsekken trygt i land.',
    skill: 'likhetstegn',
    seed: 11,
    objects: [
      {
        id: 'slots',
        label: 'Plankeplasser',
        assetId: 'plank',
        quantityKey: 'total',
      },
      {
        id: 'placed',
        label: 'Planker som er lagt',
        assetId: 'plank',
        quantityKey: 'known',
      },
    ],
    interaction: 'quantity',
    target: 'slots',
    action: 'fill',
    working: 'Lyse planker viser forslaget ditt. Mørke planker lå der fra før.',
    incorrect:
      'De mørke plankene skal bli liggende. Tell bare plassene som fortsatt er tomme.',
    correct: 'Landgangen er hel. Mira står på land med postsekken.',
  },
  {
    id: 'letters',
    title: 'Invitasjoner til alle',
    before:
      'Mira bærer postsekken over landgangen. Den inneholder invitasjoner til øyas båtfest.',
    goal: 'Fordel alle invitasjonene likt mellom postkassene.',
    question:
      'I sekken ligger {{total}} invitasjoner til {{groups}} postkasser. Hver postkasse skal få like mange. Hvor mange får hver?',
    clue: 'Fordel alle {{total}} invitasjonene på {{groups}} postkasser. Gi én til hver om gangen.',
    success:
      'Alle invitasjonene er levert, med like mange i hver postkasse. Mira vinker fra båten og seiler ut langs lyktene.',
    skill: 'div-deling-konkret',
    seed: 20,
    objects: [
      {
        id: 'letters',
        label: 'Invitasjoner',
        assetId: 'envelope',
        quantityKey: 'total',
      },
      {
        id: 'boxes',
        label: 'Postkasser',
        assetId: 'mailbox',
        quantityKey: 'groups',
      },
    ],
    interaction: 'distribution',
    target: 'letters',
    action: 'distribute',
    working: 'Invitasjonene flyttes fra sekken til postkassene.',
    incorrect:
      'Bruk alle invitasjonene og sammenlign postkassene. Har de like mange?',
    correct:
      'Postkassene er fylt likt. Mira seiler videre langs den opplyste leia.',
  },
] as const;

export const demoChapter: ChapterPackage = validateChapterPackage({
  schemaVersion: 1,
  id: 'tide-cove-r2',
  sagaId: 'tide-cove',
  basedOnRevision: 0,
  interest: identifyInterest('Livet ved havet'),
  title: 'Lys over Tidevannsvika',
  goal: 'Hjelp Mira å få invitasjonene fram til øya.',
  opening:
    'Det blir kveld i Tidevannsvika. Postbudet Mira venter i båten utenfor grunna. Du kan hjelpe henne inn til øya.',
  entryNodeId: 'lights',
  locations: [{ id: 'cove', name: 'Tidevannsvika' }],
  actors: [{ id: 'mira', name: 'Mira', assetId: 'post-carrier' }],
  assets: [
    {
      id: 'cove-art',
      role: 'background',
      description: 'Kveldsvik med øy, brygge og trygg lei',
    },
    {
      id: 'post-carrier',
      role: 'character',
      description: 'Mira med gul regnjakke',
    },
    ...['lantern', 'stone', 'plank', 'envelope', 'mailbox'].map((id) => ({
      id,
      role: 'prop' as const,
      description: id,
    })),
  ],
  nodes: [
    ...scenes.map((s, i): ChapterMission => ({
      kind: 'mission',
      id: s.id,
      title: s.title,
      before: s.before,
      goal: s.goal,
      success: s.success,
      next: scenes[i + 1]?.id ?? 'ending',
      variants: [
        {
          id: 'primary',
          role: 'primary',
          representation: 'konkret',
          problem: {
            generatorVersion: 1,
            skillId: s.skill,
            difficulty: 1,
            seed: s.seed,
          },
          questionTemplate: s.question,
          clueTemplate: s.clue,
          scene: {
            locationId: 'cove',
            actorIds: ['mira'],
            backgroundAssetId: 'cove-art',
            objects: s.objects.map((o) => ({ ...o })),
            interaction: s.interaction,
            feedback: {
              working: [{ targetId: s.target, action: s.action }],
              incorrect: [{ targetId: s.target, action: 'highlight' }],
              correct: [{ targetId: s.target, action: 'move' }],
              reducedMotion: {
                working: s.working,
                incorrect: s.incorrect,
                correct: s.correct,
              },
            },
          },
        },
      ],
    })),
    {
      kind: 'ending',
      id: 'ending',
      narration:
        'Lyktene lyser, landgangen er hel og invitasjonene er levert. Øya er klar for båtfesten!',
      hook: 'Neste gang kan festen begynne.',
    },
  ],
});
