import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { Snapshot } from '../../lib/learning/types';
import type { AiProvider } from '../../lib/ai/provider';
const store = vi.hoisted(() => ({
  state: null as Snapshot | null,
  denied: false,
  calls: 0,
  limits: 0,
  saved: [] as Snapshot[],
  stale: false,
  hold: null as Promise<void> | null,
  provider: null as AiProvider | null,
}));
vi.mock('server-only', () => ({}));
vi.mock('../../lib/learning/fixture', () => ({
  fixtureEnabled: () => false,
  fixture: () => {
    throw Error('No fixture in production test');
  },
}));
vi.mock('../../lib/learning/access', () => ({
  leoAccess: async () => {
    if (store.denied) throw Error('Locked device required');
    return {
      device: { id: 'device' },
      profile: {
        id: '00000000-0000-4000-8000-000000000011',
        householdId: '00000000-0000-4000-8000-000000000001',
        firstName: 'Leo',
        tutorName: 'Lumi',
        grade: 4,
        avatar: 'spire',
        settings: { voice: false },
      },
    };
  },
}));
vi.mock('../../lib/learning/repository', () => ({
  latestSession: async () => store.state,
  insertSession: async (s: Snapshot) => {
    store.state = structuredClone(s);
  },
  saveTurn: async (s: Snapshot, _id: string, rev: number) => {
    if (store.stale || store.state?.revision !== rev) return false;
    store.saved.push(structuredClone(s));
    store.state = structuredClone(s);
    return true;
  },
}));
vi.mock('../../lib/free-story/store', () => ({ usedMinutes: async () => 0 }));
vi.mock('../../lib/security/limits', () => ({
  allowDevice: async () => {
    store.limits++;
    return true;
  },
}));
vi.mock('../../lib/ai/control', () => ({
  controlledProvider: async () => {
    store.calls++;
    if (store.hold) await store.hold;
    return store.provider;
  },
}));
import { createSession } from '../../lib/learning/session';
import { GET, POST } from '../../app/api/star-wars/route';
const origin = 'http://localhost:3000';
function post(body: unknown, requestOrigin = origin) {
  return POST(
    new Request(origin + '/api/star-wars', {
      method: 'POST',
      headers: { origin: requestOrigin, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}
function turn(event: unknown, overrides: Record<string, unknown> = {}) {
  const s = store.state!;
  return {
    command: 'turn',
    sessionId: s.id,
    itemId: s.starWars!.itemId,
    revision: s.revision,
    requestId: crypto.randomUUID(),
    event,
    ...overrides,
  };
}
beforeEach(() => {
  store.state = null;
  store.denied = false;
  store.calls = 0;
  store.limits = 0;
  store.saved = [];
  store.stale = false;
  store.hold = null;
  store.provider = null;
  delete process.env.APP_URL;
  delete process.env.VERCEL_URL;
});
describe('full adventure API authority', () => {
  it('sends the v2 conversation and help memory through the real route once per claim', async () => {
    await post({ command: 'start' });
    store.provider = {
      moderate: vi.fn(async () => true),
      respond: vi.fn(async () => ({
        value: {
          speech: 'Legg én celle i hvert skjoldfelt. Da får alle like mye.',
        },
        usage: { inputTokens: 1, outputTokens: 1 },
      })),
    } as unknown as AiProvider;
    const first = turn({ type: 'ask', text: 'Hva betyr like mange?' });
    expect((await post(first)).status).toBe(200);
    expect((await post(first)).status).toBe(200);
    expect(store.provider.respond).toHaveBeenCalledTimes(1);
    const request = vi.mocked(store.provider.respond).mock.calls[0][0];
    expect(request.instructions).toContain('submittedAttempts');
    expect(JSON.parse(request.input as string).helpHistory).toHaveLength(1);
    expect(store.state!.starWars!.helpHistory).toHaveLength(1);
    expect(store.state!.starWars!.source).toBe('model');
    expect(
      (await post(turn({ type: 'ask', text: 'Hvorfor må de få like mye?' })))
        .status,
    ).toBe(200);
    const second = JSON.parse(
      vi.mocked(store.provider.respond).mock.calls[1][0].input as string,
    );
    expect(second.messages).toEqual([
      { role: 'leo', text: 'Hva betyr like mange?' },
      {
        role: 'lærer',
        text: 'Legg én celle i hvert skjoldfelt. Da får alle like mye.',
      },
    ]);
    expect(second.requestIntent).toBe('why');
    expect(store.state!.starWars!.helpHistory).toHaveLength(2);
    expect(store.saved[0].starWars!.helpHistory).toHaveLength(1);
    expect(store.saved[0].starWars!.source).toBe('fallback');
    expect(store.state!.starWars).toMatchObject({
      index: 0,
      status: 'working',
      completed: [],
    });
  });
  it('claims a paid question before the provider and replays its saved hint during a concurrent retry', async () => {
    await post({ command: 'start' });
    let release!: () => void;
    store.hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const body = turn({ type: 'ask', text: 'Hva betyr like mange?' });
    const first = post(body);
    await vi.waitFor(() => expect(store.calls).toBe(1));
    expect(store.state!.starWars).toMatchObject({
      assisted: true,
      source: 'fallback',
    });
    expect((await post(body)).status).toBe(200);
    expect(store.calls).toBe(1);
    release();
    expect((await first).status).toBe(200);
    expect(store.state!.revision).toBe(2);
    expect((await post(body)).status).toBe(200);
    expect(store.calls).toBe(1);
  });
  it('requires locked household access, same origin and schema-validated server events', async () => {
    store.denied = true;
    expect((await GET()).status).toBe(503);
    store.denied = false;
    expect(
      (await post({ command: 'start' }, 'https://foreign.invalid')).status,
    ).toBe(403);
    expect(
      (await post({ command: 'start', state: { completed: true } })).status,
    ).toBe(400);
    expect((await post({ command: 'start' })).status).toBe(200);
    expect((await GET()).headers.get('cache-control')).toBe(
      'private, no-store',
    );
    expect(
      (await post(turn({ type: 'probe', probeId: 'wrong', text: 'test' })))
        .status,
    ).toBe(400);
  });
  it('explicitly switches from an old open session without deleting its evidence, and respects CAS', async () => {
    const original = createSession(
      {
        id: '00000000-0000-4000-8000-000000000011',
        householdId: '00000000-0000-4000-8000-000000000001',
        firstName: 'Leo',
        tutorName: 'Lumi',
        grade: 4,
        avatar: 'spire',
        settings: {},
      },
      null,
      new Date().toISOString(),
      0,
      'diagnostic',
      null,
    );
    original.messages = [{ role: 'leo', text: 'Et tidligere svar' }];
    store.state = structuredClone(original);
    expect((await post({ command: 'start' })).status).toBe(400);
    expect(store.saved).toHaveLength(0);
    store.stale = true;
    expect(
      (await post({ command: 'start', switchFromPrevious: true })).status,
    ).toBe(400);
    expect(store.state.id).toBe(original.id);
    store.stale = false;
    expect(
      (await post({ command: 'start', switchFromPrevious: true })).status,
    ).toBe(200);
    expect(store.saved[0]).toMatchObject({
      id: original.id,
      messages: original.messages,
      revision: 1,
    });
    expect(store.saved[0].endedAt).toBeTruthy();
    expect(store.state.id).not.toBe(original.id);
    expect(store.state.starWarsActive).toBe(true);
    expect(store.calls).toBe(0);
    const activeId = store.state.id;
    await post({ command: 'start', switchFromPrevious: true });
    expect(store.state.id).toBe(activeId);
    expect(store.saved).toHaveLength(1);
  });
  it('rejects stale/foreign item or session before any teacher request', async () => {
    await post({ command: 'start' });
    for (const override of [
      { revision: 99 },
      { sessionId: crypto.randomUUID() },
      { itemId: crypto.randomUUID() },
    ])
      expect(
        (await post(turn({ type: 'ask', text: 'Hjelp' }, override))).status,
      ).toBe(409);
    expect(store.calls).toBe(0);
  });
  it('persists work and replays a lost response without new revision, even after pause', async () => {
    await post({ command: 'start' });
    const body = turn({
      type: 'work',
      work: { ...store.state!.starWars!.work, groups: [1, 0, 0, 0] },
    });
    expect((await post(body)).status).toBe(200);
    expect(store.limits).toBe(1); // saving manipulatives does not consume the AI-turn quota
    const rev = store.state!.revision;
    expect((await post(body)).status).toBe(200);
    expect(store.state!.revision).toBe(rev);
    const pause = turn({ type: 'pause' });
    await post(pause);
    expect((await post(pause)).status).toBe(200);
    const old = store.state!.id;
    await post({ command: 'start' });
    expect(store.state!.id).not.toBe(old);
    expect(store.state!.starWars!.work.groups).toEqual([1, 0, 0, 0]);
  });
});
