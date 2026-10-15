import type { StoryScene } from './story-contract';

/** Upgrade visual vocabulary in saved scenes without changing the problem or its answer. */
export function presentScene(scene: StoryScene, question: string): StoryScene {
  const text = question.toLocaleLowerCase('nb-NO').replaceAll('-', '');
  const next = { ...scene };
  if (/steinmerke/.test(text)) {
    next.glyph = 'stone';
    if (
      ['map', 'storage'].includes(scene.subject) &&
      ['travel', 'reveal', 'build'].includes(scene.effect)
    )
      next.subject = 'marker-trail';
  } else if (/leirekil/.test(text)) {
    next.glyph = 'wedge';
    if (scene.subject === 'storage')
      next.subject = scene.resourceEffect === 'gather' ? 'bag' : 'slab';
  } else if (/harpiksklump/.test(text)) {
    next.glyph = 'resin';
    if (scene.subject === 'storage') next.subject = 'bag';
  } else if (/støysender/.test(text)) {
    next.glyph = 'beacon';
    if (scene.subject === 'storage') next.subject = 'bag';
  } else if (/\btau(?:et|lengde|\b)/.test(text)) {
    next.glyph = 'rope';
  }
  if (
    scene.subject === 'sender' &&
    /speil|speilblink/i.test(`${scene.title} ${scene.before}`)
  )
    next.subject = 'mirror';
  if (
    next.subject === 'storage' &&
    /\bpos(?:e|en|er|ene)\b/i.test(`${question} ${scene.before}`) &&
    scene.effect !== 'build'
  )
    next.subject = 'bag';
  return next;
}
