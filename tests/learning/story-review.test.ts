import { describe, expect, it } from 'vitest';
import { generate } from '../../lib/engine/skills/generators';
import { seededRng } from '../../lib/engine/random';
import type {
  StoryChapter,
  StorySaga,
} from '../../lib/learning/story-contract';
import {
  reviewIssues,
  reviewSchema,
  visibleStoryText,
  type VisibleStoryText,
} from '../../lib/learning/story-review';

// Human-authored editorial verdicts exercise enforcement, not LLM comprehension.
const pass = (evidence: string) => ({ pass: true, evidence, issue: '' });
const reject = (issue: string) => ({ pass: false, evidence: '', issue });
const plan = {
  missions: Array.from({ length: 6 }, (_, i) => ({ id: `m${i + 1}` })),
} as StoryChapter;
const rule = 'Én del skal festes ved hvert tilgjengelige hjørne.';
const action = 'Du bruker langt klatretau til å senke laget ned til senderen.';
const visible = Object.fromEntries(
  plan.missions.map((m) => [
    m.id,
    { before: `${rule} ${action}`, success: 'Senderen er berget.' },
  ]),
);
const saga: StorySaga = {
  version: 2,
  title: 'Meldingen i sanden',
  goal: 'Finn stasjonen.',
  research: {
    interest: 'Star Wars',
    brief: 'Syntetisk testgrunnlag.',
    sources: [],
    researchedAt: '2026-10-15T00:00:00Z',
  },
  inventory: ['langt klatretau'],
  companions: [],
  chapters: [
    {
      number: 1,
      title: 'Signalet',
      goal: 'Send signalet.',
      hook: 'En skanner nærmer seg.',
      choices: ['Dere lager et langt klatretau.'],
      events: [
        {
          id: 'chapter-1-m6',
          mission: 'Signalet',
          location: 'Luftskakten',
          action: 'signal',
          outcome: 'Signalet er sendt. Kartet er ferdig.',
          gains: [],
          uses: [],
        },
      ],
    },
  ],
};
function approvedReview() {
  return {
    chapterContinuity: pass('Det ferdige kartet brukes etter signalet.'),
    practicalNovelty: pass(
      'Laget berger en sender i stedet for å tyde samme kart.',
    ),
    priorChoiceImpact: {
      ...pass(action),
      source: 'langt klatretau',
      missionId: 'm2',
    },
    missions: plan.missions.map((mission) => ({
      missionId: mission.id,
      mathNecessary: pass(
        'Antallet avgjør hvor mange deler som må klargjøres.',
      ),
      physicalRuleExplicit: pass(
        'Én del skal festes ved hvert tilgjengelige hjørne.',
      ),
      consequenceMatches: pass('Delene festes og senderen virker.'),
    })),
  };
}

describe('story review enforcement with human-authored verdicts', () => {
  it('accepts complete checks with a saved asset and an actual mission witness', () => {
    expect(reviewIssues(approvedReview(), plan, saga, visible)).toEqual([]);
    const review = approvedReview();
    review.priorChoiceImpact.source = saga.chapters[0].choices[0];
    expect(reviewIssues(review, plan, saga, visible)).toEqual([]);
  });

  it('rejects a missing criterion or a missing mission', () => {
    const missing: Partial<ReturnType<typeof approvedReview>> =
      approvedReview();
    delete missing.practicalNovelty;
    expect(reviewIssues(missing, plan, saga, visible)).not.toEqual([]);
    const review = approvedReview();
    review.missions.pop();
    expect(reviewIssues(review, plan, saga, visible)).not.toEqual([]);
  });

  it('rejects duplicate or substituted mission IDs even with six verdicts', () => {
    for (const id of ['m1', 'invented']) {
      const review = approvedReview();
      review.missions[5].missionId = id;
      expect(reviewIssues(review, plan, saga, visible)).toContain(
        'Fortellingskontrollen må vurdere hvert faktisk oppdrag nøyaktig én gang.',
      );
    }
  });

  it.each([
    { pass: true, evidence: ' ', issue: '' },
    { pass: true, evidence: 'Regelen er tydelig.', issue: 'Regelen mangler.' },
    { pass: false, evidence: '', issue: ' ' },
  ])('rejects contradictory or unsupported approval %j', (criterion) => {
    const review = approvedReview();
    review.missions[1].physicalRuleExplicit = criterion;
    expect(reviewIssues(review, plan, saga, visible)).not.toEqual([]);
  });

  it('rejects invented history and missing impact mission references', () => {
    const review = approvedReview();
    review.priorChoiceImpact.source = 'Et tau som aldri ble funnet';
    expect(reviewIssues(review, plan, saga, visible).join(' ')).toContain(
      'Kilden må finnes',
    );
    review.priorChoiceImpact.source = 'langt klatretau';
    review.priorChoiceImpact.missionId = 'missing';
    expect(reviewIssues(review, plan, saga, visible).join(' ')).toContain(
      'Oppgi oppdraget',
    );
  });

  it('permits the last actual event only for legacy history without choices or assets', () => {
    const legacy = structuredClone(saga);
    legacy.inventory = [];
    legacy.chapters[0].choices = [];
    const review = approvedReview();
    review.priorChoiceImpact.source = 'chapter-1-m6';
    review.priorChoiceImpact.evidence = action;
    expect(reviewIssues(review, plan, legacy, visible)).toEqual([]);
    expect(reviewIssues(review, plan, saga, visible)).not.toEqual([]);
  });

  it('allows the first chapter without inventing a previous choice', () => {
    const first = { ...saga, inventory: [], chapters: [] };
    const review = approvedReview();
    review.priorChoiceImpact = {
      ...pass(
        'Første kapittel etablerer oppdraget og har ingen tidligere valg.',
      ),
      source: '',
      missionId: '',
    };
    expect(reviewIssues(review, plan, first, visible)).toEqual([]);
    review.priorChoiceImpact.source = 'Oppdiktet valg';
    expect(reviewIssues(review, plan, first, visible)).not.toEqual([]);
  });
  it('treats an empty legacy archive as no actual history, but preserves inventory-only history', () => {
    const empty = structuredClone(saga);
    empty.inventory = [];
    empty.chapters[0].events = [];
    empty.chapters[0].choices = [];
    const review = approvedReview();
    review.priorChoiceImpact = {
      ...pass('Tomt arkiv har ingen gjennomført handling.'),
      source: '',
      missionId: '',
    };
    expect(reviewIssues(review, plan, empty, visible)).toEqual([]);
    empty.inventory = ['langt klatretau'];
    expect(reviewIssues(review, plan, empty, visible)).not.toEqual([]);
    review.priorChoiceImpact = {
      ...pass(action),
      source: 'langt klatretau',
      missionId: 'm2',
    };
    expect(reviewIssues(review, plan, empty, visible)).toEqual([]);
  });

  it.each([
    [
      'chapterContinuity',
      'Kartet var ferdig, men blir uferdig igjen uten ny hendelse.',
    ],
    [
      'practicalNovelty',
      'Samme kart–steinmerker–dør-løype gjentas med nye tall.',
    ],
    [
      'priorChoiceImpact',
      'Tauet nevnes, men endrer ingen handling i kapittelet.',
    ],
  ] as const)('blocks the reported semantic defect in %s', (field, issue) => {
    const review = approvedReview();
    Object.assign(review[field], reject(issue));
    expect(reviewIssues(review, plan, saga, visible).join(' ')).toContain(
      issue,
    );
  });

  it('blocks the reported identical-route geometry defect rather than trusting an overall approval', () => {
    const review = approvedReview();
    review.missions[1].physicalRuleExplicit = reject(
      'Begge gangene har like fliser; seks sider velger ingen bestemt vei.',
    );
    expect(reviewIssues(review, plan, saga, visible).join(' ')).toContain(
      'velger ingen bestemt vei',
    );
  });

  it('rejects an invented physical rule and metadata-only asset use even with pass=true', () => {
    const review = approvedReview();
    review.missions[0].physicalRuleExplicit.evidence =
      'En oppdiktet klamp på hver kant.';
    expect(reviewIssues(review, plan, saga, visible).join(' ')).toContain(
      'Siter den faktiske regelen',
    );
    const metadataOnly = structuredClone(visible);
    metadataOnly.m2.before = rule;
    expect(
      reviewIssues(approvedReview(), plan, saga, metadataOnly).join(' '),
    ).toContain('barnesynlige handlingen');
    const noName = approvedReview();
    noName.priorChoiceImpact.evidence = rule;
    expect(reviewIssues(noName, plan, saga, visible).join(' ')).toContain(
      'navngi gjenstanden',
    );
  });

  it('does not accept a rule that disappears in either selected route', () => {
    const routes: VisibleStoryText = structuredClone(visible);
    routes.m1.variants = [
      routes.m1,
      { before: 'Denne ruten mangler regelen.', success: 'Ferdig.' },
    ];
    expect(
      reviewIssues(approvedReview(), plan, saga, routes).join(' '),
    ).toContain('fysisk regel');
  });

  it('matches rendered quantity binding and route replacement, excluding hidden purpose', () => {
    const item = generate('div-deling-konkret', 1, seededRng(4));
    const scene = {
      id: 'm1',
      itemIndex: 0,
      before: 'Felles førtekst som erstattes.',
      dialogue: 'Vi har {{total}} deler.',
      purpose: 'Hemmelig regel i intern måltekst.',
      questionTemplate: 'Fordel {{total}} deler i {{groups}} esker.',
      clueTemplate: 'Bruk {{groups}} esker.',
      success: '{{total}} deler er fordelt.',
    };
    const chapter = {
      missions: [scene],
      decision: {
        payoffMission: 'm1',
        options: [
          {
            laterScene: 'Den korte ruten er valgt.',
            laterSuccess: 'Kort rute ferdig.',
          },
          {
            laterScene: 'Den lange ruten er valgt.',
            laterSuccess: 'Lang rute ferdig.',
          },
        ],
      },
    } as StoryChapter;
    const text = visibleStoryText(chapter, [item]).m1;
    expect(text.before).not.toContain('Hemmelig');
    expect(text.before).not.toContain('{{');
    expect(text.success).toContain(String(item.params.total));
    expect(
      text.variants?.every((v) => !v.before.includes('Felles førtekst')),
    ).toBe(true);
    expect(text.variants?.[0].before).toContain('Den korte ruten');
    expect(text.variants?.[1].before).toContain('Den lange ruten');
  });

  it('bounds the editorial evidence sent by the model', () => {
    const review = approvedReview();
    review.chapterContinuity.evidence = 'x'.repeat(161);
    expect(reviewSchema.safeParse(review).success).toBe(false);
  });
});
