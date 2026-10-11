'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Dashboard, Row } from '@/lib/parent/contracts';
import { text, num, date } from '@/lib/parent/contracts';
import { skills } from '@/lib/engine/skills/graph';
import { curriculum } from '@/lib/engine/skills/curriculum';
import { categories } from '@/lib/profile/rules';
import { partTitles } from '@/components/leo/art';
const time = (n: number) =>
  `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
const minutes = (value: FormDataEntryValue | null) => {
  const [h, m] = String(value).split(':').map(Number);
  return h * 60 + m;
};
const labels: Record<string, string> = {
  representasjon: 'Hvordan oppgaven vises',
  forklaringsstil: 'Hvordan læreren forklarer',
  kontekst: 'Ramme rundt oppgaven',
  konkret: 'tegninger og klosser',
  tall: 'regnetall',
  visuell: 'tegninger',
  sokratisk: 'spørsmål som hjelper Leo å tenke selv',
  proev_foerst: 'å prøve først',
  eksempel_foerst: 'å se et eksempel først',
  sporsmaal: 'spørsmål som hjelper barnet å tenke selv',
  ren_oppgave: 'oppgaver uten fortelling',
  utfordring: 'utfordringer',
  bilde: 'bilder',
  tempo: 'Lengde på forklaringen',
  kort: 'korte forklaringer',
  lang: 'lengre forklaringer',
  interessefortelling: 'fortellinger om interesser',
};
export function ParentDashboard({
  data,
  offset,
  now,
}: {
  data: Dashboard;
  offset: number;
  now: string;
}) {
  const router = useRouter(),
    id = text(data.learner, 'id');
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [failed, setFailed] = useState(false),
    [confirm, setConfirm] = useState('');
  async function act(command: Record<string, unknown>) {
    setBusy(true);
    setMessage('');
    setFailed(false);
    try {
      const response = await fetch('/api/parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...command, learnerId: id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Prøv igjen.');
      setMessage(result.message);
      if (command.action === 'clearData') router.push('/forelder');
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Prøv igjen.');
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  const settings = (data.learner.settings ?? {}) as Row;
  const observations = data.observations;
  const newParts = data.parts.filter((p) => p.awarded_at && !p.parent_seen);
  const strategyDims = [
    ...new Set(data.strategies.map((s) => text(s, 'dimension'))),
  ];
  return (
    <div className="parent-dashboard">
      <nav className="parent-nav" aria-label="Foreldresider">
        <Link href="/forelder">Alle profiler og PIN</Link>
        {[
          'Oversikt',
          'Ferdigheter',
          'Profil',
          'Økter',
          'Sikkerhet',
          'Innstillinger',
          'Personvern',
        ].map((t) => (
          <a key={t} href={`#${t.toLocaleLowerCase('nb-NO')}`}>
            {t}
          </a>
        ))}
      </nav>
      <h1>Innsyn for {text(data.learner, 'first_name')}</h1>
      <p>
        Appen følger øvingen automatisk. Du kan se hva som skjer og justere når
        du ønsker.
      </p>
      {message && (
        <p
          className={failed ? 'error-box' : 'card'}
          role={failed ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
      <section className="card" id="oversikt">
        <h2>Oversikt</h2>
        <p>
          {data.sessionCount} økter ·{' '}
          {data.parts.filter((p) => p.awarded_at).length} av 4 medaljongdeler
          tildelt
        </p>
        <ul>
          {data.parts.map((p) => (
            <li key={num(p, 'part_id')}>
              {partTitles[num(p, 'part_id') - 1]}:{' '}
              {text(p, 'status').replaceAll('_', ' ')} ·{' '}
              {num(p, 'skills_mastered')}/{num(p, 'skills_total')} ferdigheter
            </li>
          ))}
        </ul>
        {newParts.map((p) => (
          <div className="award-notice" key={num(p, 'part_id')}>
            <h3>Ny medaljongdel: {partTitles[num(p, 'part_id') - 1]}</h3>
            <p>Tildelt {date(text(p, 'awarded_at'))}</p>
            <Link href={`/forelder/${id}/diplom?part=${num(p, 'part_id')}`}>
              Åpne diplom for utskrift
            </Link>
            <button
              disabled={busy}
              onClick={() =>
                void act({ action: 'seenPart', id: String(p.part_id) })
              }
            >
              Marker del {num(p, 'part_id')} som sett
            </button>
          </div>
        ))}
        {data.parts
          .filter((p) => p.awarded_at)
          .map((p) => (
            <p key={`diploma-${p.part_id}`}>
              <Link href={`/forelder/${id}/diplom?part=${num(p, 'part_id')}`}>
                Diplom: {partTitles[num(p, 'part_id') - 1]}
              </Link>
            </p>
          ))}
        {data.parts.filter((p) => p.awarded_at).length === 4 && (
          <Link href={`/forelder/${id}/diplom?part=all`}>
            Diplom for hele medaljongen
          </Link>
        )}
        <h3>Tid brukt siste uke</h3>
        {!data.daily.length ? (
          <p>Ingen øving registrert ennå.</p>
        ) : (
          <table>
            <caption>Øving per dag (Oslo-tid)</caption>
            <thead>
              <tr>
                <th>Dato</th>
                <th>Minutter</th>
                <th>Økter</th>
              </tr>
            </thead>
            <tbody>
              {data.daily.map((d) => (
                <tr key={text(d, 'day')}>
                  <td>{text(d, 'day')}</td>
                  <td>{num(d, 'minutes')}</td>
                  <td>{num(d, 'sessions')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p>
          Til sammen {data.daily.reduce((s, d) => s + num(d, 'minutes'), 0)}{' '}
          minutter siste sju dager.
        </p>
        <h3>Treffsikkerhet siste to uker</h3>
        <p>
          Viser øvingssvar, også svar med hint. Det er en trend, ikke en
          karakter.
        </p>
        {data.accuracy.length ? (
          <ul>
            {data.accuracy.map((a) => (
              <li key={text(a, 'day')}>
                {text(a, 'day')}: {num(a, 'percent')} % av {num(a, 'answers')}{' '}
                svar
              </li>
            ))}
          </ul>
        ) : (
          <p>Ingen svar registrert ennå.</p>
        )}
        <h3>Humør siste to uker</h3>
        {data.moods.length ? (
          <ul>
            {data.moods.map((m, i) => (
              <li key={i}>
                {date(text(m, 'started_at'))}:{' '}
                {text(m, 'mood_start') || 'ikke valgt'} →{' '}
                {text(m, 'mood_end') || 'ikke valgt'}
              </li>
            ))}
          </ul>
        ) : (
          <p>Ingen humørvalg ennå.</p>
        )}
      </section>
      <section className="card" id="ferdigheter">
        <h2>Ferdighetskart</h2>
        <p>Kartet viser matte for 4. trinn etter LK20.</p>
        <ul className="skill-list">
          {skills.map((skill) => {
            const state = data.states.find((s) => s.skill_id === skill.id);
            const status = state?.mastered_at
              ? state.next_review_at &&
                Date.parse(String(state.next_review_at)) <= Date.parse(now)
                ? 'Til repetisjon'
                : 'Mestret'
              : state && num(state, 'attempts') > 0
                ? 'Øver'
                : 'Ikke startet';
            return (
              <li key={skill.id}>
                <strong>{skill.title}</strong> — {status}
                <p>
                  {skill.part ? `Del ${skill.part}` : 'Basecamp'} · {skill.aim}
                </p>
                <details>
                  <summary>Kompetansemål</summary>
                  <p>{curriculum[skill.aim].text}</p>
                </details>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="card" id="profil">
        <h2>Profilhukommelse</h2>
        <p>
          Dette er forsiktige observasjoner fra øving. Lås det som skal
          beholdes, eller avvis det som ikke stemmer. En låst observasjon brukes
          av læreren.
        </p>
        {observations.length === 0 && <p>Ingen observasjoner ennå.</p>}
        {observations.map((o) => (
          <ProfileEditor
            key={text(o, 'id')}
            row={o}
            busy={busy}
            act={act}
            learnerId={id}
          />
        ))}
        <h3>Legg til din egen observasjon</h3>
        <ProfileEditor busy={busy} act={act} learnerId={id} />
        <h3>Misoppfatninger</h3>
        {data.misconceptions.length ? (
          <ul>
            {data.misconceptions.map((m, i) => (
              <li key={i}>
                {text(m, 'description')} — {text(m, 'status')} (
                {num(m, 'evidence_count')} funn)
              </li>
            ))}
          </ul>
        ) : (
          <p>Ingen misoppfatninger registrert.</p>
        )}
        <h3>Hva ser ut til å fungere?</h3>
        <p>
          Dette bygger på øvingssvar. Det er ikke en fast merkelapp på barnet.
        </p>
        {strategyDims.length ? (
          strategyDims.map((dim) => {
            const list = data.strategies
              .filter((s) => s.dimension === dim && num(s, 'pulls') >= 3)
              .sort(
                (a, b) =>
                  num(b, 'alpha') / (num(b, 'alpha') + num(b, 'beta')) -
                  num(a, 'alpha') / (num(a, 'alpha') + num(a, 'beta')),
              );
            const best = list[0];
            return (
              <p key={dim}>
                {labels[dim] ?? dim}:{' '}
                {best
                  ? `Foreløpig ser ${labels[text(best, 'arm')] ?? text(best, 'arm').replaceAll('_', ' ')} ut til å hjelpe (${num(best, 'pulls')} øvingsforsøk).`
                  : 'Vi trenger flere forsøk før vi kan si noe.'}
              </p>
            );
          })
        ) : (
          <p>Vi trenger flere økter før vi kan si noe.</p>
        )}
      </section>
      <section className="card" id="økter">
        <h2>Økter</h2>
        {data.sessions.length ? (
          data.sessions.map((s) => (
            <article key={text(s, 'id')}>
              <h3>
                <Link href={`/forelder/${id}/okter/${text(s, 'id')}`}>
                  {date(text(s, 'started_at'))}
                </Link>
              </h3>
              <p>
                {text(s, 'summary') ||
                  'Økten pågår eller venter på oppsummering.'}
              </p>

              {Array.isArray(s.suggestions) && (
                <ul>
                  {s.suggestions.map((v, i) => (
                    <li key={i}>{String(v)}</li>
                  ))}
                </ul>
              )}
            </article>
          ))
        ) : (
          <p>Ingen økter ennå.</p>
        )}
        <nav aria-label="Flere økter">
          {offset > 0 && (
            <Link
              href={`/forelder/${id}?offset=${Math.max(0, offset - 20)}#økter`}
            >
              Nyere økter
            </Link>
          )}
          {offset + 20 < data.sessionCount && (
            <Link href={`/forelder/${id}?offset=${offset + 20}#økter`}>
              Eldre økter
            </Link>
          )}
        </nav>
      </section>
      <section className="card" id="sikkerhet">
        <h2>Sikkerhetsflagg</h2>
        <p>
          Varsler er signaler for innsyn. Snakk rolig med barnet hvis noe
          bekymrer deg. Sensitivt innhold kan være skjermet.
        </p>
        {data.flags.length ? (
          data.flags.map((f) => (
            <article key={text(f, 'id')}>
              <h3>
                {text(f, 'type')} · {date(text(f, 'created_at'))}
              </h3>
              <p>{text(f, 'excerpt')}</p>
              <p>{f.reviewed ? 'Sett av forelder' : 'Ikke sett ennå'}</p>
              {!f.reviewed && (
                <button
                  disabled={busy}
                  onClick={() => void act({ action: 'seenFlag', id: f.id })}
                >
                  Marker sikkerhetsflagg som sett
                </button>
              )}
            </article>
          ))
        ) : (
          <p>Ingen sikkerhetsflagg.</p>
        )}
        <p>De siste 100 vises her. Eksporten inkluderer alle.</p>
      </section>
      <section className="card" id="innstillinger">
        <h2>Innstillinger</h2>
        <p>
          Anslått KI-forbruk denne måneden for husholdningen:{' '}
          {data.spend.toFixed(2)} kr. Dette er et forsiktig estimat, ikke en
          faktura.
        </p>
        <SettingsForm
          settings={settings}
          grade={num(data.learner, 'grade')}
          busy={busy}
          act={act}
        />
        <p>
          Tidsrom bruker Oslo-tid. Appen har foreløpig bare læreplanen for 4.
          trinn.
        </p>
        <button
          disabled={busy}
          onClick={() => void act({ action: 'resetDiagnostic' })}
        >
          Kjør kartlegging på nytt
        </button>
        <p>
          Ny kartlegging bevarer mestrede ferdigheter og medaljongdeler. Avslutt
          en pågående økt først.
        </p>
        <Link href="/forelder">Endre forelders PIN</Link>
      </section>
      <section className="card" id="personvern">
        <h2>Personvern</h2>
        <p>
          <a href={`/api/parent/export?learnerId=${id}`} download>
            Last ned alle husholdningens appdata som JSON
          </a>
        </p>
        <p>
          Eksporten inneholder læringsdata, profiler, samtaler, verktøykall,
          sikkerhetsflagg og forbruk. PIN-hash, API-nøkler og innloggingstokener
          eksporteres ikke. Lydcache er oppført med filreferanser.
        </p>
        <button
          disabled={busy}
          onClick={() =>
            void act({
              action: 'pruneLogs',
              months: Number(settings.retention_months ?? 12),
            })
          }
        >
          Slett samtalelogger eldre enn{' '}
          {Number(settings.retention_months ?? 12)} måneder
        </button>
        <details>
          <summary>Slett alle appdata</summary>
          <p>
            Dette sletter alle elevprofiler, fremgang, medaljongdeler, samtaler,
            lyd, PIN og forbrukslogger i husholdningen. Det kan ikke angres.
            Forelders innloggingskonto beholdes, så du kan starte på nytt.
          </p>
          <label>
            Skriv SLETT for å bekrefte
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
            />
          </label>
          <button
            disabled={busy || confirm !== 'SLETT'}
            onClick={() =>
              void act({ action: 'clearData', confirmation: confirm })
            }
          >
            Slett alle appdata nå
          </button>
        </details>
      </section>
    </div>
  );
}
function ProfileEditor({
  row,
  busy,
  act,
  learnerId,
}: {
  row?: Row;
  busy: boolean;
  act: (c: Record<string, unknown>) => Promise<void>;
  learnerId: string;
}) {
  const uid = row ? text(row, 'id') : 'new';
  return (
    <form
      className="profile-editor"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void act({
          action: 'profile',
          id: row?.id ?? null,
          category: f.get('category'),
          text: f.get('text'),
          status: f.get('status'),
        });
      }}
    >
      <label htmlFor={`text-${uid}`}>
        Observasjon
        <textarea
          id={`text-${uid}`}
          name="text"
          defaultValue={row ? text(row, 'text') : ''}
          required
          maxLength={240}
        />
      </label>
      <label>
        Kategori
        <select
          name="category"
          defaultValue={row ? text(row, 'category') : 'læringspreferanse'}
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Status
        <select name="status" defaultValue={row ? text(row, 'status') : 'låst'}>
          <option value="aktiv">Aktiv</option>
          <option value="låst">Låst av forelder</option>
          <option value="avvist">Avvist</option>
          <option value="arkivert">Arkivert</option>
        </select>
      </label>
      {row && (
        <>
          <p>
            Sikkerhet i observasjonen:{' '}
            {Math.round(num(row, 'confidence') * 100)} %
          </p>
          <p>
            Bevis:{' '}
            {Array.isArray((row.evidence as Row)?.session_ids)
              ? ((row.evidence as Row).session_ids as string[]).map((s) => (
                  <Link key={s} href={`/forelder/${learnerId}/okter/${s}`}>
                    Se økten{' '}
                  </Link>
                ))
              : 'Lagt inn av forelder'}
          </p>
        </>
      )}
      <button disabled={busy}>
        {row ? 'Lagre observasjon' : 'Legg til observasjon'}
      </button>
    </form>
  );
}
function SettingsForm({
  settings,
  grade,
  busy,
  act,
}: {
  settings: Row;
  grade: number;
  busy: boolean;
  act: (c: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void act({
          action: 'settings',
          settings: {
            session_minutes: Number(f.get('session_minutes')),
            daily_max_minutes: Number(f.get('daily_max_minutes')),
            allowed_start_minute: minutes(f.get('start')),
            allowed_end_minute: minutes(f.get('end')) || 1440,
            voice: f.has('voice'),
            auto_read: f.has('auto_read'),
            grade: Number(f.get('grade')),
            retention_months: Number(f.get('retention_months')),
            ai_budget_nok: Number(f.get('ai_budget_nok')),
          },
        });
      }}
    >
      {[
        ['session_minutes', 'Øktlengde i minutter', 5, 60, 15],
        ['daily_max_minutes', 'Maks øving per dag i minutter', 5, 180, 30],
        ['retention_months', 'Behold samtalelogger i måneder', 1, 36, 12],
        ['ai_budget_nok', 'KI-budsjett per måned i kroner', 0, 10000, 100],
      ].map(([name, label, min, max, fallback]) => (
        <label key={String(name)}>
          {label}
          <input
            name={String(name)}
            type="number"
            min={Number(min)}
            max={Number(max)}
            step="1"
            defaultValue={Number(settings[String(name)] ?? fallback)}
            required
          />
        </label>
      ))}
      <label>
        Trinn
        <input
          name="grade"
          type="number"
          min="1"
          max="13"
          required
          defaultValue={grade}
        />
      </label>
      <label>
        Tillatt øving fra
        <input
          type="time"
          name="start"
          required
          defaultValue={time(Number(settings.allowed_start_minute ?? 0))}
        />
      </label>
      <label>
        Tillatt øving til
        <input
          type="time"
          name="end"
          required
          defaultValue={time(Number(settings.allowed_end_minute ?? 1440))}
        />
      </label>
      <p>00:00 til 00:00 tillater hele døgnet.</p>
      <label>
        <input
          name="voice"
          type="checkbox"
          defaultChecked={settings.voice === true}
        />
        Tillat tale
      </label>
      <label>
        <input
          name="auto_read"
          type="checkbox"
          defaultChecked={settings.auto_read === true}
        />
        Automatisk opplesing
      </label>
      <button disabled={busy}>Lagre innstillinger</button>
    </form>
  );
}
