import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
let db: PGlite;
const ids = {
  a: '00000000-0000-4000-8000-000000000001',
  b: '00000000-0000-4000-8000-000000000002',
  la: '00000000-0000-4000-8000-000000000011',
  lb: '00000000-0000-4000-8000-000000000012',
};
async function asUser(id: string) {
  await db.exec(
    `reset role; set request.jwt.claim.sub='${id}'; set role authenticated;`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`,
  );
  for (const file of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  await db.exec(`insert into auth.users values ('${ids.a}'),('${ids.b}');`);
  for (const [user, learner] of [
    [ids.a, ids.la],
    [ids.b, ids.lb],
  ]) {
    await asUser(user);
    const { rows } = await db.query<{ h: string }>(
      'select public.ensure_household() as h',
    );
    await db.query(
      'insert into public.learners(id,household_id,first_name) values($1,$2,$3)',
      [learner, rows[0].h, 'Leo'],
    );
  }
  await db.exec('reset role');
  await db.exec(
    `insert into public.sessions(id,learner_id) values ('00000000-0000-4000-8000-000000000021','${ids.la}'),('00000000-0000-4000-8000-000000000022','${ids.lb}'); insert into public.parent_secrets(parent_id,pin_hash) values ('${ids.a}','test');`,
  );
});
afterAll(async () => {
  await db.close();
});
describe('PostgreSQL RLS', () => {
  it('is enabled on every application table', async () => {
    await db.exec('reset role');
    const { rows } = await db.query<{ relname: string }>(
      "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
    );
    expect(rows).toEqual([]);
  });
  it('bootstrap is idempotent and anonymous access is rejected', async () => {
    await asUser(ids.a);
    const first = await db.query('select public.ensure_household()');
    expect(await db.query('select public.ensure_household()')).toEqual(first);
    await db.exec("reset role;set request.jwt.claim.sub='';set role anon;");
    await expect(
      db.query('select public.ensure_household()'),
    ).rejects.toThrow();
    await expect(db.query('select * from public.learners')).rejects.toThrow();
  });
  it('isolates reads in both directions, including nested session data', async () => {
    for (const [user, own] of [
      [ids.a, ids.la],
      [ids.b, ids.lb],
    ]) {
      await asUser(user);
      expect(
        (
          await db.query<{ id: string }>('select id from public.learners')
        ).rows.map((r) => r.id),
      ).toEqual([own]);
      expect(
        (
          await db.query<{ learner_id: string }>(
            'select learner_id from public.sessions',
          )
        ).rows.map((r) => r.learner_id),
      ).toEqual([own]);
      expect(
        (await db.query('select * from public.parents')).rows,
      ).toHaveLength(1);
    }
  });
  it('blocks inserts in another household, moves and cross-family updates/deletes', async () => {
    await db.exec('reset role');
    const { rows } = await db.query<{ household_id: string }>(
      'select household_id from public.learners where id=$1',
      [ids.lb],
    );
    await asUser(ids.a);
    await expect(
      db.query(
        "insert into public.learners(household_id,first_name) values($1,'Other')",
        [rows[0].household_id],
      ),
    ).rejects.toThrow();
    await expect(
      db.query('update public.learners set household_id=$1 where id=$2', [
        rows[0].household_id,
        ids.la,
      ]),
    ).rejects.toThrow();
    expect(
      (
        await db.query(
          "update public.learners set first_name='Wrong' where id=$1 returning id",
          [ids.lb],
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await db.query('delete from public.learners where id=$1 returning id', [
          ids.lb,
        ])
      ).rows,
    ).toEqual([]);
  });
  it('rejects cross-household foreign keys even for server writes', async () => {
    await db.exec('reset role');
    const { rows } = await db.query<{ household_id: string }>(
      'select household_id from public.learners where id=$1',
      [ids.la],
    );
    await expect(
      db.query(
        'insert into public.devices(id,parent_id,learner_id,household_id) values(gen_random_uuid(),$1,$2,$3)',
        [ids.a, ids.lb, rows[0].household_id],
      ),
    ).rejects.toThrow();
  });
  it('hides PINs and prevents client-authored mastery, awards and device locks', async () => {
    await asUser(ids.a);
    for (const table of ['parent_secrets', 'tts_cache'])
      await expect(db.query(`select * from public.${table}`)).rejects.toThrow();
    for (const table of [
      'devices',
      'skill_states',
      'medallion_progress',
      'attempts',
      'ai_calls',
    ])
      await expect(db.query(`delete from public.${table}`)).rejects.toThrow();
    await expect(
      db.query('select public.record_pin_attempt($1,true)', [ids.a]),
    ).rejects.toThrow();
  });
  it('PIN rate limit cannot be bypassed by a correct sixth attempt', async () => {
    await db.exec('reset role; set role service_role;');
    for (let i = 0; i < 5; i++)
      expect(
        (
          await db.query<{ ok: boolean }>(
            'select public.record_pin_attempt($1,false) ok',
            [ids.a],
          )
        ).rows[0].ok,
      ).toBe(false);
    expect(
      (
        await db.query<{ ok: boolean }>(
          'select public.record_pin_attempt($1,true) ok',
          [ids.a],
        )
      ).rows[0].ok,
    ).toBe(false);
    await db.exec('reset role');
    await db.query(
      "update public.parent_secrets set locked_until=now()-interval '1 second' where parent_id=$1",
      [ids.a],
    );
    await db.exec('set role service_role');
    expect(
      (
        await db.query<{ ok: boolean }>(
          'select public.record_pin_attempt($1,true) ok',
          [ids.a],
        )
      ).rows[0].ok,
    ).toBe(true);
  });
});
