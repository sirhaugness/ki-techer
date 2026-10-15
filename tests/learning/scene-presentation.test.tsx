// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { presentScene } from '../../lib/learning/scene-presentation';
import { StoryWorld } from '../../components/leo/story-world';
import type { StoryScene } from '../../lib/learning/story-contract';

const scene: StoryScene = {
  itemIndex: 0,
  id: 'm1',
  title: 'Sporet',
  location: 'Ved elven',
  illustration: 'none',
  backdrop: 'river',
  before: 'Dere følger sporet.',
  speaker: 'Leo',
  dialogue: 'Se her!',
  purpose: 'Hjelp vennene videre.',
  questionTemplate: '',
  clueTemplate: '',
  object: 'map',
  container: 'bakken',
  glyph: 'part',
  subject: 'map',
  action: 'route',
  effect: 'travel',
  expressionRequired: false,
  resourceEffect: 'none',
  success: 'Sporet er tydelig.',
  retry: 'Vi prøver igjen.',
  follows: [],
  gains: [],
  uses: [],
  consumes: [],
  cast: [],
  clue: '',
};

describe('concrete scene presentation', () => {
  it('preserves a gate or ship as the target when the material vocabulary changes', () => {
    expect(
      presentScene(
        { ...scene, subject: 'gate', effect: 'open' },
        'Tell steinmerkene.',
      ).subject,
    ).toBe('gate');
    expect(
      presentScene(
        { ...scene, subject: 'starship', effect: 'repair' },
        'Finn leirekiler.',
      ).subject,
    ).toBe('starship');
  });
  it('shows the actual allocations in sharing rather than inventing groups of four', () => {
    const next = presentScene(scene, 'Fordel steinmerker likt.');
    const el = document.createElement('div');
    el.innerHTML = renderToStaticMarkup(
      <StoryWorld
        scene={next}
        state="working"
        value={6}
        groups={3}
        groupValues={[6, 6, 6]}
        allocations={[6, 6, 6]}
      />,
    );
    expect(
      [...el.querySelectorAll('.story-marker-trail > g')].map(
        (g) => g.querySelectorAll('.story-added-object').length,
      ),
    ).toEqual([6, 6, 6]);
    el.innerHTML = renderToStaticMarkup(
      <StoryWorld
        scene={next}
        state="working"
        value={0}
        groups={3}
        groupValues={[2, 7, 1]}
        allocations={[2, 7, 1]}
      />,
    );
    expect(
      [...el.querySelectorAll('.story-marker-trail > g')].map(
        (g) => g.querySelectorAll('.story-added-object').length,
      ),
    ).toEqual([2, 7, 1]);
  });
  it('renders the chosen number of stones in the given groups, rather than a holomap', () => {
    const next = presentScene(
      scene,
      'Dere lager 5 hauger med 4 steinmerker i hver.',
    );
    const el = document.createElement('div');
    el.innerHTML = renderToStaticMarkup(
      <StoryWorld
        scene={next}
        state="working"
        value={7}
        groups={5}
        groupSize={4}
        allocations={[]}
      />,
    );
    expect(el.querySelectorAll('.story-marker-trail > g')).toHaveLength(5);
    expect(el.querySelectorAll('.story-added-object')).toHaveLength(7);
    expect(el.querySelector('.story-holomap')).toBeNull();
    expect(scene.subject).toBe('map');
  });
  it('distinguishes gathering clay wedges in a bag from placing them around a slab', () => {
    const gathering = presentScene(
      { ...scene, subject: 'storage', resourceEffect: 'gather' },
      'Hvor mange leire-kiler har dere?',
    );
    expect(gathering.subject).toBe('bag');
    const placing = presentScene(
      { ...scene, subject: 'storage', effect: 'build' },
      'Hvor mange leirekiler trengs rundt hella?',
    );
    const el = document.createElement('div');
    el.innerHTML = renderToStaticMarkup(
      <StoryWorld scene={placing} state="solved" value={8} allocations={[]} />,
    );
    expect(el.querySelectorAll('.story-placed-wedge')).toHaveLength(8);
    expect(placing.glyph).toBe('wedge');
    expect(el.querySelector('.story-built-object')).toBeNull();
  });
  it('uses a bag for noise beacons and a mirror for reflected signals', () => {
    const bag = presentScene(
      { ...scene, subject: 'storage' },
      'Dere tar støysendere med i posen.',
    );
    const el = document.createElement('div');
    el.innerHTML = renderToStaticMarkup(
      <StoryWorld scene={bag} state="solved" value={20} allocations={[]} />,
    );
    expect(
      el.querySelectorAll('.story-supply-bag .story-added-object'),
    ).toHaveLength(20);
    expect(el.querySelector('.story-bag-tie')).not.toBeNull();
    expect(
      presentScene(
        { ...scene, subject: 'sender', title: 'Speilblink' },
        'Dobbelt lys.',
      ).subject,
    ).toBe('mirror');
  });
  it('suppresses a saved river illustration inside a cave', () => {
    const el = document.createElement('div');
    el.innerHTML = renderToStaticMarkup(
      <StoryWorld
        scene={{
          ...scene,
          backdrop: 'cave',
          illustration: 'prehistoric-river',
          artwork: '/adventure/scenes/prehistoric-river.webp',
        }}
        state="waiting"
        value={0}
        allocations={[]}
      />,
    );
    expect(el.querySelector('image')).toBeNull();
  });
});
