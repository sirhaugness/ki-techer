import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
let db: PGlite;
const h = randomUUID(),
  learner = randomUUID(),
  otherH = randomUUID(),
  otherL = randomUUID(),
  parent = randomUUID();
const interest = JSON.stringify({ key: 'dyr', label: 'Dyr' });
async function value<T>(sql: string, args: unknown[] = []): Promise<T> {
  const r = await db.query<{ v: T }>(sql, args);
  return r.rows[0].v;
}
const begin = (
  request = randomUUID(),
  label = interest,
  l = learner,
  house = h,
) =>
  value<string>("select public.begin_chapter($1,$2,$3,10,'model',$4) v", [
    l,
    house,
    label,
    request,
  ]);
const claim = (job: string, owner: string) =>
  value<boolean>("select public.claim_chapter($1,$2,'run-test') v", [
    job,
    owner,
  ]);
const call = (job: string, owner: string, id = randomUUID()) =>
  value<{
    fresh: boolean;
    call: { id: string; state: string; result: unknown };
  }>("select public.begin_chapter_call($1,$2,'research',$3) v", [
    job,
    owner,
    id,
  ]);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;",
  );
  for (const f of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(readFileSync('supabase/migrations/' + f, 'utf8'));
  await db.query('insert into auth.users values($1)', [parent]);
  await db.query('insert into public.households(id) values($1),($2)', [
    h,
    otherH,
  ]);
  await db.query('insert into public.parents(id,household_id) values($1,$2)', [
    parent,
    h,
  ]);
  await db.query(
    "insert into public.learners(id,household_id,first_name) values($1,$2,'Test'),($3,$4,'Other')",
    [learner, h, otherL, otherH],
  );
});
afterAll(async () => {
  await db.close();
});
describe('R3 authoritative database boundaries', () => {
  it('keeps start requests idempotent even after a completed chapter', async () => {
    const request = randomUUID(),
      alias = randomUUID(),
      job = await begin(request);
    expect(await begin(alias)).toBe(job);
    expect(
      await value<number>(
        'select count(*)::int v from public.chapter_play_times',
      ),
    ).toBe(0);
    await db.query(
      'update public.chapter_jobs set play_done=true where id=$1',
      [job],
    );
    const next = await begin();
    expect(next).not.toBe(job);
    expect(await begin(request)).toBe(job);
    expect(await begin(alias)).toBe(job);
    await expect(begin(randomUUID(), interest, otherL, h)).rejects.toThrow(
      'Learner unavailable',
    );
  });
  it('replays a stable claim after a lost response, fences expired owners and preserves checkpoints', async () => {
    const job = await begin(),
      a = randomUUID(),
      b = randomUUID();
    expect(await claim(job, a)).toBe(true);
    expect(await claim(job, a)).toBe(true);
    expect(await claim(job, b)).toBe(false);
    await db.query(
      "update public.chapter_jobs set lease_until=now()-interval '1 second' where id=$1",
      [job],
    );
    expect(await claim(job, b)).toBe(true);
    expect(
      await value<boolean>(
        "select public.checkpoint_chapter($1,$2,'research','draft','{\"cached\":true}') v",
        [job, a],
      ),
    ).toBe(false);
    expect(
      await value<boolean>(
        "select public.checkpoint_chapter($1,$2,'research','draft','{\"cached\":true}') v",
        [job, b],
      ),
    ).toBe(true);
    expect(
      await value<string>(
        "select data->>'cached' v from public.chapter_jobs where id=$1",
        [job],
      ),
    ).toBe('true');
    await db.query(
      'update public.chapter_jobs set play_done=true where id=$1',
      [job],
    );
  });
  it('never allocates a second paid attempt for an existing pending phase', async () => {
    const job = await begin(),
      owner = randomUUID();
    await claim(job, owner);
    const first = await call(job, owner);
    expect(first.fresh).toBe(true);
    const again = await call(job, owner);
    expect(again.fresh).toBe(false);
    expect(again.call.id).toBe(first.call.id);
    expect(again.call.state).toBe('pending');
    expect(
      await value<boolean>('select public.reserve_ai_budget($1,$2,0.5,10) v', [
        h,
        first.call.id,
      ]),
    ).toBe(true);
    expect(
      await value<boolean>('select public.reserve_ai_budget($1,$2,0.5,10) v', [
        h,
        first.call.id,
      ]),
    ).toBe(false);
    await value(
      "select public.fail_chapter($1,$2,'unknown','provider_outcome_unknown') v",
      [job, owner],
    );
    expect(
      await value<boolean>('select public.resume_chapter($1,$2) v', [
        job,
        owner,
      ]),
    ).toBe(false);
    await db.query(
      'update public.chapter_jobs set play_done=true where id=$1',
      [job],
    );
  });
  it('resumes a lost checkpoint using the cached response without another call', async () => {
    const job = await begin(),
      owner = randomUUID();
    await claim(job, owner);
    const first = await call(job, owner);
    expect(
      await value<boolean>(
        "select public.finish_chapter_call($1,$2,$3,'completed','{\"sources\":[]}','{}') v",
        [job, owner, first.call.id],
      ),
    ).toBe(true);
    await value(
      "select public.fail_chapter($1,$2,'failed','checkpoint_unavailable') v",
      [job, owner],
    );
    expect(
      await value<boolean>('select public.resume_chapter($1,$2) v', [
        job,
        owner,
      ]),
    ).toBe(true);
    await claim(job, owner);
    const cached = await call(job, owner);
    expect(cached.fresh).toBe(false);
    expect(cached.call.result).toEqual({ sources: [] });
    await db.query(
      'update public.chapter_jobs set play_done=true where id=$1',
      [job],
    );
  });
  it('can retry a refused budget reservation while retaining the same attempt identity', async () => {
    const job = await begin(),
      owner = randomUUID();
    await claim(job, owner);
    const first = await call(job, owner);
    await value(
      "select public.finish_chapter_call($1,$2,$3,'budget','null','null') v",
      [job, owner, first.call.id],
    );
    await value(
      "select public.fail_chapter($1,$2,'budget','budget_exhausted') v",
      [job, owner],
    );
    expect(
      await value<boolean>('select public.resume_chapter($1,$2) v', [
        job,
        owner,
      ]),
    ).toBe(true);
    const newOwner = randomUUID();
    expect(await claim(job, newOwner)).toBe(true);
    const retry = await call(job, newOwner);
    expect(retry.fresh).toBe(true);
    expect(retry.call.id).toBe(first.call.id);
    await db.query(
      'update public.chapter_jobs set play_done=true where id=$1',
      [job],
    );
  });
  it('protects all raw packets and service RPCs from authenticated and anonymous callers', async () => {
    await db.exec(
      `set request.jwt.claim.sub='${parent}';set role authenticated;`,
    );
    for (const table of [
      'chapter_sagas',
      'chapter_jobs',
      'chapter_calls',
      'chapter_requests',
      'chapter_play_times',
    ])
      await expect(db.query('select * from public.' + table)).rejects.toThrow();
    await expect(begin()).rejects.toThrow();
    await db.exec('reset role;set role anon;');
    await expect(begin()).rejects.toThrow();
    await db.exec('reset role;');
  });
  it('prevents simultaneous clocks in the old and new player', async () => {
    const job = await begin();
    await db.query("update public.chapter_jobs set state='ready' where id=$1", [
      job,
    ]);
    await db.query(
      'insert into public.chapter_play_times(job_id,household_id,learner_id,planned_minutes) values($1,$2,$3,15)',
      [job, h, learner],
    );
    await expect(
      db.query('insert into public.sessions(learner_id) values($1)', [learner]),
    ).rejects.toThrow('Pause chapter first');
    await db.query(
      'update public.chapter_play_times set ended_at=now() where learner_id=$1',
      [learner],
    );
    await db.query('insert into public.sessions(learner_id) values($1)', [
      learner,
    ]);
    await expect(
      db.query(
        'insert into public.chapter_play_times(job_id,household_id,learner_id,planned_minutes) values($1,$2,$3,15)',
        [job, h, learner],
      ),
    ).rejects.toThrow('End learning session first');
  });
  it('exports new chapter data and deletes it through the existing household clear', async () => {
    const exported = await value<Record<string, unknown>>(
      'select public.export_household($1) v',
      [h],
    );
    expect(exported.chapter_jobs).toBeInstanceOf(Array);
    expect(exported.chapter_requests).toBeInstanceOf(Array);
    await db.query(
      'update public.households set clearing_data=true where id=$1',
      [h],
    );
    await value('select public.clear_app_data($1) v', [h]);
    expect(
      await value<number>(
        'select count(*)::int v from public.chapter_jobs where household_id=$1',
        [h],
      ),
    ).toBe(0);
    expect(
      await value<number>(
        'select count(*)::int v from public.chapter_calls where household_id=$1',
        [h],
      ),
    ).toBe(0);
  });
});
