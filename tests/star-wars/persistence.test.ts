import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { it, expect } from 'vitest';
import { startAdventure, adventureTurn } from '../../lib/star-wars/play';
import { createSession } from '../../lib/learning/session';
it('persists authored work and evidence atomically through the existing SQL contract, export and retention', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;`,
    );
    for (const file of readdirSync('supabase/migrations')
      .filter((s) => s.endsWith('.sql'))
      .sort())
      await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'));
    const user = crypto.randomUUID(),
      learner = crypto.randomUUID();
    await db.query('insert into auth.users values($1)', [user]);
    await db.exec(
      `set request.jwt.claim.sub='${user}';set role authenticated;`,
    );
    const h = await db.query<{ id: string }>(
      'select public.ensure_household() id',
    );
    const household = h.rows[0].id;
    await db.query(
      'insert into public.learners(id,household_id,first_name)values($1,$2,$3)',
      [learner, household, 'Leo'],
    );
    await db.exec('reset role;set role service_role');
    const now = new Date().toISOString();
    const profile = {
      id: learner,
      householdId: household,
      firstName: 'Leo',
      tutorName: 'Lumi',
      grade: 4,
      avatar: 'spire',
      settings: {},
    };
    let state = startAdventure(profile, null, now, 0);
    await db.query(
      'insert into public.sessions(id,learner_id,started_at,engine_state)values($1,$2,$3,$4)',
      [state.id, learner, now, JSON.stringify(state)],
    );
    const commit = async (event: unknown) => {
      const result = await adventureTurn({
        state,
        event,
        itemId: state.starWars!.itemId,
        requestId: crypto.randomUUID(),
        now,
      });
      const args = [
        state.id,
        learner,
        state.revision,
        JSON.stringify(result.state),
        JSON.stringify(result.events),
      ];
      const q = 'select public.commit_learning_turn($1,$2,$3,$4,$5) ok';
      expect((await db.query<{ ok: boolean }>(q, args)).rows[0].ok).toBe(true);
      expect((await db.query<{ ok: boolean }>(q, args)).rows[0].ok).toBe(false);
      state = (
        await db.query<{ engine_state: typeof state }>(
          'select engine_state from public.sessions where id=$1',
          [state.id],
        )
      ).rows[0].engine_state;
    };
    await commit({
      type: 'work',
      work: { ...state.starWars!.work, groups: [5, 6, 6, 7] },
    });
    await commit({ type: 'answer' });
    expect(state.starWars).toMatchObject({
      numericCorrect: null,
      modelCorrect: false,
      status: 'incorrect',
    });
    await commit({ type: 'solution' });
    await commit({ type: 'answer' });
    await commit({ type: 'pause' });
    const insight = await db.query<{
      data: {
        messages: { meta: { experience: string; assisted: boolean } }[];
        attempts: { credit: number }[];
      };
    }>('select public.session_insight($1,$2)data', [state.id, learner]);
    expect(
      insight.rows[0].data.messages.some(
        (m) => m.meta.experience === 'star-wars' && m.meta.assisted,
      ),
    ).toBe(true);
    expect(insight.rows[0].data.attempts.every((a) => a.credit === 0)).toBe(
      true,
    );
    const exported = await db.query<{
      data: { sessions: { engine_state: typeof state }[] };
    }>('select public.export_household($1)data', [household]);
    expect(
      exported.rows[0].data.sessions[0].engine_state.starWars!.completed,
    ).toHaveLength(1);
    const ordinary = createSession(profile, state, now, 0, 'practice', null);
    expect(ordinary.starWars).toEqual(state.starWars);
    // Progress contains only bounded structure and authored feedback, not retained raw student dialogue.
    expect(JSON.stringify(state.starWars)).not.toContain('lastSubmission');
    await db.query('delete from public.learners where id=$1', [learner]);
    expect(
      (
        await db.query('select * from public.sessions where learner_id=$1', [
          learner,
        ])
      ).rows,
    ).toEqual([]);
  } finally {
    await db.close();
  }
});
