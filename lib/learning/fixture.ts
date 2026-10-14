import 'server-only';
import { createSession } from './session';
import { initialState } from '../engine/mastery';
import { progressForPart } from '../engine/medallion';
import { skills } from '../engine/skills/graph';
import type { Snapshot, LearnerProfile, Interest } from './types';

export function fixtureEnabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.E2E_LEO_FIXTURE === '1' &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}
const globalFixture = globalThis as typeof globalThis & {
  leoFixture?: {
    profile: LearnerProfile;
    state: Snapshot | null;
    interests: Interest[];
    storyDriven?: boolean;
  };
};
export function fixture() {
  return (globalFixture.leoFixture ??= {
    profile: {
      id: '00000000-0000-4000-8000-000000000099',
      householdId: '00000000-0000-4000-8000-000000000098',
      firstName: 'Leo',
      tutorName: 'Lumi',
      grade: 4,
      avatar: 'spire',
      settings: { session_minutes: 15, daily_max_minutes: 30 },
    },
    state: null,
    interests: [],
  });
}
export function resetFixture(master = false, ready = false, quiet = false) {
  const f = fixture();
  f.state = null;
  f.interests = [];
  f.storyDriven = false;
  f.profile.settings.voice = !quiet;
  if (ready) {
    f.state = createSession(
      f.profile,
      null,
      new Date().toISOString(),
      0,
      'practice',
      null,
    );
    f.state.diagnosticComplete = true;
    f.state.endedAt = new Date().toISOString();
  }
  if (master) {
    const now = new Date().toISOString(),
      yesterday = new Date(Date.now() - 86400000).toISOString();
    const state = createSession(f.profile, null, yesterday, 0, 'practice', 4);
    state.endedAt = yesterday;
    state.diagnosticComplete = true;
    for (const skill of skills.filter((s) => s.part === 4))
      state.states[skill.id] = { ...initialState(3), masteredAt: yesterday };
    state.parts = ([1, 2, 3, 4] as const).map((id) =>
      progressForPart(id, state.states),
    );
    state.taskStartedAt = now;
    f.state = state;
  }
  return f;
}
