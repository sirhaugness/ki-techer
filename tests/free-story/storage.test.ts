import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { planMath } from '../../lib/free-story/planner';
import { reserveHeader, reserveMission } from '../../lib/free-story/generation';
import { startStorySession, storyTurn } from '../../lib/free-story/play';
import type { LearnerProfile } from '../../lib/learning/types';
import type {
  ApprovedMission,
  FreeChapter,
  StoryHeader,
  StorySession,
} from '../../lib/free-story/types';

// A private in-memory database, never a shared Supabase project or connector.
let db: PGlite;
const ids = {
  a: randomUUID(),
  b: randomUUID(),
  la: randomUUID(),
  lb: randomUUID(),
};
let ha: string, hb: string;
const owner = randomUUID();
const slots = planMath(null, '2026-10-20T10:00:00Z', 42);
const header = reserveHeader(['romfart']);
const missions = slots.map((slot) => reserveMission(slot, header.setting));
const json = JSON.stringify;

async function value<T>(sql: string, args: unknown[] = []): Promise<T> {
  return (await db.query<{ result: T }>(sql, args)).rows[0].result;
}
async function asUser(id: string, role = 'authenticated') {
  await db.exec(
    `reset role; set request.jwt.claim.sub='${id}'; set role ${role};`,
  );
}
const begin = (
  parent: string | null = null,
  key = randomUUID(),
  learner = ids.la,
  household = ha,
) =>
  value<string>('select public.begin_free_story($1,$2,$3,$4,$5,$6,$7) result', [
    learner,
    household,
    parent,
    key,
    json(['romfart']),
    json({ previousSummary: '', currentPreview: 'Lyset venter.' }),
    json(slots),
  ]);
const claim = (id: string, by = owner) =>
  value<boolean>('select public.claim_free_story($1,$2) result', [id, by]);
const reserve = (id: string, phase = 'generate', ceiling = 0.6, by = owner) =>
  value<string | null>(
    'select public.begin_free_story_call($1,$2,$3,$4,100) result',
    [id, by, phase, ceiling],
  );
const usage = (known = true, cost = 0.1) => ({
  purpose: 'free-story-generate',
  model: 'fixture',
  input_tokens: 10,
  output_tokens: 20,
  cost_estimate: cost,
  latency_ms: 100,
  ok: true,
  usage_known: known,
  environment: 'test',
  pricing_version: 'fixture',
});
const finish = (
  id: string,
  call: string | null,
  phase = 'generate',
  known = true,
  cost = 0.1,
  by = owner,
) =>
  value<boolean>(
    'select public.finish_free_story_call($1,$2,$3,$4,$5) result',
    [id, by, phase, call, json(usage(known, cost))],
  );
const publish = (
  id: string,
  prefix: ApprovedMission[],
  done = false,
  expired = false,
  h: StoryHeader = header,
  by: string | null = owner,
) =>
  value<boolean>('select public.publish_free_story($1,$2,$3,$4,$5,$6) result', [
    id,
    by,
    json(h),
    json(prefix),
    done,
    expired,
  ]);
async function saved(id: string) {
  return (
    await db.query<{
      status: string;
      spent: string;
      owner: string | null;
      header: StoryHeader;
      missions: ApprovedMission[];
      calls: Record<string, { id: string; state: string }>;
      completed: boolean;
    }>('select * from public.free_story_chapters where id=$1', [id])
  ).rows[0];
}
async function expire(id: string) {
  await db.query(
    "update public.free_story_chapters set deadline=now()-interval '1 second' where id=$1",
    [id],
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  for (const [user, learner] of [
    [ids.a, ids.la],
    [ids.b, ids.lb],
  ]) {
    await db.exec('reset role');
    await db.query('insert into auth.users values($1)', [user]);
    await asUser(user);
    const household = await value<string>(
      'select public.ensure_household() result',
    );
    await db.query(
      "insert into public.learners(id,household_id,first_name) values($1,$2,'Leo')",
      [learner, household],
    );
    if (user === ids.a) ha = household;
    else hb = household;
  }
  await db.exec('reset role; set role service_role');
}, 30_000);
beforeEach(async () => {
  await db.exec('reset role; set role service_role');
});
afterAll(async () => {
  await db?.close();
});

describe('free-story PostgreSQL storage contracts', () => {
  it('restricts all free-story RPCs and raw chapter storage to service_role despite hosted grants', async () => {
    const functions = (
      await db.query<{
        proname: string;
        anon: boolean;
        authenticated: boolean;
        service: boolean;
      }>(`select proname,
      has_function_privilege('anon',p.oid,'execute') anon,
      has_function_privilege('authenticated',p.oid,'execute') authenticated,
      has_function_privilege('service_role',p.oid,'execute') service
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and proname in ('begin_free_story','claim_free_story','begin_free_story_call','finish_free_story_call','publish_free_story','commit_free_story_turn','start_free_story_session')`)
    ).rows;
    expect(functions).toHaveLength(7);
    expect(
      functions.every((f) => !f.anon && !f.authenticated && f.service),
    ).toBe(true);
    expect(
      await value<boolean>(
        "select relrowsecurity result from pg_class where oid='public.free_story_chapters'::regclass",
      ),
    ).toBe(true);
    for (const role of ['anon', 'authenticated']) {
      await asUser(ids.a, role);
      await expect(
        db.query('select * from public.free_story_chapters'),
      ).rejects.toThrow('permission denied');
      await expect(claim(randomUUID())).rejects.toThrow('permission denied');
      await expect(begin()).rejects.toThrow('permission denied');
    }
  });

  it('keeps the same learner/parent/interest identity and original math snapshot across duplicate starts', async () => {
    const key = randomUUID(),
      id = await begin(null, key);
    const second = await value<string>(
      'select public.begin_free_story($1,$2,null,$3,$4,$5,$6) result',
      [
        ids.la,
        ha,
        key,
        json(['changed']),
        json({
          previousSummary: 'A different request must not replace the snapshot.',
        }),
        json([...slots].reverse()),
      ],
    );
    expect(second).toBe(id);
    const rows = (
      await db.query<{ slots: unknown; interests: unknown }>(
        'select slots,interests from public.free_story_chapters where id=$1',
        [id],
      )
    ).rows;
    expect(rows).toEqual([{ slots, interests: ['romfart'] }]);
    expect(await begin(null, randomUUID())).not.toBe(id);
  });

  it('creates one separate next chapter while current is unfinished, preserving current progress', async () => {
    const key = randomUUID(),
      current = await begin(null, key);
    expect(await claim(current)).toBe(true);
    expect(await publish(current, missions.slice(0, 14))).toBe(true);
    const next = await begin(current, key);
    expect(next).not.toBe(current);
    expect(await begin(current, key)).toBe(next);
    expect((await saved(current)).missions).toEqual(missions.slice(0, 14));
    expect((await saved(next)).missions).toEqual([]);
    expect((await saved(current)).completed).toBe(false);
    expect(await claim(next, randomUUID())).toBe(true);
  });

  it('rejects another household learner and a previous chapter belonging to another learner', async () => {
    const parent = await begin();
    await expect(begin(null, randomUUID(), ids.lb, ha)).rejects.toThrow(
      'Learner unavailable',
    );
    await expect(begin(parent, randomUUID(), ids.lb, hb)).rejects.toThrow(
      'Invalid previous chapter',
    );
    await expect(
      db.query(
        `insert into public.free_story_chapters(learner_id,household_id,interest_key,interests,context,slots)
      values($1,$2,'foreign','[]','{}',$3)`,
        [ids.la, hb, json(slots)],
      ),
    ).rejects.toThrow('foreign key');
  });

  it('allows exactly one claim and does not transfer ownership on retry', async () => {
    const id = await begin(),
      other = randomUUID();
    expect(await claim(id)).toBe(true);
    expect(await claim(id)).toBe(false);
    expect(await claim(id, other)).toBe(false);
    expect((await saved(id)).owner).toBe(owner);
    expect(await reserve(id, 'generate', 0.6, other)).toBeNull();
    expect(
      await publish(id, missions.slice(0, 1), false, false, header, other),
    ).toBe(false);
  });

  it('never purchases the same phase twice, including pending, completed and unknown calls', async () => {
    for (const state of ['pending', 'completed', 'unknown']) {
      const id = await begin();
      await claim(id);
      const call = await reserve(id);
      expect(call).not.toBeNull();
      if (state !== 'pending')
        expect(await finish(id, call!, 'generate', state === 'completed')).toBe(
          true,
        );
      expect(await reserve(id)).toBeNull();
      expect((await saved(id)).calls.generate.state).toBe(state);
    }
  });

  it('requires generation before repair and permits at most one repair', async () => {
    const id = await begin();
    await claim(id);
    expect(await reserve(id, 'critic', 0.1)).toBeNull();
    expect(await reserve(id, 'repair', 0.1)).toBeNull();
    const first = await reserve(id, 'generate', 0.6);
    expect(first).not.toBeNull();
    expect(await finish(id, first!, 'generate', true, 0.2)).toBe(true);
    const repair = await reserve(id, 'repair', 0.3);
    expect(repair).not.toBeNull();
    expect(await finish(id, repair!, 'repair', true, 0.1)).toBe(true);
    expect(await reserve(id, 'repair', 0.1)).toBeNull();
    expect(await finish(id, repair!, 'repair', true, 0)).toBe(false);
    expect(Number((await saved(id)).spent)).toBeCloseTo(0.3);
  });

  it('keeps unknown generation fully charged against both chapter and household caps', async () => {
    const id = await begin();
    await claim(id);
    const before = await value<{ spent: number }>(
      'select public.budget_status($1,100) result',
      [ha],
    );
    const first = await reserve(id, 'generate', 0.7);
    expect(first).not.toBeNull();
    expect(await finish(id, first!, 'generate', false, 0)).toBe(true);
    expect(Number((await saved(id)).spent)).toBeCloseTo(0.7);
    expect(await finish(id, first!, 'generate', true, 0)).toBe(false);
    expect(await reserve(id, 'generate', 0.01)).toBeNull();
    expect(await reserve(id, 'repair', 0.300001)).toBeNull();
    const repair = await reserve(id, 'repair', 0.3);
    expect(repair).not.toBeNull();
    expect(Number((await saved(id)).spent)).toBe(1);
    expect(await finish(id, repair!, 'repair', false, 0)).toBe(true);
    const after = await value<{ spent: number }>(
      'select public.budget_status($1,100) result',
      [ha],
    );
    expect(after.spent - before.spent).toBeCloseTo(1);
    expect((await saved(id)).calls.generate.state).toBe('unknown');
    expect(
      (
        await db.query(
          'select id from public.ai_reservations where id=any($1::uuid[]) and settled',
          [[first, repair]],
        )
      ).rows,
    ).toHaveLength(2);
  });

  it('leaves no phase journal or chapter charge when the household budget rejects a reservation', async () => {
    const id = await begin();
    await claim(id);
    expect(
      await value(
        "select public.begin_free_story_call($1,$2,'generate',0.6,0) result",
        [id, owner],
      ),
    ).toBeNull();
    expect((await saved(id)).calls).toEqual({});
    expect(Number((await saved(id)).spent)).toBe(0);
  });

  it('preserves published header and missions while appending, and rejects shrinking or early completion', async () => {
    const id = await begin();
    await claim(id);
    expect(await publish(id, missions.slice(0, 1))).toBe(true);
    expect(await publish(id, [], false)).toBe(false);
    expect(await publish(id, missions.slice(0, 2), true)).toBe(false);
    expect(
      await publish(id, missions.slice(0, 2), false, false, {
        ...header,
        opening: 'Changed.',
      }),
    ).toBe(false);
    const changed = structuredClone(missions.slice(0, 2));
    changed[0].text = 'Changed.';
    expect(await publish(id, changed)).toBe(false);
    expect(await publish(id, missions.slice(0, 2))).toBe(true);
    expect((await saved(id)).missions).toEqual(missions.slice(0, 2));
    expect(await publish(id, [...missions, missions[0]], true)).toBe(false);
    expect(await publish(id, missions, true)).toBe(true);
    expect(await publish(id, missions, true)).toBe(false);
  });

  it.each([false, true])(
    'lets an expired reader finish an abandoned chapter (claimed=%s) without AI or prefix replacement',
    async (claimed) => {
      const id = await begin();
      if (claimed) {
        await claim(id);
        await publish(id, missions.slice(0, 3));
      }
      expect(
        await publish(id, missions, true, true, header, claimed ? owner : null),
      ).toBe(false);
      await expire(id);
      expect(await claim(id)).toBe(false);
      expect(await reserve(id)).toBeNull();
      expect(
        await publish(id, missions, true, true, header, claimed ? owner : null),
      ).toBe(true);
      const chapter = await saved(id);
      expect(chapter.status).toBe('done');
      expect(chapter.missions).toEqual(missions);
      expect(chapter.calls).toEqual({});
      expect(await publish(id, missions, true)).toBe(false);
      const total = (
        await db.query<{
          purpose: string;
          cost_estimate: number;
          chapter_cost_nok: string;
        }>(
          'select purpose,cost_estimate,chapter_cost_nok from public.ai_calls where free_chapter_id=$1',
          [id],
        )
      ).rows;
      expect(total).toEqual([
        { purpose: 'chapter-total', cost_estimate: 0, chapter_cost_nok: '0' },
      ]);
    },
  );

  it('accepts late usage settlement after fallback completion and updates its aggregate without double counting', async () => {
    const id = await begin();
    await claim(id);
    const first = await reserve(id, 'generate', 0.6);
    expect(first).not.toBeNull();
    await expire(id);
    expect(await publish(id, missions, true, true)).toBe(true);
    expect(await finish(id, first!, 'generate', true, 0.2)).toBe(true);
    expect(Number((await saved(id)).spent)).toBeCloseTo(0.2);
    const total = (
      await db.query<{ cost_estimate: number; chapter_cost_nok: string }>(
        "select cost_estimate,chapter_cost_nok from public.ai_calls where id=$1 and purpose='chapter-total'",
        [id],
      )
    ).rows[0];
    expect(total.cost_estimate).toBe(0);
    expect(Number(total.chapter_cost_nok)).toBeCloseTo(0.2);
    expect(await finish(id, first!, 'generate', true, 0)).toBe(false);
  });

  it('commits session revision and chapter completion atomically, rejecting stale and foreign references', async () => {
    const id = await begin(),
      foreign = await begin(null, randomUUID(), ids.lb, hb);
    await claim(id);
    await publish(id, missions, true);
    const session = randomUUID();
    await db.query(
      'insert into public.sessions(id,learner_id,ended_at) values($1,$2,now())',
      [session, ids.la],
    );
    const state = (revision: number, index: number, chapter = id) => ({
      id: session,
      revision,
      endedAt: new Date().toISOString(),
      states: {},
      cards: {},
      parts: [],
      bandit: {},
      history: [],
      freeChapter: { id: chapter, index, failures: 0 },
    });
    const events = {
      items: [],
      attempts: [],
      messages: [],
      tools: [],
      flags: [],
      masterTests: [],
      misconceptions: [],
      schoolTopics: [],
    };
    const commit = (
      revision: number,
      next: ReturnType<typeof state>,
      learner = ids.la,
    ) =>
      value<boolean>(
        'select public.commit_free_story_turn($1,$2,$3,$4,$5) result',
        [session, learner, revision, json(next), json(events)],
      );
    expect(await commit(0, state(1, 20, foreign))).toBe(false);
    expect(await commit(0, state(1, 20), ids.lb)).toBe(false);
    expect(await commit(0, state(1, 19))).toBe(true);
    expect((await saved(id)).completed).toBe(false);
    expect(await commit(0, state(1, 20))).toBe(false);
    expect((await saved(id)).completed).toBe(false);
    expect(await commit(1, state(2, 20))).toBe(true);
    expect((await saved(id)).completed).toBe(true);
    expect(await commit(1, state(2, 20))).toBe(false);
    expect(
      await value('select revision result from public.sessions where id=$1', [
        session,
      ]),
    ).toBe(2);
  });

  it('rejects missing journal phases during settlement without releasing existing reservations', async () => {
    const id = await begin();
    await claim(id);
    const first = await reserve(id, 'generate', 0.6);
    expect(first).not.toBeNull();
    expect(await finish(id, randomUUID(), 'missing', true, 0.1)).toBe(false);
    expect(await finish(id, null, 'generate', true, 0.1)).toBe(false);
    expect(Number((await saved(id)).spent)).toBeCloseTo(0.6);
    expect((await saved(id)).calls.generate.state).toBe('pending');
  });
  it('rolls back the session when its initial item fails, then starts successfully with the same identity', async () => {
    const id = await begin();
    await claim(id);
    await publish(id, missions, true);
    const chapter = await value<FreeChapter>(
      'select to_jsonb(c) result from public.free_story_chapters c where id=$1',
      [id],
    );
    const profile: LearnerProfile = {
      id: ids.la,
      householdId: ha,
      firstName: 'Leo',
      tutorName: 'Lumi',
      grade: 4,
      avatar: 'spire',
      settings: {},
    };
    const { state, events } = startStorySession(
      chapter,
      profile,
      null,
      new Date().toISOString(),
      0,
    );
    expect(events.items).toHaveLength(1);
    const badEvents = structuredClone(events);
    badEvents.items[0].difficulty = 99;
    const start = (payload = events) =>
      value<boolean>(
        'select public.start_free_story_session($1,$2,$3) result',
        [ids.la, json(state), json(payload)],
      );
    await expect(start(badEvents)).rejects.toThrow();
    expect(
      (await db.query('select id from public.sessions where id=$1', [state.id]))
        .rows,
    ).toEqual([]);
    expect(
      (
        await db.query('select id from public.items where id=$1', [
          state.active!.id,
        ])
      ).rows,
    ).toEqual([]);
    expect(await start()).toBe(true);
    expect(
      await value('select revision result from public.sessions where id=$1', [
        state.id,
      ]),
    ).toBe(1);
    expect(
      (
        await db.query('select id from public.items where id=$1', [
          state.active!.id,
        ])
      ).rows,
    ).toEqual([{ id: state.active!.id }]);
    await db.query('update public.sessions set ended_at=now() where id=$1', [
      state.id,
    ]);
  });

  it('atomically starts revision one with its item and commits the real engine first answer exactly once', async () => {
    const id = await begin();
    await claim(id);
    await publish(id, missions, true);
    const chapter = await value<FreeChapter>(
      'select to_jsonb(c) result from public.free_story_chapters c where id=$1',
      [id],
    );
    const profile: LearnerProfile = {
      id: ids.la,
      householdId: ha,
      firstName: 'Leo',
      tutorName: 'Lumi',
      grade: 4,
      avatar: 'spire',
      settings: {},
    };
    const now = new Date().toISOString();
    const { state, events } = startStorySession(chapter, profile, null, now, 0);
    expect(
      await value('select public.start_free_story_session($1,$2,$3) result', [
        ids.la,
        json(state),
        json(events),
      ]),
    ).toBe(true);
    const persisted = await value<StorySession>(
      'select engine_state result from public.sessions where id=$1',
      [state.id],
    );
    expect(persisted.revision).toBe(1);
    expect(persisted.active!.id).toBe(state.active!.id);
    expect(
      await value('select validated result from public.items where id=$1', [
        state.active!.id,
      ]),
    ).toBe(true);
    const requestId = randomUUID();
    const answer = await storyTurn(
      chapter,
      persisted,
      { type: 'answer', answer: chapter.slots[0].item.answer },
      requestId,
      now,
      profile,
    );
    expect(answer.state.correct).toBe(true);
    expect(answer.events.attempts).toHaveLength(1);
    const args = [state.id, ids.la, 1, json(answer.state), json(answer.events)];
    expect(
      await value(
        'select public.commit_free_story_turn($1,$2,$3,$4,$5) result',
        args,
      ),
    ).toBe(true);
    expect(
      await value(
        'select public.commit_free_story_turn($1,$2,$3,$4,$5) result',
        args,
      ),
    ).toBe(false);
    expect(
      await value('select revision result from public.sessions where id=$1', [
        state.id,
      ]),
    ).toBe(2);
    const attempts = (
      await db.query<{
        item_id: string;
        correct: boolean;
        hint_level_used: number;
      }>(
        'select item_id,correct,hint_level_used from public.attempts where session_id=$1',
        [state.id],
      )
    ).rows;
    expect(attempts).toEqual([
      { item_id: state.active!.id, correct: true, hint_level_used: 0 },
    ]);
    expect((await saved(id)).completed).toBe(false);
    await db.query('update public.sessions set ended_at=now() where id=$1', [
      state.id,
    ]);
  });
});
