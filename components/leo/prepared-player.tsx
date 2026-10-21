'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type {
  PreparedEvent,
  PreparedView,
  Work,
} from '@/lib/prepared/contracts';
import { preparedSpeech } from '@/lib/prepared/speech';
import { SpeechControls } from './speech-controls';
import { RecordButton } from './record-button';
import { Plate, PreparedScene } from './prepared-scene';
import styles from './prepared-player.module.css';
export function PreparedPlayer({
  tutorName,
  voice,
}: {
  tutorName: string;
  voice: boolean;
}) {
  const [view, setView] = useState<PreparedView | null>(null),
    [itemId, setItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [probe, setProbe] = useState(''),
    [question, setQuestion] = useState('');
  const sending = useRef(false),
    heading = useRef<HTMLHeadingElement>(null),
    currentMission = useRef('');
  const [retry, setRetry] = useState<Record<string, unknown> | null>(null);
  async function accept(response: Response) {
    const data = await response.json();
    if (!response.ok)
      throw Error(data.message ?? 'Vi fikk ikke lagret. Prøv igjen.');
    setView(data.view);
    setItemId(data.itemId);
    if (currentMission.current !== data.view.missionId) {
      currentMission.current = data.view.missionId;
      setProbe('');
      setQuestion('');
      requestAnimationFrame(() => heading.current?.focus());
    }
    return data.view as PreparedView;
  }
  async function restore() {
    setError('');
    try {
      await accept(await fetch('/api/prepared', { cache: 'no-store' }));
      setRetry(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente arbeidet.');
    }
  }
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void fetch('/api/prepared', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        if (active) await accept(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  async function command(body: Record<string, unknown>) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    setRetry(body);
    try {
      await accept(
        await fetch('/api/prepared', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      );
      setRetry(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Handlingen kunne ikke lagres.',
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  function turn(event: PreparedEvent) {
    if (!view || !itemId) return;
    void command({
      command: 'turn',
      sessionId: view.sessionId,
      itemId,
      revision: view.revision,
      requestId: crypto.randomUUID(),
      event,
    });
  }
  function work(change: Partial<Work>) {
    if (view) turn({ type: 'work', work: { ...view.work, ...change } });
  }
  const solved = view?.status === 'correct',
    locked = busy || solved || !view?.running;
  const sum = view?.work.groups.reduce((a, b) => a + b, 0) ?? 0;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/leo">← Hjem</Link>
        <span>LEOS JEDI-TRENING</span>
        <span>Tre oppdrag · prøvekapittel</span>
      </header>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>STAR WARS</p>
        <h1>Darth Vaders felle</h1>
        <p>
          Et eventyr der du tenker, prøver og viser hvordan det henger sammen.
        </p>
      </div>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
          <div>
            <button disabled={busy} onClick={() => void restore()}>
              Hent siste fremdrift
            </button>
            {retry && (
              <button disabled={busy} onClick={() => void command(retry!)}>
                Prøv lagring igjen
              </button>
            )}
          </div>
        </div>
      )}
      {!view ? (
        <p role="status">Henter det lagrede arbeidet …</p>
      ) : view.finished ? (
        <section className={styles.complete}>
          <span>✦</span>
          <h2>Alle er om bord!</h2>
          <p>
            Du har prøvd tre utdrag fra eventyret. Resten av kapitlet kommer
            senere.
          </p>
          <p>Dere fullførte med matematikk, egenskaper og gode forklaringer.</p>
          <Link href="/leo">Ferdig for nå →</Link>
        </section>
      ) : (
        <>
          <div
            className={styles.progress}
            aria-label={`Utdrag ${view.index + 1} av 3`}
          >
            {['Skjoldene', 'Luken', 'Signalene'].map((label, i) => (
              <span
                key={label}
                aria-current={view.index === i ? 'step' : undefined}
              >
                <b>{i < view.index ? '✓' : i + 1}</b>
                {label}
              </span>
            ))}
          </div>
          {!view.running && (
            <div className={styles.start}>
              <div>
                <strong>
                  {view.sessionId
                    ? 'Arbeidet ditt er lagret.'
                    : 'Klar for en kort prøve?'}
                </strong>
                <p>Tre utdrag med scenehopp. Ta pause når du vil.</p>
              </div>
              <button
                disabled={busy}
                onClick={() => void command({ command: 'start' })}
              >
                {view.sessionId ? 'Fortsett eventyret' : 'Start eventyret'} →
              </button>
            </div>
          )}
          <div className={styles.layout}>
            <article className={styles.board} aria-label="Aktuelt oppdrag">
              <PreparedScene index={view.index} solved={solved} />
              <div className={styles.story}>
                <p className={styles.eyebrow}>{view.scene}</p>
                <p>{view.opening}</p>
              </div>
              <section
                className={styles.task}
                aria-labelledby="mission-heading"
              >
                <h2 id="mission-heading" ref={heading} tabIndex={-1}>
                  {view.title}
                </h2>
                <p className={styles.question}>{view.question}</p>
                <div className={styles.expression}>{view.expression}</div>
                {view.index === 0 ? (
                  <>
                    <div className={styles.bank}>
                      <span>
                        Energi å fordele: <strong>{24 - sum}</strong>
                      </span>
                      <div aria-hidden="true">
                        {Array.from({ length: 24 - sum }, (_, i) => (
                          <i key={i} />
                        ))}
                      </div>
                    </div>
                    <div className={styles.groups}>
                      {view.work.groups.map((n, i) => (
                        <div
                          key={i}
                          className={
                            view.status === 'incorrect'
                              ? styles.needsWork
                              : undefined
                          }
                        >
                          <strong>Skjold {i + 1}</strong>
                          <div className={styles.tokens} aria-hidden="true">
                            {Array.from({ length: n }, (_, j) => (
                              <i key={j} />
                            ))}
                          </div>
                          <div className={styles.counter}>
                            <button
                              disabled={locked || n === 0}
                              aria-label={`Ta én fra skjold ${i + 1}`}
                              onClick={() =>
                                work({
                                  groups: view.work.groups.map((v, j) =>
                                    j === i ? v - 1 : v,
                                  ),
                                })
                              }
                            >
                              −
                            </button>
                            <output aria-label={`Brikker på skjold ${i + 1}`}>
                              {n}
                            </output>
                            <button
                              disabled={locked || sum >= 24}
                              aria-label={`Legg én på skjold ${i + 1}`}
                              onClick={() =>
                                work({
                                  groups: view.work.groups.map((v, j) =>
                                    j === i ? v + 1 : v,
                                  ),
                                })
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <label htmlFor="per-shield">
                      Tall til hvert skjold (valgfritt)
                    </label>
                    <select
                      id="per-shield"
                      disabled={locked}
                      value={view.work.value ?? ''}
                      onChange={(e) =>
                        work({
                          value:
                            e.target.value === ''
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    >
                      <option value="">Vis med brikkene</option>
                      {Array.from({ length: 25 }, (_, n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </>
                ) : view.index === 1 ? (
                  <>
                    <div className={styles.plates}>
                      {(['A', 'B', 'C'] as const).map((id) => (
                        <button
                          key={id}
                          disabled={locked}
                          aria-pressed={view.work.plate === id}
                          onClick={() => work({ plate: id, corners: [] })}
                        >
                          <Plate
                            id={id}
                            selected={view.work.plate === id}
                            corners={
                              view.work.plate === id ? view.work.corners : []
                            }
                            template={view.helpLevel >= 2}
                          />
                          <span>Plate {id}</span>
                        </button>
                      ))}
                    </div>
                    {view.work.plate && (
                      <fieldset className={styles.corners}>
                        <legend>
                          Marker de rette hjørnene på plate {view.work.plate}
                        </legend>
                        {Array.from(
                          { length: view.work.plate === 'A' ? 3 : 4 },
                          (_, i) => (
                            <button
                              key={i}
                              disabled={locked}
                              aria-pressed={view.work.corners.includes(i)}
                              onClick={() =>
                                work({
                                  corners: view.work.corners.includes(i)
                                    ? view.work.corners.filter((n) => n !== i)
                                    : [...view.work.corners, i],
                                })
                              }
                            >
                              Hjørne {i + 1}{' '}
                              {view.work.corners.includes(i) ? '✓' : ''}
                            </button>
                          ),
                        )}
                      </fieldset>
                    )}
                  </>
                ) : (
                  <>
                    <div className={styles.panels}>
                      {(['A', 'B'] as const).map((id) => (
                        <section key={id}>
                          <h3>Panel {id}</h3>
                          <p>
                            {id === 'A'
                              ? '18 signalbrikker deles likt mellom 3 sendere.'
                              : 'Hver pakke bruker 3 av de 18 signalbrikkene.'}
                          </p>
                          <strong>18 : 3 = 6</strong>
                          <fieldset>
                            <legend>3 betyr …</legend>
                            {(['recipients', 'size'] as const).map((role) => (
                              <button
                                key={role}
                                disabled={locked}
                                aria-pressed={
                                  (id === 'A'
                                    ? view.work.roleA
                                    : view.work.roleB) === role
                                }
                                onClick={() =>
                                  work(
                                    id === 'A'
                                      ? { roleA: role }
                                      : { roleB: role },
                                  )
                                }
                              >
                                {role === 'recipients'
                                  ? 'Antall sendere / grupper'
                                  : 'Brikker i hver pakke / gruppe'}
                              </button>
                            ))}
                          </fieldset>
                        </section>
                      ))}
                    </div>
                    <fieldset className={styles.demonstration}>
                      <legend>Vis hva 3 teller på panel B</legend>
                      <button
                        disabled={locked}
                        aria-pressed={view.work.demonstration === 'one-pack'}
                        onClick={() => work({ demonstration: 'one-pack' })}
                      >
                        Én pakke med tre brikker{' '}
                        <span aria-hidden="true">● ● ●</span>
                      </button>
                      <button
                        disabled={locked}
                        aria-pressed={
                          view.work.demonstration === 'three-recipients'
                        }
                        onClick={() =>
                          work({ demonstration: 'three-recipients' })
                        }
                      >
                        Tre mottakere <span aria-hidden="true">□ □ □</span>
                      </button>
                    </fieldset>
                    <details open={!!probe}>
                      <summary>Vil du heller svare med egne ord?</summary>
                      <label htmlFor="probe">
                        Svar læreren: Hva betyr 3 på A og på B?
                      </label>
                      <textarea
                        id="probe"
                        maxLength={500}
                        value={probe}
                        disabled={locked}
                        onChange={(e) => setProbe(e.target.value)}
                      />
                      {voice && (
                        <RecordButton
                          label="Hold og si forklaringen"
                          disabled={locked}
                          onText={setProbe}
                        />
                      )}
                      <button
                        disabled={locked || !probe.trim()}
                        onClick={() =>
                          turn({
                            type: 'probe',
                            probeId: 'SW19-divisor-roles',
                            text: probe,
                          })
                        }
                      >
                        Send forklaringen
                      </button>
                      <p>Du kan rette teksten før du sender.</p>
                    </details>
                  </>
                )}
                {view.feedback && (
                  <p
                    className={solved ? styles.success : styles.feedback}
                    role="status"
                  >
                    {view.feedback}
                  </p>
                )}
                <div className={styles.actions}>
                  {solved ? (
                    <button
                      className={styles.primary}
                      disabled={busy || !view.running}
                      onClick={() => turn({ type: 'next' })}
                    >
                      {view.index === 2 ? 'Avslutt prøven' : 'Neste utdrag'} →
                    </button>
                  ) : (
                    <>
                      <button
                        className={styles.primary}
                        disabled={busy || !view.running}
                        onClick={() => turn({ type: 'answer' })}
                      >
                        {view.index === 2
                          ? 'Sjekk det jeg viste'
                          : 'Sjekk svaret'}
                      </button>
                      <button
                        disabled={busy || !view.running}
                        onClick={() => turn({ type: 'hint' })}
                      >
                        Gi meg et hint
                      </button>
                    </>
                  )}
                </div>
              </section>
            </article>
            <aside className={styles.teacher} aria-label="Mattelæreren">
              <div className={styles.avatar} aria-hidden="true">
                ✧
              </div>
              <p className={styles.eyebrow}>MATTELÆREREN</p>
              <h2>{tutorName}</h2>
              <p role="status">{view.teacher}</p>
              <p className={styles.mode}>
                {view.mode === 'teaching'
                  ? 'Vi lærer sammen'
                  : view.mode === 'guided-practice'
                    ? 'Vi øver med støtte'
                    : 'Prøv selv – hjelp er alltid tilgjengelig'}
              </p>
              <details>
                <summary>Spør læreren om hjelp</summary>
                <label htmlFor="teacher-question">Hva lurer du på?</label>
                <textarea
                  id="teacher-question"
                  value={question}
                  maxLength={500}
                  disabled={busy || !view.running}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                {voice && (
                  <RecordButton
                    disabled={busy || !view.running}
                    onText={setQuestion}
                  />
                )}
                <button
                  disabled={busy || !view.running || !question.trim()}
                  onClick={() => turn({ type: 'ask', text: question })}
                >
                  Spør om hjelp
                </button>
              </details>
              {!solved && (
                <button
                  disabled={busy || !view.running}
                  onClick={() => turn({ type: 'example' })}
                >
                  Vis et enklere eksempel
                </button>
              )}
              {!solved && (
                <button
                  disabled={busy || !view.running}
                  onClick={() => turn({ type: 'solution' })}
                >
                  Vis og forklar løsningen
                </button>
              )}
              {!solved && view.helpLevel >= 3 && (
                <button
                  className={styles.primary}
                  disabled={busy || !view.running}
                  onClick={() => turn({ type: 'guided-complete' })}
                >
                  Fullfør sammen
                </button>
              )}
              {voice && view.sessionId && view.running && (
                <SpeechControls
                  contentKey={preparedSpeech(view)}
                  view={{
                    id: view.sessionId,
                    revision: view.revision,
                    speech: preparedSpeech(view),
                    ended: false,
                    task: null,
                  }}
                />
              )}
              <p className={styles.save}>
                ✓ Fullførte handlinger lagres automatisk.
              </p>
              <button
                disabled={busy || !view.running}
                onClick={() => turn({ type: 'pause' })}
              >
                Pause og lagre
              </button>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
