import { beforeEach, expect, it, vi } from 'vitest';
const access = vi.hoisted(() => ({ allowed: true, fixture: false, calls: 0 }));
vi.mock('server-only', () => ({}));
vi.mock('../../lib/learning/access', () => ({
  leoAccess: async () => {
    access.calls++;
    if (!access.allowed) throw new Error('Ingen tilgang');
  },
}));
vi.mock('../../lib/learning/fixture', () => ({
  fixtureEnabled: () => access.fixture,
}));
import { playDemo } from '../../app/leo/provekapittel/actions';
import { newDemoState } from '../../lib/chapters/demo-contracts';
beforeEach(() => {
  access.allowed = true;
  access.fixture = false;
  access.calls = 0;
});
it('checks locked household access again on every server action including resume', async () => {
  await playDemo(newDemoState(), 'resume');
  access.allowed = false;
  await expect(playDemo(newDemoState(), 'hint')).rejects.toThrow(
    'Ingen tilgang',
  );
  await expect(playDemo(newDemoState(), 'resume')).rejects.toThrow(
    'Ingen tilgang',
  );
  expect(access.calls).toBe(3);
});
