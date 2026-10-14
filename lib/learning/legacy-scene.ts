import type { ActiveTask } from '../agent/tools';
import type { ChapterPlan } from './adventure';
import type { StoryScene } from './story-contract';
/** Present a saved, verified task in the new world without regenerating it or changing its key. */
export function legacyScene(
  task: ActiveTask,
  plan: ChapterPlan,
  index: number,
  label: string,
): StoryScene {
  const beat = plan.missions[index],
    space = ['Star Wars', 'Verdensrommet'].includes(label);
  const m = task.interaction!.math;
  const subject: StoryScene['subject'] =
    beat.effect === 'open'
      ? 'gate'
      : beat.effect === 'signal'
        ? 'sender'
        : beat.effect === 'build'
          ? 'bridge'
          : beat.effect === 'travel' || beat.effect === 'reveal'
            ? 'map'
            : space && ['charge', 'launch'].includes(beat.effect)
              ? 'starship'
              : ['rescue', 'arrive'].includes(beat.effect)
                ? 'creature'
                : 'storage';
  const backdrop: StoryScene['backdrop'] =
    beat.stage === 'hangar' || beat.stage === 'station' ? 'base' : beat.stage;
  return {
    id: `saved-${index + 1}`,
    title: beat.scene,
    itemIndex: index,
    location: plan.place,
    illustration: 'none',
    backdrop,
    before: beat.scene,
    speaker: plan.companion,
    dialogue: beat.dialogue.replace(/^.*?:\s*/, '').replaceAll(/[«»]/g, ''),
    purpose: beat.purpose,
    questionTemplate: task.text,
    clueTemplate: task.text,
    clue:
      m.kind === 'groups'
        ? `${m.groups} ${beat.container} · ${m.each} ${beat.object} i hver`
        : m.kind === 'share' || m.kind === 'measure'
          ? `${m.total} ${beat.object} · ${m.kind === 'share' ? m.groups : m.each} ${beat.container}`
          : beat.purpose,
    object: beat.object,
    container: beat.container,
    glyph: /plank/.test(beat.object)
      ? 'plank'
      : /kart|spor/.test(beat.object)
        ? 'map'
        : /bær|mat/.test(beat.object)
          ? 'food'
          : /signal/.test(beat.object)
            ? 'signal'
            : /flask/.test(beat.object)
              ? 'water'
              : 'energy',
    subject,
    action:
      task.interaction?.kind === 'grouping'
        ? 'distribute'
        : beat.effect === 'travel'
          ? 'route'
          : beat.effect === 'signal'
            ? 'signal'
            : beat.effect === 'build'
              ? 'build'
              : 'load',
    effect:
      beat.effect === 'charge'
        ? 'fill'
        : beat.effect === 'arrive'
          ? 'rescue'
          : beat.effect === 'load'
            ? 'fill'
            : beat.effect,
    expressionRequired: task.expressionRequired ?? false,
    success: beat.outcome,
    retry: 'Se på mengdene i oppdraget. Vi prøver sammen igjen.',
    follows: [],
    gains: [],
    uses: [],
    consumes: [],
    cast: [
      {
        name: plan.companion,
        role: 'Med på reisen',
        appearance: /BB-8/.test(plan.companion)
          ? 'round-droid'
          : /R2|droide/.test(plan.companion)
            ? 'robot'
            : label === 'Dinosaurer'
              ? 'dinosaur'
              : 'explorer',
      },
    ],
    artwork:
      label === 'Star Wars' && backdrop === 'base'
        ? '/adventure/scenes/resistance-hangar.webp'
        : label === 'Dinosaurer' && ['forest', 'river'].includes(backdrop)
          ? '/adventure/scenes/prehistoric-river.webp'
          : undefined,
  };
}
