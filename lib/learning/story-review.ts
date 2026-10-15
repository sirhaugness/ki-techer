import { z } from 'zod';
import type { StoryChapter, StorySaga } from './story-contract';

const criterionSchema = z.object({
  pass: z.boolean(),
  evidence: z.string().max(160),
  issue: z.string().max(240),
});

/** Separate editorial evidence; mathematical answers remain engine controlled. */
export const reviewSchema = z.object({
  chapterContinuity: criterionSchema,
  practicalNovelty: criterionSchema,
  priorChoiceImpact: criterionSchema.extend({
    source: z.string().max(1000),
    missionId: z.string().max(40),
  }),
  missions: z
    .array(
      z.object({
        missionId: z.string().min(1).max(40),
        mathNecessary: criterionSchema,
        physicalRuleExplicit: criterionSchema,
        consequenceMatches: criterionSchema,
      }),
    )
    .length(6),
});

/** Fail closed on incomplete checks, false approval or invented history references. */
export function reviewIssues(
  value: unknown,
  plan: StoryChapter,
  saga: StorySaga,
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
  }

  const impact = review.priorChoiceImpact;
  if (saga.chapters.length) {
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
  } else if (impact.source || impact.missionId) {
    issues.push(
      'Første kapittel har ingen tidligere valg; kilde og oppdragsreferanse skal være tomme.',
    );
  }
  return issues;
}
