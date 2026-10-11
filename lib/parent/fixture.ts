import 'server-only';
import { fixture } from '../learning/fixture';
import type { Dashboard } from './contracts';
const globalParent = globalThis as typeof globalThis & {
  parentFixture?: Dashboard;
};
export function parentFixture(reset = false): Dashboard {
  if (reset) globalParent.parentFixture = undefined;
  const f = fixture(),
    now = new Date().toISOString();
  return (globalParent.parentFixture ??= {
    learner: {
      id: f.profile.id,
      household_id: f.profile.householdId,
      first_name: 'Leo',
      grade: 4,
      settings: {
        session_minutes: 15,
        daily_max_minutes: 30,
        retention_months: 12,
      },
    },
    parts: [
      {
        part_id: 4,
        status: 'tildelt',
        awarded_at: now,
        parent_seen: false,
        skills_mastered: 7,
        skills_total: 7,
      },
    ],
    states: [
      {
        skill_id: 'figur-2d-egenskaper',
        mastered_at: now,
        attempts: 10,
        next_review_at: '2026-01-01T12:00:00Z',
      },
    ],
    observations: [
      {
        id: '00000000-0000-4000-8000-000000000031',
        category: 'læringspreferanse',
        text: 'Prøver med tegning',
        confidence: 0.7,
        status: 'aktiv',
        evidence: { session_ids: ['00000000-0000-4000-8000-000000000032'] },
      },
    ],
    misconceptions: [
      {
        skill_id: 'div-deling-konkret',
        description: 'Adderer i stedet for å dele',
        status: 'aktiv',
        evidence_count: 2,
      },
    ],
    strategies: [
      {
        dimension: 'representasjon',
        arm: 'konkret',
        alpha: 8,
        beta: 2,
        pulls: 10,
      },
    ],
    flags: [
      {
        id: '00000000-0000-4000-8000-000000000033',
        type: 'trist',
        excerpt: 'Innhold skjermet av sikkerhetskontrollen.',
        reviewed: false,
        created_at: now,
      },
    ],
    sessions: [
      {
        id: '00000000-0000-4000-8000-000000000032',
        started_at: now,
        ended_at: now,
        summary: 'Vi utforsket former og prøvde med tegning.',
        suggestions: ['Spør hvilken tegning som hjalp.'],
      },
    ],
    daily: [{ day: now.slice(0, 10), minutes: 15, sessions: 1 }],
    accuracy: [{ day: now.slice(0, 10), percent: 80, answers: 10 }],
    moods: [{ started_at: now, mood_start: 'rolig', mood_end: 'glad' }],
    sessionCount: 1,
    spend: 5,
  });
}
export function fixtureInsight(sessionId: string) {
  const p = parentFixture();
  const session = p.sessions.find((s) => s.id === sessionId);
  return session
    ? {
        session,
        messages: [
          {
            role: 'lærer',
            text: 'Kan du tegne formen?',
            created_at: session.started_at,
          },
          {
            role: 'leo',
            text: 'Jeg ser fire hjørner.',
            created_at: session.started_at,
          },
        ],
        tools: [
          {
            tool: 'lag_oppgave',
            ok: true,
            args: { skill_id: 'figur-2d-egenskaper' },
            result: { ok: true },
            created_at: session.started_at,
          },
        ],
        attempts: [
          { correct: true, hint_level_used: 0, answer_raw: 'Firkant' },
        ],
      }
    : null;
}
