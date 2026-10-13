import { expect, it, vi } from 'vitest';
import { nextConfidence } from '../../lib/profile/rules';
import { chapter } from '../../lib/profile/story';
import { reflectSession } from '../../lib/ai/reflect';
import { createSession, learningTurn } from '../../lib/learning/session';
import { executeTool } from '../../lib/agent/tools';
import { runtime, mockProvider } from '../agent/fixtures';
const profile = {
  id: '00000000-0000-4000-8000-000000000099',
  householdId: 'house',
  firstName: 'Leo',
  tutorName: 'Lumi',
  grade: 4,
  avatar: 'spire',
  settings: {},
};
it('uses fixed increments with boundaries, regardless of model confidence', () => {
  expect(nextConfidence(0.4, 'styrk')).toBe(0.55);
  expect(nextConfidence(0.55, 'styrk')).toBe(0.7);
  expect(nextConfidence(0.4, 'svekk')).toBe(0.2);
  expect(nextConfidence(0.2, 'arkiver')).toBe(0);
  expect(nextConfidence(0.95, 'styrk')).toBe(1);
});
it('chapters follow the strongest active interest and continue across sessions', () => {
  const interests = [
    { id: 'a', label: 'Dinosaurer', active: true, weight: 1 },
    { id: 'b', label: 'Fotball', active: true, weight: 2 },
    { id: 'c', label: 'Dyr', active: false, weight: 3 },
  ];
  expect(chapter(interests, 8)).toMatchObject({
    title: 'Matteeventyret: Fotball',
    number: 3,
  });
  expect(chapter(interests, 0).text).not.toBe(chapter(interests, 4).text);
  expect(chapter([], 0).title).toBe('Matteeventyret');
});
it('school topics expire after exactly seven days; uncertain topics are not saved', async () => {
  const r = runtime(mockProvider([]));
  await executeTool(r, 'noter_skoletema', { leo_sa: 'Vi øver på divisjon' });
  expect(r.schoolTopics[0].expiresAt).toBe('2026-10-18T10:00:00.000Z');
  await executeTool(r, 'noter_skoletema', { leo_sa: 'vet ikke' });
  expect(r.schoolTopics).toHaveLength(1);
  const state = createSession(
    profile,
    null,
    r.context.now,
    0,
    'practice',
    null,
  );
  state.schoolTopics = r.schoolTopics;
  state.endedAt = r.context.now;
  expect(
    createSession(
      profile,
      state,
      '2026-10-18T10:00:00.000Z',
      0,
      'practice',
      null,
    ).schoolTopics,
  ).toEqual([]);
});
it('reflection rejects foreign evidence, moderates output, and filters personal input', async () => {
  const state = createSession(
    profile,
    null,
    '2026-10-11T10:00:00.000Z',
    0,
    'practice',
    null,
  );
  state.messages = [{ role: 'leo', text: 'adressen min er hemmelig' }];
  const provider = mockProvider([
    {
      calls: [],
      value: {
        summary: 'Vi øvde på matte.',
        suggestions: [],
        operations: [
          {
            op: 'legg_til',
            observation_id: null,
            category: 'styrke',
            text: 'Prøver flere metoder',
            evidence_session_id: profile.id,
            confidence_delta: 1,
          },
        ],
      },
    },
  ]);
  const spy = vi.spyOn(provider, 'respond');
  const result = await reflectSession(provider, state, [], []);
  expect(result.operations).toEqual([]);
  expect(spy.mock.calls[0][0].purpose).toBe('reflect');
  expect(spy.mock.calls[0][0].input).not.toContain('adressen');
  provider.moderate = async () => false;
  expect((await reflectSession(provider, state, [], [])).summary).toContain(
    'kontrollert',
  );
});
it('reflection falls back after three malformed replies without inventing profile facts', async () => {
  const state = createSession(
    profile,
    null,
    '2026-10-11T10:00:00.000Z',
    0,
    'practice',
    null,
  );
  const p = mockProvider([{ calls: [], value: { wrong: true } }]);
  const spy = vi.spyOn(p, 'respond');
  expect((await reflectSession(p, state, [], [])).operations).toEqual([]);
  expect(spy).toHaveBeenCalledTimes(3);
});

it('school input is saved by the actual learning turn without replacing the active task', async () => {
  const state = createSession(
    profile,
    null,
    '2026-10-11T10:00:00.000Z',
    0,
    'practice',
    null,
  );
  const result = await learningTurn(
    state,
    { type: 'school', text: 'Vi øver på divisjon' },
    '00000000-0000-4000-8000-000000000020',
    '2026-10-11T10:00:00.000Z',
    profile,
    [],
    mockProvider([]),
    'Bokmål',
  );
  expect(result.events.schoolTopics).toHaveLength(1);
  expect(result.state.response.speech).toContain('notert');
  const unsure = await learningTurn(
    result.state,
    { type: 'school', text: '' },
    '00000000-0000-4000-8000-000000000021',
    '2026-10-11T10:00:00.000Z',
    profile,
    [],
    null,
    'Bokmål',
  );
  expect(unsure.events.schoolTopics).toEqual([]);
  expect(unsure.state.response.speech).toContain('helt greit');
});
