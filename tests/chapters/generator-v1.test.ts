import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import fixture from './fixtures/generator-v1.json';
import { generate } from '../../lib/chapters/generator-v1/skills/generators';
import { seededRng } from '../../lib/chapters/generator-v1/random';
import type { Difficulty } from '../../lib/chapters/generator-v1/skills/graph';

it('preserves all 3500 frozen version-1 outputs independently of the live engine', () => {
  const hash = createHash('sha256');
  for (const id of fixture.skillIds)
    for (const level of fixture.levels)
      for (const seed of fixture.seeds)
        hash.update(
          JSON.stringify(generate(id, level as Difficulty, seededRng(seed))) +
            '\n',
        );
  // Never update this checksum to accommodate generator changes. Introduce v2.
  expect(hash.digest('hex')).toBe(fixture.sha256);
});
