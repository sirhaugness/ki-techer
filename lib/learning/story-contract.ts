import { z } from 'zod';
import type { UniverseResearch } from '../ai/provider';

const short = z.string().min(1).max(240);
const narration = z.string().min(1).max(500);
export const storyActorSchema = z.object({
  name: z.string().min(1).max(60),
  role: short,
  appearance: z.enum([
    'pilot',
    'jedi',
    'robot',
    'round-droid',
    'gold-droid',
    'dinosaur',
    'animal',
    'explorer',
    'player',
    'engineer',
    'wookiee',
    'smuggler',
    'princess',
  ]),
});
export const storyMissionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
  title: short,
  itemIndex: z.number().int().min(0).max(23),
  location: short,
  illustration: z.enum([
    'desert-hangar',
    'crystal-cavern',
    'prehistoric-river',
    'none',
  ]),
  backdrop: z.enum([
    'space',
    'desert',
    'base',
    'cave',
    'forest',
    'river',
    'stadium',
    'workshop',
    'village',
    'mountain',
  ]),
  before: narration,
  speaker: z.string().min(1).max(60),
  dialogue: short,
  purpose: short,
  questionTemplate: z.string().min(1).max(500),
  clueTemplate: short,
  object: z.string().min(1).max(60),
  container: z.string().min(1).max(60),
  glyph: z.enum([
    'energy',
    'part',
    'water',
    'coin',
    'crystal',
    'plank',
    'map',
    'ball',
    'food',
    'signal',
    'stone',
    'wedge',
    'resin',
    'rope',
    'beacon',
  ]),
  subject: z.enum([
    'starship',
    'droid',
    'bridge',
    'gate',
    'sender',
    'market',
    'water',
    'map',
    'storage',
    'creature',
    'person',
    'marker-trail',
    'slab',
    'bag',
    'mirror',
  ]),
  action: z.enum([
    'load',
    'repair',
    'distribute',
    'fill',
    'trade',
    'route',
    'decode',
    'build',
    'inspect',
    'signal',
  ]),
  effect: z.enum([
    'launch',
    'repair',
    'open',
    'fill',
    'trade',
    'travel',
    'reveal',
    'build',
    'rescue',
    'signal',
    'shield',
  ]),
  expressionRequired: z.boolean(),
  resourceEffect: z.enum(['gather', 'use', 'none']),
  success: short,
  retry: short,
  follows: z.array(z.string().min(1).max(80)).max(8),
  gains: z
    .array(z.string().min(1).max(100))
    .max(4)
    .describe(
      'Bare gjenstander dere faktisk tar med videre. Fastmontert utstyr blir igjen, og skal ikke registreres her.',
    ),
  uses: z.array(z.string().min(1).max(100)).max(4),
  consumes: z.array(z.string().min(1).max(100)).max(4),
});
export const storyChapterSchema = z.object({
  title: short,
  arcTitle: short,
  arcGoal: short,
  opening: narration,
  goal: short.describe(
    'Et konkret delmål som faktisk oppnås i dette kapittelets seks oppdrag.',
  ),
  hook: short.describe(
    'Et nytt uløst spørsmål eller problem som oppstår ETTER siste oppdrag. Ikke gjenta kapittelets åpning eller en allerede løst kode.',
  ),
  continuity: short.describe(
    'Forklar konkret hva forrige kapittel oppnådde og hvorfor neste handling følger av det. Ikke start et løst oppdrag på nytt.',
  ),
  cast: z.array(storyActorSchema).min(1).max(8),
  missions: z.array(storyMissionSchema).length(6),
  decision: z.object({
    afterMission: z.string().min(1).max(40),
    payoffMission: z.string().min(1).max(40),
    prompt: short,
    resource: z.string().min(1).max(100),
    options: z
      .array(
        z.object({
          label: short,
          cost: z.number().int().positive().max(999),
          assetName: z.string().min(1).max(100),
          consequence: short,
          laterScene: short,
          laterSuccess: short,
        }),
      )
      .length(2),
  }),
});
export type StoryMission = z.infer<typeof storyMissionSchema>;
export type StoryChapter = z.infer<typeof storyChapterSchema>;
export type StoryActor = z.infer<typeof storyActorSchema>;
const actorKey = (name: string) => {
  const key = name.toLocaleLowerCase('nb-NO').replaceAll(/[\s\-‐‑–—]/g, '');
  return (
    ({ r2: 'r2d2', chewie: 'chewbacca' } as Record<string, string>)[key] ?? key
  );
};
/** Resolve spelling variants and an unambiguous short name within the introduced cast. */
export function storySpeaker(speaker: string, cast: StoryActor[]): string {
  const key = actorKey(speaker);
  const exact = cast.filter((a) => actorKey(a.name) === key);
  if (exact.length === 1) return exact[0].name;
  const short = cast.filter((a) => actorKey(a.name.split(/\s+/)[0]) === key);
  return short.length === 1 ? short[0].name : speaker;
}
/** Keep known character art stable even when the planner chooses another sprite. */
export function canonicalActor(actor: StoryActor): StoryActor {
  const name = actor.name
    .toLocaleLowerCase('nb-NO')
    .replaceAll(/[\s\-‐‑–—]/g, '');
  const appearance: StoryActor['appearance'] | undefined =
    name === 'r2d2' || name === 'r2'
      ? 'robot'
      : name === 'bb8'
        ? 'round-droid'
        : name === 'c3po'
          ? 'gold-droid'
          : name === 'chewbacca' || name === 'chewie'
            ? 'wookiee'
            : name.includes('hansolo')
              ? 'smuggler'
              : name.includes('leia')
                ? 'princess'
                : name.includes('lukeskywalker')
                  ? 'jedi'
                  : undefined;
  return appearance ? { ...actor, appearance } : actor;
}
export type StoryEvent = {
  id: string;
  mission: string;
  location: string;
  action: string;
  outcome: string;
  gains: string[];
  uses: string[];
  consumes?: string[];
};
export type StoryArchive = {
  number: number;
  title: string;
  goal: string;
  hook: string;
  events: StoryEvent[];
  choices: string[];
};
export type StorySaga = {
  version: 2;
  title: string;
  goal: string;
  research: UniverseResearch;
  chapters: StoryArchive[];
  inventory: string[];
  companions: StoryActor[];
};
export type StoryScene = StoryMission & {
  artwork?: string;
  cast: StoryActor[];
  clue: string;
  previousEvent?: string;
  branch?: string;
};
