import { initialState } from '../../lib/engine/mastery';
import { progressForPart } from '../../lib/engine/medallion';
import { startSession, defaultSessionSettings } from '../../lib/engine/session';
import { seededRng } from '../../lib/engine/random';
import type { AgentRuntime } from '../../lib/agent/tools';
import type { AiProvider, ProviderReply } from '../../lib/ai/provider';
export function runtime(provider: AiProvider | null = null): AgentRuntime {
  const now = '2026-10-11T10:00:00.000Z';
  let id = 0;
  const states = { 'mult-telling-grupper': initialState() };
  return {
    context: {
      states,
      clock: startSession(defaultSessionSettings, now, 0),
      now,
      phase: 'oppvarming',
      history: [],
      focusSkillId: null,
    },
    rng: seededRng(42),
    uuid: () => `task-${++id}`,
    provider,
    active: null,
    states,
    parts: ([1, 2, 3, 4] as const).map((id) => progressForPart(id, states)),
    masterTest: null,
    interests: [],
    usedInterests: [],
    pendingObservations: [],
    schoolTopics: [],
    visual: null,
    ended: false,
    pauseOffered: false,
  };
}
export function mockProvider(replies: ProviderReply[]): AiProvider {
  let i = 0;
  return {
    respond: async () => replies[Math.min(i++, replies.length - 1)],
    moderate: async () => true,
  };
}
