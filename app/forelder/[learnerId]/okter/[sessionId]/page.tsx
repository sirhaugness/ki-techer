import Link from 'next/link';
import { notFound } from 'next/navigation';
import { parentLearner } from '@/lib/parent/repository';
import { fixtureInsight } from '@/lib/parent/fixture';
import { adminDb } from '@/lib/db/server';
import { rows, text, date, type Row } from '@/lib/parent/contracts';
export const dynamic = 'force-dynamic';
export default async function SessionPage({
  params,
}: {
  params: Promise<{ learnerId: string; sessionId: string }>;
}) {
  const { learnerId, sessionId } = await params;
  const access = await parentLearner(learnerId);
  const result = access.mock
    ? fixtureInsight(sessionId)
    : (
        await adminDb().rpc('session_insight', {
          target_learner: learnerId,
          target_session: sessionId,
        })
      ).data;
  if (!result) notFound();
  const insight = result as unknown as Row,
    session = insight.session as Row;
  return (
    <div className="parent-dashboard">
      <Link href={`/forelder/${learnerId}#økter`}>Tilbake til økter</Link>
      <h1>Økt {date(text(session, 'started_at'))}</h1>
      <p>{text(session, 'summary')}</p>
      <h2>Samtale</h2>
      {rows(insight.messages).length ? (
        rows(insight.messages).map((m, i) => (
          <article className="card" key={i}>
            <strong>
              {text(m, 'role')} · {date(text(m, 'created_at'))}
            </strong>
            <p>{text(m, 'text')}</p>
          </article>
        ))
      ) : (
        <p>
          Ingen samtalelogg. Gamle logger kan være slettet etter
          oppbevaringsvalget.
        </p>
      )}
      <h2>Verktøykall</h2>
      {rows(insight.tools).map((t, i) => (
        <details className="card" key={i}>
          <summary>
            {text(t, 'tool')} · {t.ok ? 'godkjent' : 'avvist'}
          </summary>
          <h3>Argumenter</h3>
          <pre>{JSON.stringify(t.args, null, 2)}</pre>
          <h3>Resultat</h3>
          <pre>{JSON.stringify(t.result, null, 2)}</pre>
        </details>
      ))}
      <h2>Øvingssvar</h2>
      {rows(insight.attempts).map((a, i) => (
        <p key={i}>
          {text(a, 'answer_raw')} — {a.correct ? 'riktig' : 'ikke riktig'},
          hintnivå {Number(a.hint_level_used)}
        </p>
      ))}
    </div>
  );
}
