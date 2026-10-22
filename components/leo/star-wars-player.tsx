'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useAdventure } from '@/lib/star-wars/client';
import { assets } from '@/lib/star-wars/assets';
import { adventureSpeech } from '@/lib/star-wars/speech';
import { StarWarsControls } from './star-wars-controls';
import { SpeechControls } from './speech-controls';
import { RecordButton } from './record-button';
import styles from './star-wars-player.module.css';

export function StarWarsPlayer({
  voice,
  autoRead,
}: {
  voice: boolean;
  autoRead: boolean;
}) {
  const {
    view,
    draft,
    change,
    busy,
    saving,
    error,
    canRetry,
    action,
    recover,
    leave,
  } = useAdventure();
  const [question, setQuestion] = useState(''),
    [talking, setTalking] = useState(false);
  const [stay, setStay] = useState(false),
    [seconds, setSeconds] = useState(8);
  const heading = useRef<HTMLHeadingElement>(null),
    previous = useRef<string | undefined>(undefined);
  const router = useRouter();
  const missionId = view?.mission.id;
  const sceneKey = `${view?.sessionId}:${missionId}`;
  const [lastScene, setLastScene] = useState(sceneKey);
  if (lastScene !== sceneKey) {
    setLastScene(sceneKey);
    setQuestion('');
    setTalking(false);
    setStay(false);
    setSeconds(8);
  }
  useEffect(() => {
    if (previous.current && previous.current !== missionId) {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    previous.current = missionId;
  }, [missionId]);
  const solved = view?.status === 'correct';
  const advance = useEffectEvent(() => {
    void action({ type: 'next' });
  });
  useEffect(() => {
    if (!solved || !view?.running || view.finished || stay || busy || error)
      return;
    const deadline = Date.now() + 8000;
    const timer = setInterval(
      () => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      250,
    );
    const next = setTimeout(advance, 8000);
    return () => {
      clearInterval(timer);
      clearTimeout(next);
    };
  }, [solved, view?.running, view?.finished, view?.itemId, stay, busy, error]);
  async function home() {
    if (await leave()) router.push('/leo');
  }
  const locked = busy || solved || !view?.running || !!error;
  const art = assets[view?.mission.image ?? 'cockpit'];
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link
          href="/leo"
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            void home();
          }}
        >
          ← Hjem
        </Link>
        <span>LEOS EVENTYR</span>
        {view?.running ? (
          <button
            disabled={busy}
            onClick={() => void action({ type: 'pause' })}
          >
            Pause og lagre
          </button>
        ) : (
          <span>STAR WARS</span>
        )}
      </header>
      <div className={styles.title}>
        <div>
          <p>STAR WARS</p>
          <h1>Darth Vaders felle</h1>
        </div>
        <span>
          {view?.finished
            ? 'Eventyret er fullført'
            : `Oppdrag ${(view?.index ?? 0) + 1} av ${view?.total ?? 20}`}
        </span>
      </div>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Fremdrift i eventyret"
        aria-valuemin={0}
        aria-valuemax={20}
        aria-valuenow={view?.index ?? 0}
      >
        <span style={{ width: `${(view?.index ?? 0) * 5}%` }} />
      </div>
      {error && (
        <div className={styles.error} role="alert">
          <p>
            {error} Det du har skrevet her, blir stående mens du prøver igjen.
          </p>
          <div>
            {canRetry && (
              <button disabled={busy} onClick={() => void recover(true)}>
                Prøv lagring igjen
              </button>
            )}
            <button disabled={busy} onClick={() => void recover(false)}>
              Hent lagret arbeid
            </button>
          </div>
        </div>
      )}
      {!view ? (
        <p role="status">Henter det lagrede eventyret …</p>
      ) : view.finished ? (
        <section className={styles.ending}>
          <span className={styles.endStar} aria-hidden="true">
            ✦
          </span>
          <h2>Galaksen venter, Leo!</h2>
          <p>
            Falcon forsvinner inn i lyset fra hyperrommet. Vennene dine er
            trygge.
          </p>
          <div className={styles.force}>
            <span className={styles.orb} aria-hidden="true" />
            <div>
              <h3>Kraften</h3>
              <p role="status">{view.teacher}</p>
            </div>
          </div>
          {voice && view.sessionId && (
            <SpeechControls
              source="star-wars"
              view={{
                id: view.sessionId,
                revision: view.revision,
                speech: adventureSpeech(view),
                ended: true,
                task: null,
              }}
            />
          )}
          <Link className={styles.primary} href="/leo">
            Ferdig for nå →
          </Link>
        </section>
      ) : (
        <>
          {!view.running && (
            <section className={styles.start} aria-label="Start eller fortsett">
              <p>
                {view.sessionId
                  ? 'Vi husker hvor du er. Klar til å fortsette?'
                  : 'Falcon styrter rett mot et asteroidebelte. Luke trenger deg!'}
              </p>
              <button
                className={styles.primary}
                disabled={busy || !!error}
                onClick={() => void action('start')}
              >
                {view.sessionId ? 'Fortsett eventyret' : 'Start eventyret'}{' '}
                <span aria-hidden="true">→</span>
              </button>
            </section>
          )}
          <article className={styles.adventure} aria-labelledby="mission-title">
            <div className={styles.art}>
              <Image
                src={art.src}
                alt={art.alt}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 980px"
              />
              <span>{view.mission.act}</span>
            </div>
            <div className={styles.paper}>
              <div className={styles.story}>
                <h2 id="mission-title" tabIndex={-1} ref={heading}>
                  {view.mission.title}
                </h2>
                {view.mission.narrative.map((p, i) => (
                  <p key={`${missionId}-${i}`}>{p}</p>
                ))}
                <p className={styles.question}>
                  <strong>{view.mission.question}</strong>
                </p>
              </div>
              <section
                className={`${styles.force} ${solved ? styles.celebrate : ''}`}
                aria-label="Dialog med Kraften"
              >
                <span className={styles.orb} aria-hidden="true">
                  <span />
                  <span />
                </span>
                <div className={styles.forceBody}>
                  <h3>Kraften</h3>
                  <p role="status" aria-live="polite" aria-atomic="true">
                    {view.teacher}
                  </p>
                  {view.source === 'fallback' && (
                    <small>Kraften bruker et lagret hint akkurat nå.</small>
                  )}
                  {view.running && !solved && (
                    <>
                      <div className={styles.helpButtons}>
                        <button
                          disabled={locked}
                          aria-expanded={talking}
                          onClick={() => setTalking((v) => !v)}
                        >
                          Snakk med Kraften
                        </button>
                        <button
                          disabled={locked}
                          onClick={() => void action({ type: 'hint' })}
                        >
                          Gi meg et hint
                        </button>
                        <details>
                          <summary>Mer hjelp</summary>
                          <div>
                            <button
                              disabled={locked}
                              onClick={() => void action({ type: 'example' })}
                            >
                              Vis et enklere eksempel
                            </button>
                            <button
                              disabled={locked}
                              onClick={() => void action({ type: 'solution' })}
                            >
                              Vis og forklar løsningen
                            </button>
                          </div>
                        </details>
                      </div>
                      {talking && (
                        <form
                          className={styles.ask}
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (question.trim())
                              void action({ type: 'ask', text: question }).then(
                                (ok) => {
                                  if (ok) setQuestion('');
                                },
                              );
                          }}
                        >
                          <label htmlFor="force-question">
                            Hva lurer du på?
                          </label>
                          <textarea
                            id="force-question"
                            value={question}
                            disabled={locked}
                            maxLength={500}
                            rows={2}
                            onChange={(e) => setQuestion(e.target.value)}
                          />
                          {voice && (
                            <RecordButton
                              label="Hold for å snakke med Kraften"
                              disabled={locked}
                              onText={setQuestion}
                            />
                          )}
                          <button
                            disabled={locked || !question.trim()}
                            type="submit"
                          >
                            Send til Kraften
                          </button>
                        </form>
                      )}
                    </>
                  )}
                  {solved && view.running && (
                    <div className={styles.next}>
                      {!stay ? (
                        <>
                          <span>Neste oppdrag om {seconds} sekunder</span>
                          <button disabled={busy} onClick={() => setStay(true)}>
                            Bli her litt
                          </button>
                        </>
                      ) : (
                        <button
                          disabled={busy}
                          onClick={() => void action({ type: 'next' })}
                        >
                          Neste oppdrag →
                        </button>
                      )}
                    </div>
                  )}
                  {view.dialogue.length > 1 && (
                    <details className={styles.history}>
                      <summary>Se samtalen</summary>
                      {view.dialogue.map((line, i) => (
                        <p key={i}>
                          <b>{line.role === 'leo' ? 'Leo' : 'Kraften'}:</b>{' '}
                          {line.text}
                        </p>
                      ))}
                    </details>
                  )}
                </div>
              </section>
              <div className={styles.answerArea}>
                <StarWarsControls
                  control={view.mission.control}
                  work={draft}
                  onChange={change}
                  disabled={locked}
                  missionId={view.mission.id}
                />
                {solved && view.running && (
                  <div
                    className={styles.saber}
                    data-testid="lightsaber"
                    aria-hidden="true"
                  >
                    <span className={styles.hilt} />
                    <span className={styles.blade} />
                  </div>
                )}
              </div>
              {view.running && !solved && (
                <div className={styles.submit}>
                  <button
                    className={styles.primary}
                    disabled={locked}
                    onClick={() => void action({ type: 'answer' })}
                  >
                    {view.mission.control.kind === 'ending'
                      ? 'Svar Luke'
                      : 'Sjekk svaret'}{' '}
                    <span aria-hidden="true">→</span>
                  </button>
                  <span role="status">
                    {busy
                      ? 'Lagrer …'
                      : saving
                        ? 'Lagrer arbeidet …'
                        : 'Arbeidet er lagret'}
                  </span>
                </div>
              )}
            </div>
          </article>
          {voice && view.sessionId && (
            <div className={styles.voice}>
              <SpeechControls
                initialAuto={autoRead}
                source="star-wars"
                contentKey={`${view.itemId}:${view.status === 'correct' ? 'success' : view.teacher}`}
                view={{
                  id: view.sessionId,
                  revision: view.revision,
                  speech: adventureSpeech(view),
                  ended: !view.running,
                  task: null,
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
