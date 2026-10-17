import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { productionFixture } from './fixtures/production';
import {
  productionDraft,
  reviewAccepted,
  chapterRoutes,
  chapterAuthorSchemaFor,
} from '../../lib/chapters/production';
import {
  advanceChapter,
  chapterView,
  initialFacts,
} from '../../lib/chapters/play';
import { asJson } from '../../lib/learning/repository';
import { z } from 'zod';
import { chapterAuthorSchema } from '../../lib/chapters/production';
import { visibleChapter } from '../../lib/chapters/production';
describe('R3 chapter contracts and server projection', () => {
  it('rejects the actual shortcut pattern that the model critic missed', () => {
    const { packet, job, menu } = productionFixture();
    const missions = packet.nodes.filter((n) => n.kind === 'mission');
    packet.nodes.push({
      kind: 'choice',
      id: 'start-choice',
      prompt: 'Hva vil du gjøre først?',
      options: missions.map((m, i) => ({
        id: `option-${i}`,
        label: m.goal,
        next: m.id,
      })),
    });
    packet.entryNodeId = 'start-choice';
    expect(chapterRoutes(packet).map((r) => r.missionIds.length)).toEqual([
      3, 2, 1,
    ]);
    expect(() => productionDraft(packet, job, menu)).toThrow('Hver rute');
    // Converging alternatives remain distinct, fully reviewed paths.
    const choice = packet.nodes.at(-1)!;
    if (choice.kind !== 'choice') throw Error('fixture');
    for (const option of choice.options) option.next = missions[0].id;
    expect(productionDraft(packet, job, menu)).toEqual(packet);
    expect(chapterRoutes(packet)).toHaveLength(3);
    const review = {
      approved: true,
      issues: [],
      continuity: 'Kjede.',
      variation: 'Ulik handling.',
      historyEventIds: [],
      historyImpactQuote: '',
      missions: missions.map((m) => ({
        missionId: m.id,
        physicalRuleQuote: m.goal,
        mathematicalNeed: 'Behov.',
        sceneAgreement: 'Samme ting.',
      })),
      routes: chapterRoutes(packet).map(
        ({ routeId, missionIds, endingId }) => ({
          routeId,
          missionIds,
          endingId,
          coherent: true,
          evidence: 'Alle handlinger vurdert.',
        }),
      ),
    };
    expect(reviewAccepted(review, packet, {})).toBe(true);
    review.routes.pop();
    expect(reviewAccepted(review, packet, {})).toBe(false);
    review.routes.push({
      ...review.routes[0],
      routeId: 'route-3',
      missionIds: [missions[2].id],
    });
    expect(reviewAccepted(review, packet, {})).toBe(false);
    review.routes[2].missionIds = missions.map((m) => m.id);
    review.routes[2].coherent = false;
    expect(reviewAccepted(review, packet, {})).toBe(false);
  });
  it('tells the critic what the player actually draws per group and in installed slots', () => {
    const { packet } = productionFixture();
    const shown = visibleChapter(packet).nodes.filter(
      (n) => n.kind === 'mission',
    );
    expect(shown[0].variants[0].rendering).toMatchObject({
      kind: 'grouping',
      containerCount: 3,
      positionsPerContainer: 4,
    });
    expect(shown[1].variants[0].rendering).toMatchObject({
      kind: 'quantity',
      positionCount: 9,
      alreadyInstalled: 3,
    });
  });
  it('accepts unchanged references and manifest after JSONB reorders object keys', () => {
    const { packet, job, menu } = productionFixture();
    const reorder = <T>(value: T): T =>
      JSON.parse(JSON.stringify(value), (_key, v) =>
        v && typeof v === 'object' && !Array.isArray(v)
          ? Object.fromEntries(Object.entries(v).reverse())
          : v,
      );
    expect(productionDraft(reorder(packet), job, menu)).toEqual(packet);
    expect(
      chapterView({ ...job, data: reorder(job.data) }, true).mission?.missionId,
    ).toBe('lights');
    const bad = reorder(job.data) as { manifest: { sha256: string }[] };
    bad.manifest[0].sha256 = 'tampered';
    expect(() => chapterView({ ...job, data: asJson(bad) }, true)).toThrow(
      'Illustrasjonene',
    );
  });
  it('sends OpenAI a strict schema with anyOf instead of unsupported oneOf', () => {
    const { packet, job, menu } = productionFixture();
    const wire: Record<string, unknown> = { ...packet };
    delete wire.assets;
    expect(chapterAuthorSchema.parse(wire)).toEqual(wire);
    const exact = chapterAuthorSchemaFor(job);
    expect(exact.parse(wire)).toEqual(wire);
    expect(exact.safeParse({ ...wire, id: packet.id + '-v1' }).success).toBe(
      false,
    );
    expect(exact.safeParse({ ...wire, basedOnRevision: 1 }).success).toBe(
      false,
    );
    expect(JSON.stringify(z.toJSONSchema(exact))).not.toContain('"oneOf"');

    const unbound = structuredClone(wire) as typeof packet;
    const mission = unbound.nodes.find((n) => n.kind === 'mission')!;
    if (mission.kind !== 'mission') throw Error('fixture');
    mission.variants[0].scene.objects[0].quantityKey = null;
    expect(chapterAuthorSchema.safeParse(unbound).success).toBe(false);

    const compiled = productionDraft(wire, job, menu);
    expect(compiled.assets.some((a) => a.role === 'background')).toBe(true);
    expect(compiled.nodes).toEqual(packet.nodes);
    const schema = JSON.stringify(z.toJSONSchema(chapterAuthorSchema));
    expect(schema).not.toContain('"oneOf"');
    expect(schema).toContain('"anyOf"');
  });
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
    const changedOperation = structuredClone(packet);
    const first = changedOperation.nodes.find((n) => n.kind === 'mission')!;
    if (first.kind !== 'mission') throw Error('fixture');
    first.variants[0].scene.interaction = 'distribution';
    expect(() => productionDraft(changedOperation, job, menu)).toThrow(
      'krever grouping',
    );
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
      routes: chapterRoutes(packet)
        .map((r) => ({
          ...r,
          coherent: true,
          evidence: 'Alle tidligere utfall er gjennomført.',
        }))
        .map(({ routeId, missionIds, endingId, coherent, evidence }) => ({
          routeId,
          missionIds,
          endingId,
          coherent,
          evidence,
        })),
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
  it('requires historical impact before the first task, including both entry choices', () => {
    const { packet } = productionFixture();
    const missions = packet.nodes.filter((n) => n.kind === 'mission');
    const quote = 'Mira husker brevet fra den forrige turen.';
    const review = {
      approved: true,
      issues: [],
      continuity: 'Sammenhengende.',
      variation: 'Ulike formål.',
      routes: [] as {
        routeId: string;
        missionIds: string[];
        endingId: string;
        coherent: boolean;
        evidence: string;
      }[],
      historyEventIds: ['past-event'],
      historyImpactQuote: quote,
      missions: missions.map((m) => ({
        missionId: m.id,
        physicalRuleQuote: m.goal,
        mathematicalNeed: 'Regningen løser hindringen.',
        sceneAgreement: 'Samme mengder.',
      })),
    };
    const updateRoutes = () => {
      review.routes = chapterRoutes(packet).map(
        ({ routeId, missionIds, endingId }) => ({
          routeId,
          missionIds,
          endingId,
          coherent: true,
          evidence: 'Vurdert.',
        }),
      );
    };
    updateRoutes();
    const facts = { events: [{ id: 'past-event' }] };
    missions[0].success += ' ' + quote;
    expect(reviewAccepted(review, packet, facts)).toBe(false);
    missions[0].before += ' ' + quote;
    expect(reviewAccepted(review, packet, facts)).toBe(true);
    packet.nodes.push({
      kind: 'choice',
      id: 'start-choice',
      prompt: 'Velg vei.',
      options: [
        { id: 'first', label: 'Første vei', next: missions[0].id },
        { id: 'second', label: 'Andre vei', next: missions[1].id },
      ],
    });
    packet.entryNodeId = 'start-choice';
    updateRoutes();
    expect(reviewAccepted(review, packet, facts)).toBe(false);
    missions[1].before += ' ' + quote;
    expect(reviewAccepted(review, packet, facts)).toBe(true);
  });
});
