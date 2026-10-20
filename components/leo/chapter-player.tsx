'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { playDemo } from '@/app/leo/provekapittel/actions';
import {
  newDemoState,
  draftWasChecked,
  type DemoCommand,
  type DemoResult,
  type DemoState,
} from '@/lib/chapters/demo-contracts';
import { ChapterScene } from './chapter-scene';
import styles from './chapter-player.module.css';

export function ChapterPlayer({
  storageKey,
  tutorName,
}: {
  storageKey: string;
  tutorName: string;
}) {
  const [result, setResult] = useState<DemoResult | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [saveNotice, setSaveNotice] = useState('Lagret i denne nettleseren.');
  const sending = useRef(false),
    heading = useRef<HTMLHeadingElement>(null);

  function save(state: DemoState) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      setSaveNotice(
        'Kan ikke lagre her. Hold siden åpen for å beholde prøven.',
      );
    }
  }
  useEffect(() => {
    let active = true;
    async function restore() {
      let saved: unknown = newDemoState();
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          try {
            saved = JSON.parse(raw);
          } catch {
            if (active)
              setError(
                'Lagringen av prøven er skadet. Du kan starte prøven på nytt.',
              );
            return;
          }
        }
      } catch {
        if (active)
          setSaveNotice(
            'Kan ikke lese lagringen her. Hold siden åpen for å beholde prøven.',
          );
      }
      try {
        const restored = await playDemo(saved, 'resume');
        if (active) setResult(restored);
      } catch {
        if (active)
          setError(
            'Prøven kunne ikke åpnes. Prøv å laste siden på nytt, eller start prøven på nytt.',
          );
      }
    }
    void restore();
    return () => {
      active = false;
    };
  }, [storageKey]);

  async function send(command: DemoCommand, reset = false) {
    if (sending.current || (!result && !reset)) return;
    sending.current = true;
    setBusy(true);
    setError('');
    const oldIndex = result?.view.index;
    try {
      const next = await playDemo(
        reset ? newDemoState() : result!.state,
        command,
      );
      setResult(next);
      save(next.state);
      if (reset || next.view.index !== oldIndex)
        requestAnimationFrame(() => heading.current?.focus());
    } catch {
      setError(
        'Svaret ble ikke kontrollert nå. Forslaget ditt er beholdt. Prøv igjen.',
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  function draft(change: Partial<DemoState['draft']>) {
    if (!result || busy || result.state.solved) return;
    const state = {
      ...result.state,
      draft: { ...result.state.draft, ...change },
    };
    setResult({ ...result, state });
    save(state);
  }
  const view = result?.view,
    state = result?.state;
  const solved = !!state?.solved;
  const phase = solved
    ? 'solved'
    : state && state.failures && draftWasChecked(state)
      ? 'retry'
      : state &&
          (state.draft.value || state.draft.allocations.some((n) => n > 0))
        ? 'working'
        : 'waiting';
  const groups =
    view?.mission?.scene.objects.find((o) => o.id === 'boxes')?.quantity ?? 0;
  const allocations =
    state?.draft.allocations.length === groups
      ? state.draft.allocations
      : Array.from({ length: groups }, () => 0);
  return (
    <div className={styles.player} data-testid="chapter-player">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Prøvekapittel · håndskrevet</p>
          <h1>{view?.title ?? 'Lys over Tidevannsvika'}</h1>
        </div>
        <Link href="/leo">Pause og hjem</Link>
      </header>
      {error && (
        <div role="alert" className={styles.error}>
          <p>{error}</p>
          <button onClick={() => void send('resume', true)} disabled={busy}>
            Start prøven på nytt
          </button>
        </div>
      )}
      {!result && !error && <p role="status">Åpner prøvekapittelet …</p>}
      {view && state && (
        <>
          <div className={styles.chapterGoal}>
            <p>{view.goal}</p>
            <p>
              {Math.min(view.index + 1, view.total)} av {view.total} oppdrag
            </p>
          </div>
          {view.mission ? (
            <div className={styles.layout}>
              <section
                className={styles.mission}
                aria-labelledby="mission-heading"
                aria-busy={busy}
              >
                <h2 id="mission-heading" tabIndex={-1} ref={heading}>
                  {view.mission.title}
                </h2>
                <p className={styles.before}>{view.mission.before}</p>
                <ChapterScene
                  view={view}
                  draft={state.draft}
                  solved={solved}
                  phase={phase}
                  allocations={allocations}
                  disabled={busy}
                  changeAllocation={(i, delta) =>
                    draft({
                      allocations: allocations.map((n, j) =>
                        i === j ? n + delta : n,
                      ),
                    })
                  }
                />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send('answer');
                  }}
                  className={styles.answer}
                >
                  <p id="chapter-question" className={styles.question}>
                    {view.mission.question}
                  </p>
                  {view.mission.scene.interaction !== 'distribution' && (
                    <label className={styles.answerLabel}>
                      {view.index === 0 ? 'Lyssteiner i alt' : 'Nye planker'}
                      <input
                        aria-describedby="chapter-question"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={3}
                        value={state.draft.value}
                        disabled={busy || solved}
                        onChange={(e) =>
                          draft({
                            value: e.target.value.replace(/[^0-9]/g, ''),
                          })
                        }
                      />
                    </label>
                  )}
                  {!solved && (
                    <button
                      className={styles.primary}
                      type="submit"
                      disabled={busy || (groups === 0 && !state.draft.value)}
                    >
                      {busy ? 'Kontrollerer …' : 'Sjekk svaret'}
                    </button>
                  )}
                </form>
                <div
                  role="status"
                  aria-atomic="true"
                  className={solved ? styles.success : styles.feedback}
                >
                  {(solved || draftWasChecked(state)) && view.feedback}
                </div>
                {solved && (
                  <button
                    className={styles.primary}
                    disabled={busy}
                    onClick={() => void send('next')}
                  >
                    {view.index === view.total - 1
                      ? 'Se avslutningen'
                      : 'Fortsett historien'}{' '}
                    →
                  </button>
                )}
              </section>
              <aside className={styles.teacher} aria-label="Mattelæreren">
                <div className={styles.teacherTitle}>
                  <span aria-hidden="true" className={styles.teacherFace}>
                    ✦
                  </span>
                  <h2>{tutorName}</h2>
                </div>
                <p role="status" aria-live="polite">
                  {view.teacher}
                </p>
                {!solved && (
                  <div className={styles.helpActions}>
                    <button disabled={busy} onClick={() => void send('story')}>
                      Hva skjer i historien?
                    </button>
                    <button disabled={busy} onClick={() => void send('hint')}>
                      Hjelp med regningen
                    </button>
                  </div>
                )}
                <p className={styles.helpOrigin}>Fast hjelp i denne prøven.</p>
              </aside>
            </div>
          ) : (
            <section className={styles.ending}>
              <span aria-hidden="true">☀</span>
              <h2 tabIndex={-1} ref={heading}>
                Invitasjonene er framme!
              </h2>
              <p>{view.ending}</p>
              <Link href="/leo">Ta pause og gå hjem</Link>
              <button onClick={() => void send('resume', true)} disabled={busy}>
                Spill prøven en gang til
              </button>
            </section>
          )}
          <footer className={styles.footer}>
            <p>Prøven gir ingen medaljong.</p>
            <p role="status">{saveNotice}</p>
            {view.history.length > 0 && (
              <details>
                <summary>Dette har skjedd</summary>
                {view.history.map((event, i) => (
                  <p key={i}>{event}</p>
                ))}
              </details>
            )}
          </footer>
        </>
      )}
    </div>
  );
}
