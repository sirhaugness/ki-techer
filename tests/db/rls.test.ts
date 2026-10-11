import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSession, learningTurn } from '../../lib/learning/session';
import { randomUUID } from 'node:crypto';
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
  it('commits evidence atomically, rejects stale revisions and hides the RPC from clients', async () => {
    await db.exec('reset role');
    const profile = {
      id: ids.la,
      householdId: ids.a,
      firstName: 'Leo',
      tutorName: 'Lumi',
      grade: 4,
      avatar: 'spire',
      settings: {},
    };
    const now = '2026-10-11T10:00:00.000Z',
      state = createSession(profile, null, now, 0, 'practice', null);
    state.id = '00000000-0000-4000-8000-000000000021';
    const next = await learningTurn(
      state,
      { type: 'next' },
      randomUUID(),
      now,
      profile,
      [],
      null,
      'Bokmål',
    );
    const args = [
      state.id,
      ids.la,
      0,
      JSON.stringify(next.state),
      JSON.stringify(next.events),
    ];
    const query = 'select public.commit_learning_turn($1,$2,$3,$4,$5) ok';
    await asUser(ids.a);
    await expect(db.query(query, args)).rejects.toThrow();
    await db.exec('reset role;set role service_role');
    expect((await db.query<{ ok: boolean }>(query, args)).rows[0].ok).toBe(
      true,
    );
    expect((await db.query<{ ok: boolean }>(query, args)).rows[0].ok).toBe(
      false,
    );
    const attempt = await learningTurn(
      next.state,
      {
        type: 'answer',
        itemId: next.state.active!.id,
        answer: next.state.active!.item.answer,
        inputMode: 'tastatur',
      },
      randomUUID(),
      now,
      profile,
      [],
      null,
      'Bokmål',
    );
    expect(
      (
        await db.query<{ ok: boolean }>(query, [
          state.id,
          ids.la,
          1,
          JSON.stringify(attempt.state),
          JSON.stringify(attempt.events),
        ])
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (
        await db.query<{ n: number }>(
          'select count(*)::int n from public.attempts where learner_id=$1',
          [ids.la],
        )
      ).rows[0].n,
    ).toBe(1);
    const bad = structuredClone(attempt.events);
    bad.attempts[0].id = randomUUID();
    bad.attempts[0].item_id = randomUUID();
    bad.messages.push({
      id: randomUUID(),
      role: 'lærer',
      text: 'Dette skal rulles tilbake.',
      meta: {},
    });
    const updated = { ...attempt.state, revision: 3 };
    await expect(
      db.query(query, [
        state.id,
        ids.la,
        2,
        JSON.stringify(updated),
        JSON.stringify(bad),
      ]),
    ).rejects.toThrow();
    expect(
      (
        await db.query<{ revision: number }>(
          'select revision from public.sessions where id=$1',
          [state.id],
        )
      ).rows[0].revision,
    ).toBe(2);
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.messages where text='Dette skal rulles tilbake.'",
        )
      ).rows[0].n,
    ).toBe(0);
    await db.exec('reset role');
  });
  it('reflection merges new evidence once, protects parent decisions and limits active observations', async () => {
    await db.exec('reset role');
    const obs = randomUUID(),
      locked = randomUUID(),
      rejected = randomUUID();
    for (const [id, status] of [
      [obs, 'aktiv'],
      [locked, 'låst'],
      [rejected, 'avvist'],
    ])
      await db.query(
        "insert into public.learner_profile_observations(id,learner_id,category,text,status,updated_by) values($1,$2,'skolemetode',$3,$4,'forelder')",
        [id, ids.la, id, status],
      );
    const call = 'select public.commit_reflection($1,$2,$3) ok';
    for (let n = 0; n < 4; n++) {
      const session = randomUUID();
      await db.query(
        'insert into public.sessions(id,learner_id,ended_at) values($1,$2,now())',
        [session, ids.la],
      );
      const operations = [obs, locked, rejected].map((id) => ({
        op: n < 2 ? 'styrk' : 'arkiver',
        observation_id: id,
        category: 'skolemetode',
        text: 'Metode',
        evidence_session_id: session,
        confidence_delta: 1,
      }));
      const result = JSON.stringify({
        operations,
        summary: 'Øvd på matte.',
        suggestions: [],
      });
      await asUser(ids.a);
      await expect(db.query(call, [session, ids.la, result])).rejects.toThrow();
      await db.exec('reset role; set role service_role');
      expect(
        (await db.query<{ ok: boolean }>(call, [session, ids.lb, result]))
          .rows[0].ok,
      ).toBe(false);
      expect(
        (await db.query<{ ok: boolean }>(call, [session, ids.la, result]))
          .rows[0].ok,
      ).toBe(true);
      expect(
        (await db.query<{ ok: boolean }>(call, [session, ids.la, result]))
          .rows[0].ok,
      ).toBe(false);
    }
    const { rows } = await db.query<{
      id: string;
      confidence: number;
      status: string;
    }>(
      'select id,confidence,status from public.learner_profile_observations where id=any($1::uuid[])',
      [[obs, locked, rejected]],
    );
    expect(rows.find((o) => o.id === obs)).toMatchObject({
      confidence: 0.3,
      status: 'aktiv',
    });
    expect(rows.find((o) => o.id === locked)).toMatchObject({
      confidence: 0.4,
      status: 'låst',
    });
    expect(rows.find((o) => o.id === rejected)).toMatchObject({
      confidence: 0.4,
      status: 'avvist',
    });
    await db.exec('reset role');
  });
  it('caps observations at 25, archives below 0.2 and weights interests once per session', async () => {
    await db.exec('reset role');
    await db.query(
      'delete from public.learner_profile_observations where learner_id=$1',
      [ids.la],
    );
    for (let n = 0; n < 25; n++)
      await db.query(
        "insert into public.learner_profile_observations(learner_id,category,text,confidence,updated_by) values($1,'styrke',$2,.2,'system')",
        [ids.la, `Styrke ${n}`],
      );
    const interest = randomUUID(),
      session = randomUUID();
    await db.query(
      "insert into public.interests(id,learner_id,label,source) values($1,$2,'Fotball','leo')",
      [interest, ids.la],
    );
    await db.query(
      "insert into public.sessions(id,learner_id,ended_at,mood_end,engine_state) values($1,$2,now(),'glad',$3)",
      [
        session,
        ids.la,
        JSON.stringify({ usedInterests: [interest, interest] }),
      ],
    );
    const op = {
      op: 'legg_til',
      observation_id: null,
      category: 'styrke',
      text: 'En ekstra',
      evidence_session_id: session,
      confidence_delta: 1,
    };
    await db.exec('set role service_role');
    await db.query('select public.commit_reflection($1,$2,$3)', [
      session,
      ids.la,
      JSON.stringify({ operations: [op], summary: 'Matte', suggestions: [] }),
    ]);
    expect(
      (
        await db.query(
          'select id from public.learner_profile_observations where learner_id=$1',
          [ids.la],
        )
      ).rows,
    ).toHaveLength(25);
    expect(
      (
        await db.query(
          'select times_used,weight,engagement_avg from public.interests where id=$1',
          [interest],
        )
      ).rows[0],
    ).toMatchObject({ times_used: 2, weight: 1.1, engagement_avg: 1 });
    const session2 = randomUUID();
    await db.query(
      'insert into public.sessions(id,learner_id,ended_at) values($1,$2,now())',
      [session2, ids.la],
    );
    const o = (
      await db.query<{ id: string }>(
        'select id from public.learner_profile_observations where learner_id=$1 limit 1',
        [ids.la],
      )
    ).rows[0];
    await db.query('select public.commit_reflection($1,$2,$3)', [
      session2,
      ids.la,
      JSON.stringify({
        operations: [
          {
            ...op,
            op: 'svekk',
            observation_id: o.id,
            evidence_session_id: session2,
          },
        ],
        summary: 'Matte',
        suggestions: [],
      }),
    ]);
    expect(
      (
        await db.query(
          'select status,confidence from public.learner_profile_observations where id=$1',
          [o.id],
        )
      ).rows[0],
    ).toMatchObject({ status: 'arkivert', confidence: 0 });
    await db.exec('reset role');
  });
  it('parent RPCs preserve household isolation and export more than the REST row limit', async () => {
    await db.exec('reset role');
    const session = '00000000-0000-4000-8000-000000000021';
    await db.query(
      "insert into public.messages(session_id,learner_id,role,text) select $1::uuid,$2::uuid,'leo','Eksportert melding '||n from generate_series(1,1005)n",
      [session, ids.la],
    );
    const household = (
      await db.query<{ household_id: string }>(
        'select household_id from public.learners where id=$1',
        [ids.la],
      )
    ).rows[0].household_id;
    for (const user of [ids.a, ids.b]) {
      await asUser(user);
      await expect(
        db.query('select public.export_household($1)', [household]),
      ).rejects.toThrow();
      await expect(
        db.query('select public.parent_dashboard($1,0)', [ids.la]),
      ).rejects.toThrow();
    }
    await db.exec('reset role;set role service_role');
    const exported = (
      await db.query<{ data: Record<string, unknown[]> }>(
        'select public.export_household($1) data',
        [household],
      )
    ).rows[0].data;
    expect(exported.messages.length).toBeGreaterThan(1000);
    expect(exported.learners).toHaveLength(1);
    expect(JSON.stringify(exported)).not.toContain(ids.lb);
    expect(JSON.stringify(exported.pin_settings)).not.toContain('pin_hash');
    expect(
      (
        await db.query<{ data: unknown }>(
          'select public.session_insight($1,$2)data',
          [session, ids.lb],
        )
      ).rows[0].data,
    ).toBe(null);
    await db.exec('reset role');
  });
  it('parent profile edits keep evidence and respect the active cap; old log cleanup keeps mastery', async () => {
    await db.exec('reset role;set role service_role');
    const own = (
      await db.query<{ id: string }>(
        "select id from public.learner_profile_observations where learner_id=$1 and status='aktiv' limit 1",
        [ids.la],
      )
    ).rows[0];
    const edit = 'select public.edit_parent_profile($1,$2,$3,$4,$5) ok';
    expect(
      (
        await db.query<{ ok: boolean }>(edit, [
          ids.lb,
          own.id,
          'styrke',
          'Feil husholdning',
          'låst',
        ])
      ).rows[0].ok,
    ).toBe(false);
    expect(
      (
        await db.query<{ ok: boolean }>(edit, [
          ids.la,
          own.id,
          'skolemetode',
          'Tegner grupper',
          'låst',
        ])
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (
        await db.query<{ status: string; updated_by: string }>(
          'select status,updated_by from public.learner_profile_observations where id=$1',
          [own.id],
        )
      ).rows[0],
    ).toMatchObject({ status: 'låst', updated_by: 'forelder' });
    const oldSession = randomUUID();
    await db.query(
      "insert into public.sessions(id,learner_id,started_at,ended_at,engine_state) values($1,$2,now()-interval '14 months',now()-interval '14 months',$3)",
      [
        oldSession,
        ids.la,
        JSON.stringify({
          version: 1,
          messages: [{ text: 'Gammel tekst' }],
          pendingObservations: [{ text: 'Gammel observasjon' }],
          states: { keep: true },
        }),
      ],
    );
    await db.query(
      "insert into public.messages(session_id,learner_id,role,text,created_at) values($1,$2,'leo','Gammel tekst',now()-interval '14 months')",
      [oldSession, ids.la],
    );
    expect(
      (
        await db.query<{ n: number }>('select public.prune_logs($1,12)n', [
          ids.la,
        ])
      ).rows[0].n,
    ).toBe(1);
    const old = (
      await db.query<{
        engine_state: { messages: unknown[]; states: unknown };
      }>('select engine_state from public.sessions where id=$1', [oldSession])
    ).rows[0];
    expect(old.engine_state.messages).toEqual([]);
    expect(old.engine_state.states).toEqual({ keep: true });
    await expect(
      db.query('select public.prune_logs($1,0)', [ids.la]),
    ).rejects.toThrow();
    await db.exec('reset role');
  });
  it('clearing data removes only the chosen household and rejects stale audio/session writes', async () => {
    await db.exec('reset role;set role service_role');
    const household = (
      await db.query<{ household_id: string }>(
        'select household_id from public.learners where id=$1',
        [ids.la],
      )
    ).rows[0].household_id;
    await db.query('select public.begin_data_clear($1)', [household]);
    await expect(
      db.query(
        'insert into public.sessions(learner_id,ended_at)values($1,now())',
        [ids.la],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.tts_cache(text_hash,voice,storage_path)values('old','voice',$1)",
        [`${household}/old.mp3`],
      ),
    ).rejects.toThrow();
    expect(
      (
        await db.query<{ ok: boolean }>('select public.clear_app_data($1)ok', [
          household,
        ])
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (await db.query('select id from public.learners where id=$1', [ids.la]))
        .rows,
    ).toHaveLength(0);
    expect(
      (await db.query('select id from public.learners where id=$1', [ids.lb]))
        .rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query('select id from public.messages where learner_id=$1', [
          ids.la,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          'select parent_id from public.parent_secrets where parent_id=$1',
          [ids.a],
        )
      ).rows,
    ).toHaveLength(0);
    await db.exec('reset role');
  });
});
