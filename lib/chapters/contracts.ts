import { z } from 'zod';
import type { GeneratedItem } from '../engine/skills/generators';

const id = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);
const text = z.string().trim().min(1).max(600);
export const interestSchema = z.object({ key: text, label: text }).strict();

/** Identity does not depend on display capitalization or repeated whitespace. */
export function identifyInterest(input: string) {
  const label = z
    .string()
    .trim()
    .min(1)
    .max(80)
    .parse(input)
    .normalize('NFKC')
    .replace(/\s+/gu, ' ');
  return interestSchema.parse({ key: label.toLocaleLowerCase('nb-NO'), label });
}

const animation = z
  .object({
    targetId: id,
    action: z.enum([
      'highlight',
      'move',
      'group',
      'distribute',
      'fill',
      'reveal',
    ]),
  })
  .strict();
const sceneSchema = z
  .object({
    locationId: id,
    actorIds: z.array(id).max(12),
    backgroundAssetId: id,
    objects: z
      .array(
        z
          .object({
            id,
            label: text,
            assetId: id,
            // Only references to verified GIVEN quantities; never an independent count.
            quantityKey: z
              .string()
              .regex(/^[a-z]+$/)
              .nullable(),
          })
          .strict(),
      )
      .max(30),
    interaction: z.enum([
      'quantity',
      'grouping',
      'distribution',
      'expression',
      'geometry',
      'route',
      'choice',
    ]),
    feedback: z
      .object({
        working: z.array(animation).max(20),
        incorrect: z.array(animation).max(20),
        correct: z.array(animation).max(20),
        reducedMotion: z
          .object({ working: text, incorrect: text, correct: text })
          .strict(),
      })
      .strict(),
  })
  .strict();
const variantSchema = z
  .object({
    id,
    role: z.enum(['primary', 'support']),
    representation: z.enum(['konkret', 'bilde', 'tall']),
    problem: z
      .object({
        generatorVersion: z.literal(1),
        skillId: text,
        difficulty: z.number().int().min(1).max(5),
        seed: z.number().int().min(0).max(4294967295),
      })
      .strict(),
    questionTemplate: text,
    clueTemplate: text,
    scene: sceneSchema,
  })
  .strict();
const missionSchema = z
  .object({
    kind: z.literal('mission'),
    id,
    title: text,
    before: text,
    goal: text,
    success: text,
    // Consequences are shared by all variants. More complex divergent outcomes
    // need explicit story branches, rather than silently changing established facts.
    next: id,
    variants: z.array(variantSchema).min(1).max(4),
  })
  .strict();
const choiceSchema = z
  .object({
    kind: z.literal('choice'),
    id,
    prompt: text,
    options: z
      .array(z.object({ id, label: text, next: id }).strict())
      .min(2)
      .max(4),
  })
  .strict();
const endingSchema = z
  .object({
    kind: z.literal('ending'),
    id,
    narration: text,
    hook: text,
  })
  .strict();

/** Server-side proposal, NOT editorial approval or permission to start playing. */
export const chapterPackageSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    sagaId: id,
    basedOnRevision: z.number().int().nonnegative(),
    interest: interestSchema,
    title: text,
    goal: text,
    opening: text,
    entryNodeId: id,
    locations: z
      .array(z.object({ id, name: text }).strict())
      .min(1)
      .max(30),
    actors: z.array(z.object({ id, name: text, assetId: id }).strict()).max(12),
    assets: z
      .array(
        z
          .object({
            id,
            role: z.enum(['background', 'character', 'prop']),
            description: text,
          })
          .strict(),
      )
      .min(1)
      .max(100),
    nodes: z
      .array(
        z.discriminatedUnion('kind', [
          missionSchema,
          choiceSchema,
          endingSchema,
        ]),
      )
      .min(2)
      .max(40),
  })
  .strict();
export type ChapterPackage = z.infer<typeof chapterPackageSchema>;
export type ChapterMission = Extract<
  ChapterPackage['nodes'][number],
  { kind: 'mission' }
>;
export type MissionVariant = ChapterMission['variants'][number];

/** Actual facts only. Planned chapter endings must not be added here. */
export const sagaFactsSchema = z
  .object({
    id,
    revision: z.number().int().nonnegative(),
    interest: interestSchema,
    goal: text,
    chapterSummaries: z
      .array(z.object({ chapterId: id, summary: text }).strict())
      .max(1000),
    events: z
      .array(
        z.object({ id, chapterId: id, missionId: id, summary: text }).strict(),
      )
      .max(10000),
    choices: z
      .array(
        z
          .object({ chapterId: id, nodeId: id, optionId: id, label: text })
          .strict(),
      )
      .max(1000)
      .optional(),
    inventory: z
      .array(
        z
          .object({
            id,
            label: text,
            quantity: z.number().int().nonnegative(),
            unit: text,
          })
          .strict(),
      )
      .max(200),
    actorLocations: z
      .array(z.object({ actorId: id, locationId: id }).strict())
      .max(100),
  })
  .strict();
export type SagaFacts = z.infer<typeof sagaFactsSchema>;

/** Supplied by persisted server progress, never by an author/model response. */
export const chapterProgressSchema = z
  .object({
    chapterId: id,
    sagaId: id,
    currentMissionId: id,
    variantId: id,
    completedMissionIds: z.array(id).max(40),
    choices: z.array(z.object({ nodeId: id, optionId: id }).strict()).max(40),
  })
  .strict();

export const tutorStateSchema = z
  .object({
    allowedHintLevel: z.number().int().min(0).max(4),
    assessment: z.enum(['not-answered', 'incorrect', 'partial', 'correct']),
    attempts: z
      .array(
        z
          .object({
            correct: z.boolean(),
            hintLevel: z.number().int().min(0).max(4),
          })
          .strict(),
      )
      .max(5),
  })
  .strict();

/** No hidden answer, future node, answer expression or raw generator params. */
export type PublicMission = {
  chapterId: string;
  missionId: string;
  variantId: string;
  title: string;
  before: string;
  goal: string;
  question: string;
  clue: string;
  representation: MissionVariant['representation'];
  answerType: GeneratedItem['answerType'];
  choices: string[];
  location: { id: string; name: string };
  actors: { id: string; name: string; assetId: string }[];
  scene: Omit<MissionVariant['scene'], 'objects' | 'feedback'> & {
    objects: {
      id: string;
      label: string;
      assetId: string;
      quantity: number | null;
    }[];
    feedback: Pick<
      MissionVariant['scene']['feedback'],
      'working' | 'incorrect'
    > & {
      reducedMotion: Pick<
        MissionVariant['scene']['feedback']['reducedMotion'],
        'working' | 'incorrect'
      >;
    };
  };
};
