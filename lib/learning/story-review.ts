import { z } from 'zod';
import type { StoryChapter, StorySaga } from './story-contract';
import type { GeneratedItem } from '../engine/skills/generators';
import { bindStoryProblem } from '../engine/story-problem';

const criterionSchema = z.object({
  pass: z.boolean(),
  evidence: z.string().max(160),
  issue: z.string().max(240),
});
const quotedCriterionSchema = criterionSchema.extend({
  evidence: z.string().max(240),
});
export type VisibleStoryText = Record<
  string,
  {
    before: string;
    success: string;
    variants?: { before: string; success: string }[];
  }
>;
/** Match StoryPlayer and the route substitution in learning/session.ts. */
export function visibleStoryText(
  plan: StoryChapter,
  items: GeneratedItem[],
): VisibleStoryText {
  return Object.fromEntries(
    plan.missions.map((m) => {
      const bind = (text: string) => bindStoryProblem(text, items[m.itemIndex]);
      const common = [m.dialogue, m.questionTemplate, m.clueTemplate]
        .map(bind)
        .join(' ');
      const base = {
        before: `${bind(m.before)} ${common}`,
        success: bind(m.success),
      };
      return [
        m.id,
        {
          ...base,
          ...(m.id === plan.decision.payoffMission
            ? {
                variants: plan.decision.options.map((option) => ({
                  before: `${option.laterScene} ${common}`,
                  success: `${option.laterSuccess} ${base.success}`,
                })),
              }
            : {}),
        },
      ];
    }),
  );
}
const normalized = (text: string) =>
  text
    .normalize('NFKC')
    .toLocaleLowerCase('nb-NO')
    .replace(/[«»“”"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const quotes = (text: string, evidence: string) => {
  const quote = normalized(evidence);
  return quote.length >= 20 && normalized(text).includes(quote);
};

/** Separate editorial evidence; mathematical answers remain engine controlled. */
export const reviewSchema = z.object({
  chapterContinuity: criterionSchema,
  practicalNovelty: criterionSchema,
  priorChoiceImpact: quotedCriterionSchema.extend({
    source: z.string().max(1000),
    missionId: z.string().max(40),
  }),
  missions: z
    .array(
      z.object({
        missionId: z.string().min(1).max(40),
        mathNecessary: criterionSchema,
        physicalRuleExplicit: quotedCriterionSchema,
        consequenceMatches: criterionSchema,
      }),
    )
    .length(6),
});

/** Fail closed on incomplete checks, false approval or invented history references. */
export function hasStoryHistory(saga: StorySaga): boolean {
  return (
    saga.inventory.length > 0 ||
    saga.chapters.some((c) => c.events.length > 0 || c.choices.length > 0)
  );
}
export function reviewIssues(
  value: unknown,
  plan: StoryChapter,
  saga: StorySaga,
  visible: VisibleStoryText,
): string[] {
  const parsed = reviewSchema.safeParse(value);
  if (!parsed.success)
    return [
      'Fortellingskontrollen må inneholde alle kapittel- og oppdragskontroller.',
    ];
  const review = parsed.data;
  const issues: string[] = [];
  const check = (label: string, criterion: z.infer<typeof criterionSchema>) => {
    if (criterion.pass) {
      if (!criterion.evidence.trim() || criterion.issue.trim())
        issues.push(
          `${label}: Godkjenning krever konkret evidens og tomt feilfelt.`,
        );
    } else if (criterion.issue.trim()) {
      issues.push(`${label}: ${criterion.issue.trim()}`);
    } else {
      issues.push(`${label}: Avvisning må forklare den konkrete feilen.`);
    }
  };

  check('Kontinuitet', review.chapterContinuity);
  check('Praktisk variasjon', review.practicalNovelty);
  check('Tidligere valgs betydning', review.priorChoiceImpact);

  const expectedIds = new Set(plan.missions.map((mission) => mission.id));
  const reviewedIds = new Set(
    review.missions.map((mission) => mission.missionId),
  );
  if (
    expectedIds.size !== 6 ||
    reviewedIds.size !== 6 ||
    [...expectedIds].some((id) => !reviewedIds.has(id)) ||
    [...reviewedIds].some((id) => !expectedIds.has(id))
  )
    issues.push(
      'Fortellingskontrollen må vurdere hvert faktisk oppdrag nøyaktig én gang.',
    );

  for (const mission of review.missions) {
    check(`${mission.missionId}, nødvendig matematikk`, mission.mathNecessary);
    check(`${mission.missionId}, fysisk regel`, mission.physicalRuleExplicit);
    check(`${mission.missionId}, konsekvens`, mission.consequenceMatches);
    if (
      mission.physicalRuleExplicit.pass &&
      !(
        visible[mission.missionId]?.variants ?? [visible[mission.missionId]]
      ).every((text) =>
        quotes(text?.before ?? '', mission.physicalRuleExplicit.evidence),
      )
    )
      issues.push(
        `${mission.missionId}, fysisk regel: Siter den faktiske regelen fra barnets tekst før svaret; ikke finn på en regel i kontrollen.`,
      );
  }

  const impact = review.priorChoiceImpact;
  if (hasStoryHistory(saga)) {
    const sources = new Set([
      ...saga.inventory,
      ...saga.chapters.flatMap((chapter) => chapter.choices),
    ]);
    // Legacy histories may have events without saved choices or portable assets.
    if (!sources.size) {
      const lastEvent = saga.chapters
        .flatMap((chapter) => chapter.events)
        .at(-1);
      if (lastEvent) sources.add(lastEvent.id);
    }
    if (!sources.has(impact.source))
      issues.push(
        'Tidligere valgs betydning: Kilden må finnes nøyaktig i lagrede valg eller inventaret. Uten slike kilder brukes siste faktiske hendelses-ID.',
      );
    if (!expectedIds.has(impact.missionId))
      issues.push(
        'Tidligere valgs betydning: Oppgi oppdraget der historikken endrer handlingen.',
      );
    if (impact.pass) {
      const text = visible[impact.missionId];
      if (
        !(text?.variants ?? [text]).every((variant) =>
          quotes(
            variant ? `${variant.before} ${variant.success}` : '',
            impact.evidence,
          ),
        ) ||
        (saga.inventory.includes(impact.source) &&
          !normalized(impact.evidence).includes(normalized(impact.source)))
      )
        issues.push(
          'Tidligere valgs betydning: Siter den barnesynlige handlingen. Ved inventarkilde må sitatet navngi gjenstanden; uses alene er ikke konkret nytte.',
        );
    }
  } else if (impact.source || impact.missionId) {
    issues.push(
      'Første kapittel har ingen tidligere valg; kilde og oppdragsreferanse skal være tomme.',
    );
  }
  return issues;
}
