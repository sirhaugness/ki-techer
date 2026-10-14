import { z } from 'zod';
import type { UniverseResearch } from '../ai/provider';

const short = z.string().min(1).max(240);
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
  before: short,
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
  success: short,
  retry: short,
  follows: z.array(z.string().min(1).max(80)).max(8),
  gains: z.array(z.string().min(1).max(100)).max(4),
  uses: z.array(z.string().min(1).max(100)).max(4),
  consumes: z.array(z.string().min(1).max(100)).max(4),
});
export const storyChapterSchema = z.object({
  title: short,
  arcTitle: short,
  arcGoal: short,
  opening: short,
  goal: short,
  hook: short,
  continuity: short,
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
