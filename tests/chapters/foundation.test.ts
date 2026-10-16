import { describe, expect, it, vi } from 'vitest';
import {
  identifyInterest,
  type ChapterPackage,
  type SagaFacts,
} from '../../lib/chapters/contracts';
import {
  publicMission,
  tutorContext,
  validateChapterPackage,
  materializeProblem,
} from '../../lib/chapters/compile';

vi.mock('server-only', () => ({}));

// Deliberately authored contract data, not proof of generated story/visual quality.
function fixture(): ChapterPackage {
  return {
    schemaVersion: 1,
    id: 'chapter-one',
    sagaId: 'saga-one',
    basedOnRevision: 0,
    interest: identifyInterest('Star Wars'),
    title: 'Tåkefyret',
    goal: 'Finn veien gjennom tåken.',
    opening: 'Fyret har sluknet. Vennene venter på hjelp.',
    entryNodeId: 'm1',
    locations: [{ id: 'base', name: 'Ved fyret' }],
    actors: [{ id: 'droid', name: 'R2-D2', assetId: 'robot' }],
    assets: [
      { id: 'coast', role: 'background', description: 'Kysten rundt fyret' },
      { id: 'robot', role: 'character', description: 'Vennlig droide' },
      { id: 'lamp', role: 'prop', description: 'En lampe' },
    ],
    nodes: [
      ...[1, 2, 3].map((i) => ({
        kind: 'mission' as const,
        id: `m${i}`,
        title: `Arbeidssted ${i}`,
        before: 'Droiden peker på lampene som ligger i grupper.',
        goal: 'Klargjør lampene til fyret.',
        success: 'FYRET LYSER OG VISER DEN HEMMELIGE RUTEN.',
        next: i === 3 ? 'end' : `m${i + 1}`,
        variants: [
          {
            id: 'primary',
            role: 'primary' as const,
            representation: 'konkret' as const,
            problem: {
              generatorVersion: 1 as const,
              skillId: 'mult-tabell-3-4',
              difficulty: 1,
              seed: i,
            },
            questionTemplate:
              'Du har {{groups}} grupper med {{each}} lamper i hver. Hvor mange lamper er det?',
            clueTemplate: 'Se på {{groups}} grupper med {{each}} lamper.',
            scene: {
              locationId: 'base',
              actorIds: ['droid'],
              backgroundAssetId: 'coast',
              objects: [
                {
                  id: 'lamps',
                  label: 'Lamper per gruppe',
                  assetId: 'lamp',
                  quantityKey: 'each',
                },
              ],
              interaction: 'grouping' as const,
              feedback: {
                working: [{ targetId: 'lamps', action: 'group' as const }],
                incorrect: [
                  { targetId: 'lamps', action: 'highlight' as const },
                ],
                correct: [{ targetId: 'lamps', action: 'reveal' as const }],
                reducedMotion: {
                  working: 'Lampene ligger i grupper.',
                  incorrect: 'Se på hver gruppe igjen.',
                  correct: 'HEMMELIG SLUTTRESULTAT.',
                },
              },
            },
          },
        ],
      })),
      {
        kind: 'ending',
        id: 'end',
        narration: 'Alle kom fram.',
        hook: 'EN FRAMTIDIG OVERRASKELSE.',
      },
    ],
  };
}
function mission(chapter: ChapterPackage, index = 0) {
  const node = chapter.nodes[index];
  if (node.kind !== 'mission') throw new Error('Fixture needs mission');
  return node;
}
const saga = (): SagaFacts => ({
  id: 'saga-one',
  revision: 0,
  interest: identifyInterest('Star Wars'),
  goal: 'Hjelp vennene.',
  chapterSummaries: [],
  events: [],
  inventory: [],
  actorLocations: [],
});
const progress = () => ({
  chapterId: 'chapter-one',
  sagaId: 'saga-one',
  currentMissionId: 'm1',
  variantId: 'primary',
  completedMissionIds: [] as string[],
  choices: [] as { nodeId: string; optionId: string }[],
});
const tutor = () => ({
  allowedHintLevel: 1,
  assessment: 'incorrect',
  attempts: [{ correct: false, hintLevel: 0 }],
});

describe('chapter foundation — structural contracts, not editorial approval', () => {
  it('identifies free-text interests independently of capitalization, width and whitespace', () => {
    expect(identifyInterest('  star   wars ').key).toBe(
      identifyInterest('Star Wars').key,
    );
    expect(identifyInterest('Ｓtar Wars').key).toBe('star wars');
    expect(identifyInterest('Dinosaurer').key).not.toBe('star wars');
    expect(() => identifyInterest('  ')).toThrow();
  });
  it('accepts variable chapter length without an obligatory choice or travel opening', () => {
    const chapter = fixture();
    expect(validateChapterPackage(chapter).nodes).toHaveLength(4);
    chapter.nodes = [mission(chapter), chapter.nodes.at(-1)!];
    mission(chapter).next = 'end';
    expect(validateChapterPackage(chapter).nodes).toHaveLength(2);
  });
  it('supports explicit converging story branches', () => {
    const chapter = fixture();
    mission(chapter).next = 'choice';
    chapter.nodes.push({
      kind: 'choice',
      id: 'choice',
      prompt: 'Hvilken sti velger du?',
      options: [
        { id: 'north', label: 'Nord', next: 'm2' },
        { id: 'south', label: 'Sør', next: 'm3' },
      ],
    });
    expect(() => validateChapterPackage(chapter)).not.toThrow();
  });
  it.each(['dangling', 'cycle', 'unreachable', 'duplicate'] as const)(
    'rejects a %s graph',
    (kind) => {
      const chapter = fixture();
      if (kind === 'dangling') mission(chapter).next = 'missing';
      if (kind === 'cycle') mission(chapter, 2).next = 'm1';
      if (kind === 'unreachable') mission(chapter).next = 'end';
      if (kind === 'duplicate')
        chapter.nodes.push(structuredClone(chapter.nodes[0]));
      expect(() => validateChapterPackage(chapter)).toThrow();
    },
  );
  it('independently rejects a tampered answer and unsupported question quantity', () => {
    const chapter = fixture();
    Object.assign(mission(chapter).variants[0].problem, { answer: 999 });
    expect(() => validateChapterPackage(chapter)).toThrow();
    const second = fixture();
    mission(second).variants[0].questionTemplate += ' {{answer}}';
    expect(() => validateChapterPackage(second)).toThrow(
      'kontrollerte gitte mengder',
    );
  });
  it.each(['unknown', 'answer'])(
    'rejects scene quantities bound to %s',
    (key) => {
      const chapter = fixture();
      mission(chapter).variants[0].scene.objects[0].quantityKey = key;
      expect(() => validateChapterPackage(chapter)).toThrow(
        'verifiserte gitte mengder',
      );
    },
  );
  it.each(['params', 'answerType', 'unknownSkill', 'version'] as const)(
    'rejects forged engine reference %s',
    (field) => {
      const chapter = fixture(),
        ref = mission(chapter).variants[0].problem;
      if (field === 'params') Object.assign(ref, { params: { a: 99 } });
      if (field === 'answerType') Object.assign(ref, { answerType: 'choice' });
      if (field === 'unknownSkill') ref.skillId = 'invented-skill';
      if (field === 'version') Object.assign(ref, { generatorVersion: 2 });
      expect(() => validateChapterPackage(chapter)).toThrow();
    },
  );
  it('uses the same verified quantity in the question and scene', () => {
    const chapter = fixture(),
      item = materializeProblem(mission(chapter).variants[0]);
    const view = publicMission(chapter, 'm1', 'primary');
    expect(view.scene.objects[0].quantity).toBe(item.params.b);
    expect(view.question).toContain(`${item.params.b} lamper`);
    expect(view.question).not.toContain('{{');
  });
  it.each(['actor', 'asset', 'effect', 'collision'] as const)(
    'rejects a broken %s reference',
    (kind) => {
      const chapter = fixture(),
        scene = mission(chapter).variants[0].scene;
      if (kind === 'actor') scene.actorIds = ['unknown'];
      if (kind === 'asset') scene.objects[0].assetId = 'coast';
      if (kind === 'effect') scene.feedback.incorrect[0].targetId = 'unknown';
      if (kind === 'collision') scene.objects[0].id = 'droid';
      expect(() => validateChapterPackage(chapter)).toThrow();
    },
  );
  it('rejects executable fields, arbitrary media URLs, and a model-proclaimed ready flag', () => {
    const chapter = fixture();
    expect(() =>
      validateChapterPackage({ ...chapter, status: 'ready' }),
    ).toThrow();
    expect(() =>
      validateChapterPackage({ ...chapter, script: 'alert(1)' }),
    ).toThrow();
    chapter.assets[0].id = 'https://example.com/scene.svg';
    expect(() => validateChapterPackage(chapter)).toThrow();
  });
  it('does not expose answers, generator parameters, correct feedback or future story in the public projection', () => {
    const view = publicMission(fixture(), 'm1', 'primary');
    const json = JSON.stringify(view);
    for (const secret of [
      '"answer":',
      '"params":',
      'commonWrongAnswers',
      '"expression":',
      'HEMMELIG',
      'FRAMTIDIG',
      'FYRET LYSER',
      '"next":',
    ])
      expect(json).not.toContain(secret);
    expect(() => publicMission(fixture(), 'm1', 'missing')).toThrow(
      'Ukjent oppgavevariant',
    );
  });
  it('does not allow a future mission or unplayed branch into tutor context', () => {
    const state = progress();
    state.currentMissionId = 'm3';
    expect(() => tutorContext(fixture(), saga(), state, tutor())).toThrow(
      'hopper over',
    );
    const chapter = fixture();
    mission(chapter).next = 'fork';
    chapter.nodes.push({
      kind: 'choice',
      id: 'fork',
      prompt: 'Velg sti.',
      options: [
        { id: 'long', label: 'Lang sti', next: 'm2' },
        { id: 'short', label: 'Kort sti', next: 'm3' },
      ],
    });
    const facts = saga();
    facts.revision = 1;
    facts.events = [
      {
        id: 'event-one',
        chapterId: chapter.id,
        missionId: 'm1',
        summary: 'Første oppdrag er ferdig.',
      },
    ];
    state.completedMissionIds = ['m1'];
    expect(() => tutorContext(chapter, facts, state, tutor())).toThrow(
      'veivalg',
    );
    state.choices = [{ nodeId: 'fork', optionId: 'short' }];
    const context = tutorContext(chapter, facts, state, tutor());
    expect(context.mission.missionId).toBe('m3');
    expect(context.chosenRoute).toEqual([
      { choiceId: 'fork', label: 'Kort sti' },
    ]);
    state.choices = [{ nodeId: 'fork', optionId: 'long' }];
    expect(() => tutorContext(chapter, facts, state, tutor())).toThrow(
      'hopper over',
    );
  });

  it('includes controlled learning evidence and actual history in ordinary tutor context without hidden answers', () => {
    const context = tutorContext(fixture(), saga(), progress(), tutor());
    expect(context.assessment).toBe('incorrect');
    expect(context.attempts).toEqual([{ correct: false, hintLevel: 0 }]);
    expect(context.helpKinds).toContain('story');
    expect(JSON.stringify(context)).not.toContain('"answer":');
  });
  it('rejects future choices even when the current mission is otherwise valid', () => {
    const state = progress();
    state.choices = [{ nodeId: 'future-choice', optionId: 'north' }];
    expect(() => tutorContext(fixture(), saga(), state, tutor())).toThrow(
      'framtidige',
    );
  });
  it('rejects actual events in a different order from the completed route', () => {
    const chapter = fixture(),
      facts = saga(),
      state = progress();
    facts.revision = 2;
    facts.events = [
      {
        id: 'event-two',
        chapterId: chapter.id,
        missionId: 'm2',
        summary: 'Andre hendelse.',
      },
      {
        id: 'event-one',
        chapterId: chapter.id,
        missionId: 'm1',
        summary: 'Første hendelse.',
      },
    ];
    state.currentMissionId = 'm3';
    state.completedMissionIds = ['m1', 'm2'];
    expect(() => tutorContext(chapter, facts, state, tutor())).toThrow(
      'Planlagte',
    );
  });
  it('admits actually completed current-chapter events but rejects planned future events and stale saga inputs', () => {
    const chapter = fixture(),
      facts = saga(),
      state = progress();
    facts.revision = 1;
    facts.events = [
      {
        id: 'event-one',
        chapterId: chapter.id,
        missionId: 'm1',
        summary: 'Det første oppdraget er gjort.',
      },
    ];
    state.completedMissionIds = ['m1'];
    state.currentMissionId = 'm2';
    expect(
      tutorContext(chapter, facts, state, tutor()).saga.recentEvents,
    ).toHaveLength(1);
    facts.events.push({
      id: 'future',
      chapterId: chapter.id,
      missionId: 'm3',
      summary: 'Ikke gjort ennå.',
    });
    expect(() => tutorContext(chapter, facts, state, tutor())).toThrow(
      'Planlagte',
    );
    const unrelated = saga();
    unrelated.id = 'another';
    expect(() => tutorContext(chapter, unrelated, progress(), tutor())).toThrow(
      'annen sagatilstand',
    );
    expect(() =>
      tutorContext(chapter, saga(), progress(), {
        ...tutor(),
        allowedHintLevel: 5,
      }),
    ).toThrow();
  });
});
