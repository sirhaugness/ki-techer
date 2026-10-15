import { describe, expect, it } from 'vitest';
import type {
  StoryChapter,
  StorySaga,
} from '../../lib/learning/story-contract';
import { reviewIssues, reviewSchema } from '../../lib/learning/story-review';

// Human-authored editorial verdicts exercise enforcement, not LLM comprehension.
const pass = (evidence: string) => ({ pass: true, evidence, issue: '' });
const reject = (issue: string) => ({ pass: false, evidence: '', issue });
const plan = {
  missions: Array.from({ length: 6 }, (_, i) => ({ id: `m${i + 1}` })),
} as StoryChapter;
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
      ...pass(
        'Klatretauet fra forrige valg senker laget ned til senderen i m2.',
      ),
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
    expect(reviewIssues(approvedReview(), plan, saga)).toEqual([]);
    const review = approvedReview();
    review.priorChoiceImpact.source = saga.chapters[0].choices[0];
    expect(reviewIssues(review, plan, saga)).toEqual([]);
  });

  it('rejects a missing criterion or a missing mission', () => {
    const missing: Partial<ReturnType<typeof approvedReview>> =
      approvedReview();
    delete missing.practicalNovelty;
    expect(reviewIssues(missing, plan, saga)).not.toEqual([]);
    const review = approvedReview();
    review.missions.pop();
    expect(reviewIssues(review, plan, saga)).not.toEqual([]);
  });

  it('rejects duplicate or substituted mission IDs even with six verdicts', () => {
    for (const id of ['m1', 'invented']) {
      const review = approvedReview();
      review.missions[5].missionId = id;
      expect(reviewIssues(review, plan, saga)).toContain(
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
    expect(reviewIssues(review, plan, saga)).not.toEqual([]);
  });

  it('rejects invented history and missing impact mission references', () => {
    const review = approvedReview();
    review.priorChoiceImpact.source = 'Et tau som aldri ble funnet';
    expect(reviewIssues(review, plan, saga).join(' ')).toContain(
      'Kilden må finnes',
    );
    review.priorChoiceImpact.source = 'langt klatretau';
    review.priorChoiceImpact.missionId = 'missing';
    expect(reviewIssues(review, plan, saga).join(' ')).toContain(
      'Oppgi oppdraget',
    );
  });

  it('permits the last actual event only for legacy history without choices or assets', () => {
    const legacy = structuredClone(saga);
    legacy.inventory = [];
    legacy.chapters[0].choices = [];
    const review = approvedReview();
    review.priorChoiceImpact.source = 'chapter-1-m6';
    review.priorChoiceImpact.evidence =
      'Det sendte signalet får et svar som fører til senderen i m2.';
    expect(reviewIssues(review, plan, legacy)).toEqual([]);
    expect(reviewIssues(review, plan, saga)).not.toEqual([]);
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
    expect(reviewIssues(review, plan, first)).toEqual([]);
    review.priorChoiceImpact.source = 'Oppdiktet valg';
    expect(reviewIssues(review, plan, first)).not.toEqual([]);
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
    expect(reviewIssues(review, plan, empty)).toEqual([]);
    empty.inventory = ['langt klatretau'];
    expect(reviewIssues(review, plan, empty)).not.toEqual([]);
    review.priorChoiceImpact = {
      ...pass('Medbrakt tau brukes i m2.'),
      source: 'langt klatretau',
      missionId: 'm2',
    };
    expect(reviewIssues(review, plan, empty)).toEqual([]);
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
    expect(reviewIssues(review, plan, saga).join(' ')).toContain(issue);
  });

  it('blocks the reported identical-route geometry defect rather than trusting an overall approval', () => {
    const review = approvedReview();
    review.missions[1].physicalRuleExplicit = reject(
      'Begge gangene har like fliser; seks sider velger ingen bestemt vei.',
    );
    expect(reviewIssues(review, plan, saga).join(' ')).toContain(
      'velger ingen bestemt vei',
    );
  });

  it('bounds the editorial evidence sent by the model', () => {
    const review = approvedReview();
    review.chapterContinuity.evidence = 'x'.repeat(161);
    expect(reviewSchema.safeParse(review).success).toBe(false);
  });
});
