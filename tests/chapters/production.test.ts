import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { productionFixture } from './fixtures/production';
import { productionDraft, reviewAccepted } from '../../lib/chapters/production';
import {
  advanceChapter,
  chapterView,
  initialFacts,
} from '../../lib/chapters/play';
import { asJson } from '../../lib/learning/repository';
describe('R3 chapter contracts and server projection', () => {
  it('requires a real supported asset and matching slots before publication', () => {
    const { packet, job, menu } = productionFixture();
    expect(productionDraft(packet, job, menu)).toEqual(packet);
    const missing = structuredClone(packet);
    missing.assets[0].id = 'missing-picture';
    expect(() => productionDraft(missing, job, menu)).toThrow();
    const mixed = structuredClone(packet),
      m = mixed.nodes.find(
        (n) =>
          n.kind === 'mission' &&
          n.variants[0].scene.interaction === 'quantity',
      )!;
    if (m.kind !== 'mission') throw Error('fixture');
    m.variants[0].scene.objects.find(
      (o) => o.quantityKey === 'known',
    )!.assetId = 'stone';
    expect(() => productionDraft(mixed, job, menu)).toThrow('samme objekttype');
  });
  it('never projects the answer, future ending or unearned consequence', () => {
    const { packet, job } = productionFixture(),
      v = chapterView(job, true),
      raw = JSON.stringify(v);
    expect(raw).not.toMatch(
      /generatorVersion|commonWrongAnswers|questionTemplate|"seed"|"answer"/,
    );
    expect(v.outcome).toBeNull();
    expect(v.ending).toBeNull();
    const ending = packet.nodes.find((n) => n.kind === 'ending')!;
    if (ending.kind === 'ending') expect(raw).not.toContain(ending.narration);
    expect(v.mission!.quantities.groups.value).toBe(3);
    expect(v.mission!.quantities.each.value).toBe(4);
  });
  it('keeps the same mission through error/story/help and only records actual success', () => {
    let { job } = productionFixture();
    let facts = initialFacts(job);
    const turn = (type: string, extra = {}) => {
      const r = advanceChapter(
        job,
        { type, revision: job.play_revision, ...extra },
        facts,
      );
      job = r.job;
      if (r.facts) facts = r.facts;
      return r.view;
    };
    expect(turn('answer', { value: '11', allocations: [] }).solved).toBe(false);
    expect(facts.events).toEqual([]);
    const revision = job.play_revision;
    expect(turn('story').mission!.missionId).toBe('lights');
    expect(job.play_revision).toBe(revision);
    expect(turn('hint').hintLevel).toBe(1);
    expect(
      turn('answer', { value: '12', allocations: [] }).outcome?.sceneText,
    ).toContain('Lyktene lyser');
    expect(facts.events).toHaveLength(1);
    job = {
      ...job,
      progress: asJson(JSON.parse(JSON.stringify(job.progress))),
    };
    expect(chapterView(job, true).solved).toBe(true);
    expect(turn('next').mission!.missionId).toBe('gangway');
    expect(() =>
      advanceChapter(
        job,
        { type: 'answer', revision: 0, value: '6', allocations: [] },
        facts,
      ),
    ).toThrow('annen fane');
  });
  it('requires an exact physical-rule quote for every actually displayed variant', () => {
    const { packet, job } = productionFixture(),
      missions = packet.nodes.filter((n) => n.kind === 'mission');
    const review = {
      approved: true,
      issues: [],
      continuity: 'Sammenhengende.',
      variation: 'Tre ulike formål.',
      historyEventIds: [],
      historyImpactQuote: '',
      missions: missions.map((m) => ({
        missionId: m.id,
        physicalRuleQuote: m.goal,
        mathematicalNeed: 'Regningen løser hindringen.',
        sceneAgreement: 'Samme mengder.',
      })),
    };
    expect(reviewAccepted(review, packet, {})).toBe(true);
    expect(chapterView(job, true).mission!.goal).toBe(
      review.missions[0].physicalRuleQuote,
    );
    review.missions[0].physicalRuleQuote = 'En regel som ingen ser.';
    expect(reviewAccepted(review, packet, {})).toBe(false);
  });
});
