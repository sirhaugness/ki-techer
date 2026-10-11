import { z } from 'zod';
import { skills, type PartId, type Skill } from './skills/graph';
import { type SkillState } from './mastery';
import { dayKey, timestamp } from './time';
export type States = Readonly<Record<string, SkillState>>;
export type PartProgress = {
  id: PartId;
  status:
    'låst' | 'tilgjengelig' | 'pågår' | 'klar_for_mesterprøve' | 'tildelt';
  skillsMastered: number;
  skillsTotal: number;
  readySince: string | null;
  awardedAt: string | null;
  lastTestAt: string | null;
  testAttempts: number;
  targetedSkills: string[];
};
export function partUnlocked(
  part: PartId,
  states: States,
  graph: readonly Skill[] = skills,
): boolean {
  const complete = (target: PartId | null) =>
    graph
      .filter((s) => s.part === target)
      .every((s) => Boolean(states[s.id]?.masteredAt));
  return (
    part === 4 ||
    (part === 1
      ? complete(null)
      : part === 2 || part === 3
        ? complete(1)
        : false)
  );
}
export function progressForPart(
  id: PartId,
  states: States,
  previous: PartProgress | null = null,
  graph: readonly Skill[] = skills,
): PartProgress {
  z.number().int().min(1).max(4).parse(id);
  if (previous && previous.id !== id) throw new Error('Feil medaljongdel.');
  const partSkills = graph.filter((s) => s.part === id);
  if (!partSkills.length)
    throw new Error('Medaljongdelen mangler ferdigheter.');
  const mastered = partSkills.filter((s) => states[s.id]?.masteredAt),
    ready = mastered.length === partSkills.length;
  const readySince = ready
    ? mastered
        .map((s) => states[s.id].masteredAt!)
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0]
    : null;
  const status = previous?.awardedAt
    ? 'tildelt'
    : !partUnlocked(id, states, graph)
      ? 'låst'
      : ready
        ? 'klar_for_mesterprøve'
        : partSkills.some((s) => (states[s.id]?.attempts ?? 0) > 0)
          ? 'pågår'
          : 'tilgjengelig';
  return {
    id,
    status,
    skillsMastered: mastered.length,
    skillsTotal: partSkills.length,
    readySince,
    awardedAt: previous?.awardedAt ?? null,
    lastTestAt: previous?.lastTestAt ?? null,
    testAttempts: previous?.testAttempts ?? 0,
    targetedSkills: previous?.targetedSkills ?? [],
  };
}
export function canStartMasterTest(
  progress: PartProgress,
  now: string,
): boolean {
  timestamp.parse(now);
  return (
    progress.status === 'klar_for_mesterprøve' &&
    !!progress.readySince &&
    dayKey(now) > dayKey(progress.readySince) &&
    (!progress.lastTestAt || dayKey(now) > dayKey(progress.lastTestAt))
  );
}
export type MasterTest = {
  id: string;
  part: PartId;
  startedAt: string;
  items: { id: string; skillId: string; difficulty: 3 }[];
};
/** Server supplies fresh item IDs; round-robin gives every skill coverage. */
export function startMasterTest(
  progress: PartProgress,
  now: string,
  testId: string,
  itemIds: readonly string[],
  graph: readonly Skill[] = skills,
): MasterTest {
  if (!canStartMasterTest(progress, now))
    throw new Error('Mesterutfordringen kan tas tidligst neste dag.');
  if (
    itemIds.length < 8 ||
    itemIds.length > 10 ||
    new Set(itemIds).size !== itemIds.length ||
    !testId ||
    itemIds.some((id) => !id)
  )
    throw new Error('Mesterutfordringen trenger 8–10 unike oppgaver.');
  const inPart = graph.filter((s) => s.part === progress.id);
  if (inPart.length > itemIds.length)
    throw new Error('Alle ferdigheter må dekkes.');
  return {
    id: testId,
    part: progress.id,
    startedAt: now,
    items: itemIds.map((id, i) => ({
      id,
      skillId: inPart[i % inPart.length].id,
      difficulty: 3,
    })),
  };
}
const testAnswer = z
  .object({ itemId: z.string(), correct: z.boolean(), hintLevel: z.literal(0) })
  .strict();
export function finishMasterTest(
  progress: PartProgress,
  test: MasterTest,
  answers: unknown,
  now: string,
): { progress: PartProgress; score: number; passed: boolean } {
  timestamp.parse(now);
  if (
    test.part !== progress.id ||
    !canStartMasterTest(progress, test.startedAt) ||
    dayKey(now) !== dayKey(test.startedAt) ||
    Date.parse(now) < Date.parse(test.startedAt)
  )
    throw new Error('Ugyldig mesterutfordring.');
  const parsed = z.array(testAnswer).min(8).max(10).parse(answers);
  if (
    parsed.length !== test.items.length ||
    new Set(parsed.map((a) => a.itemId)).size !== parsed.length ||
    parsed.some((a) => !test.items.some((i) => i.id === a.itemId))
  )
    throw new Error('Svarene må dekke alle oppgaver én gang.');
  const score = parsed.filter((a) => a.correct).length / parsed.length,
    passed = score >= 0.8;
  const targetedSkills = test.items
    .filter((i) => parsed.find((a) => a.itemId === i.id)?.correct === false)
    .map((i) => i.skillId);
  return {
    score,
    passed,
    progress: {
      ...progress,
      status: passed ? 'tildelt' : 'klar_for_mesterprøve',
      awardedAt: progress.awardedAt ?? (passed ? now : null),
      lastTestAt: now,
      testAttempts: progress.testAttempts + 1,
      targetedSkills: [...new Set(targetedSkills)],
    },
  };
}
export function completedMedallion(parts: readonly PartProgress[]): boolean {
  return [1, 2, 3, 4].every((id) =>
    parts.some((p) => p.id === id && !!p.awardedAt),
  );
}
