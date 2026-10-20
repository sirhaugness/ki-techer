'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FreeStoryView } from '@/lib/free-story/types';
import { AnswerPanel } from './answer-panel';
import { SpeechControls } from './speech-controls';
import { storySpeech } from '@/lib/free-story/speech';
import { Manipulatives } from './manipulatives';
import { SolidExplorer } from './solid-explorer';
import styles from './free-story.module.css';

type StoryEvent =
  | { type: 'answer'; answer: unknown }
  | { type: 'hint' }
  | { type: 'ask'; text: string }
  | { type: 'next' }
  | { type: 'pause' };
type Command =
  | { command: 'prepare'; interests: string[] }
  | { command: 'start'; chapterId: string }
  | {
      command: 'turn';
      chapterId: string;
      sessionId: string;
      revision: number;
      requestId: string;
      event: StoryEvent;
    };

async function readResponse(response: Response): Promise<FreeStoryView | null> {
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.message ?? 'Vi fikk ikke kontakt. Prøv igjen.');
  return body.view ?? null;
}

export function FreeStory({ tutorName }: { tutorName: string }) {
  const router = useRouter();
  const [view, setView] = useState<FreeStoryView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [question, setQuestion] = useState('');
  const [retry, setRetry] = useState<Command | null>(null);
  const sending = useRef(false);
  const epoch = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const currentTask = useRef('');

  const accept = useCallback((next: FreeStoryView | null) => {
    const key = next?.task ? `${next.chapterId}:${next.task.id}` : '';
    if (key !== currentTask.current) {
      currentTask.current = key;
      setQuestion('');
      if (key && next?.playing)
        requestAnimationFrame(() => heading.current?.focus());
    }
    setView(next);
    if (next)
      history.replaceState(
        null,
        '',
        `/leo/eventyr?chapter=${encodeURIComponent(next.chapterId)}`,
      );
  }, []);

  const restore = useCallback(async () => {
    const version = ++epoch.current;
    try {
      const id = new URL(location.href).searchParams.get('chapter');
      const response = await fetch(
        '/api/free-chapters' + (id ? `?chapter=${encodeURIComponent(id)}` : ''),
        { cache: 'no-store' },
      );
      const next = await readResponse(response);
      if (version === epoch.current) accept(next);
    } catch (e) {
      if (version === epoch.current)
        setError(
          e instanceof Error ? e.message : 'Eventyret kunne ikke åpnes.',
        );
    } finally {
      if (version === epoch.current) setLoaded(true);
    }
  }, [accept]);

  useEffect(() => {
    const requestEpoch = epoch;
    const timer = setTimeout(() => {
      void restore();
    }, 0);
    return () => {
      clearTimeout(timer);
      requestEpoch.current++;
    };
  }, [restore]);

  const chapterId = view?.chapterId;
  const preparing = view?.preparing ?? false;
  useEffect(() => {
    if (!preparing || !chapterId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      if (sending.current) {
        timer = setTimeout(poll, 2000);
        return;
      }
      const version = epoch.current;
      try {
        const response = await fetch(
          `/api/free-chapters?chapter=${encodeURIComponent(chapterId!)}`,
          { cache: 'no-store', signal: controller.signal },
        );
        const next = await readResponse(response);
        if (active && version === epoch.current && !sending.current) {
          if (next) accept(next);
          setError('');
        }
      } catch {
        if (active && version === epoch.current)
          setError(
            'Vi mistet kontakten et øyeblikk. Prøver å hente fortsettelsen igjen.',
          );
      } finally {
        if (active) timer = setTimeout(poll, 2000);
      }
    }
    timer = setTimeout(poll, 2000);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [accept, chapterId, preparing]);

  async function request(command: Command): Promise<boolean> {
    if (sending.current) return false;
    sending.current = true;
    epoch.current++;
    setBusy(true);
    setError('');
    setRetry(null);
    try {
      const response = await fetch('/api/free-chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      accept(await readResponse(response));
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Handlingen kunne ikke lagres.',
      );
      setRetry(command);
      return false;
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  async function turn(event: StoryEvent) {
    if (!view?.sessionId) return false;
    return request({
      command: 'turn',
      chapterId: view.chapterId,
      sessionId: view.sessionId,
      revision: view.revision,
      requestId: crypto.randomUUID(),
      event,
    });
  }
  async function pause() {
    if (await turn({ type: 'pause' })) router.push('/leo');
  }
  function toggleInterest(label: string) {
    setInterests((previous) =>
      previous.includes(label)
        ? previous.filter((value) => value !== label)
        : [...previous, label],
    );
  }
  const chosenInterests = Array.from(
    new Set([
      ...interests,
      ...customInterest
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ]),
  );
  const interestsValid =
    chosenInterests.length > 0 &&
    chosenInterests.length <= 3 &&
    chosenInterests.every((value) => value.length <= 40);
  const activeTask = view?.task;
  const canPlay = !!(
    view?.playing &&
    activeTask &&
    view.sessionId &&
    !view.ending
  );

  return (
    <div className={styles.page} data-testid="free-story">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Leo, dette er ditt eventyr</p>
          <h1>{view?.title || 'Hva vil du utforske?'}</h1>
        </div>
        {view?.playing && !view.ending ? (
          <button disabled={busy} onClick={() => void pause()}>
            Pause og hjem
          </button>
        ) : (
          <Link href="/leo">Til kartet</Link>
        )}
      </header>

      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button
            disabled={busy}
            onClick={() => {
              if (retry) void request(retry);
              else void restore();
            }}
          >
            {retry ? 'Prøv handlingen igjen' : 'Hent fortsettelsen'}
          </button>
        </div>
      )}
      {!loaded && <p role="status">Henter din lagrede fortsettelse …</p>}

      {loaded && !view && (
        <section className={styles.welcome} aria-labelledby="choose-interests">
          <p className={styles.eyebrow}>Et nytt kapittel</p>
          <h2 id="choose-interests">Hva skal eventyret handle om?</h2>
          <p>
            Du er helten. Velg noe du liker, så lager vi en historie du kan
            utforske med matte.
          </p>
          <p>Velg opptil tre interesser, med høyst 40 tegn i hver.</p>
          <div className={styles.interests} aria-label="Velg interesser">
            {['Verdensrommet', 'Dinosaurer', 'Dyr', 'Bygging', 'Fotball'].map(
              (label) => (
                <button
                  key={label}
                  aria-pressed={interests.includes(label)}
                  onClick={() => toggleInterest(label)}
                  disabled={busy}
                >
                  {label}
                </button>
              ),
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void request({ command: 'prepare', interests: chosenInterests });
            }}
          >
            <label htmlFor="free-story-interests">
              Noe annet du liker? Skriv gjerne flere med komma mellom.
            </label>
            <input
              id="free-story-interests"
              value={customInterest}
              maxLength={240}
              disabled={busy}
              onChange={(event) => setCustomInterest(event.target.value)}
            />
            <button
              className={styles.primary}
              disabled={busy || !interestsValid}
            >
              {busy ? 'Starter …' : 'Lag mitt eventyr'}
            </button>
          </form>
        </section>
      )}

      {view?.preparing && !view.ending && (
        <div className={styles.preparing} role="status">
          <strong>
            {activeTask
              ? 'Resten av eventyret tar form.'
              : 'Eventyret ditt tar form.'}
          </strong>
          {!activeTask && (
            <p>
              Du kan gå hjem mens du venter. Vi beholder kapittelet og
              fortsetter her når du kommer tilbake.
            </p>
          )}
          {!view.playing && <Link href="/leo">Gå hjem mens du venter</Link>}
        </div>
      )}

      {view && !view.ending && !view.playing && (
        <section className={styles.opening}>
          <h2>Her begynner kapitlet</h2>
          <p>{view.opening || 'Vi gjør den første delen av historien klar.'}</p>
          {activeTask && (
            <button
              className={styles.primary}
              disabled={busy}
              onClick={() =>
                void request({ command: 'start', chapterId: view.chapterId })
              }
            >
              Start eller fortsett eventyret
            </button>
          )}
          <p className={styles.quiet}>
            Du kan ta pause underveis. Vi husker hvor du er.
          </p>
        </section>
      )}

      {view && !view.ending && view.scene && (
        <div className={styles.layout}>
          <section className={styles.mission} aria-busy={busy}>
            <div className={`${styles.scene} ${styles[view.scene.art]}`}>
              <p className={styles.place}>{view.scene.place}</p>
              <p className={styles.sceneText}>{view.scene.text}</p>
            </div>
            {activeTask && (
              <>
                <div className={styles.taskHeader}>
                  <p className={styles.eyebrow}>
                    Oppdrag {view.index + 1} av {view.total}
                  </p>
                  <h2 ref={heading} tabIndex={-1}>
                    {activeTask.question}
                  </h2>
                </div>
                {activeTask.showVisual &&
                  (activeTask.visual.type === 'figur3d' &&
                  activeTask.visual.shape ? (
                    <SolidExplorer
                      key={activeTask.id}
                      shape={activeTask.visual.shape}
                      count={activeTask.visual.count}
                      property={activeTask.visual.property}
                    />
                  ) : (
                    <Manipulatives
                      key={activeTask.id}
                      visual={activeTask.visual}
                      disabled={busy || !canPlay || view.solved}
                      onAnswer={(answer) => {
                        if (canPlay) void turn({ type: 'answer', answer });
                      }}
                    />
                  ))}
                {view.feedback && (
                  <p
                    className={view.solved ? styles.success : styles.feedback}
                    role="status"
                  >
                    {view.feedback}
                  </p>
                )}
                <a className={styles.teacherLink} href="#free-story-teacher">
                  Spør {tutorName} om hjelp
                </a>
                {view.sessionId && (
                  <SpeechControls
                    view={{
                      id: view.sessionId,
                      revision: view.revision,
                      speech: storySpeech(view),
                      ended: !!view.ending,
                      task: null,
                    }}
                  />
                )}
                {canPlay && (
                  <AnswerPanel
                    key={`${view.chapterId}:${activeTask.id}`}
                    task={{
                      ...activeTask,
                      resolved: activeTask.resolved || view.solved,
                    }}
                    busy={busy}
                    onAnswer={(answer) => void turn({ type: 'answer', answer })}
                    onNext={() => void turn({ type: 'next' })}
                  />
                )}
              </>
            )}
          </section>
          <aside
            id="free-story-teacher"
            className={styles.teacher}
            aria-label="Mattelæreren"
            tabIndex={-1}
          >
            <p className={styles.eyebrow}>Læreren din</p>
            <h2>{tutorName}</h2>
            {view.teacher && (
              <p className={styles.teacherMessage} role="status">
                {view.teacher}
              </p>
            )}
            {canPlay && (
              <>
                {!view.solved && (
                  <button
                    disabled={busy}
                    onClick={() => void turn({ type: 'hint' })}
                  >
                    Hjelp med regningen
                  </button>
                )}
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (await turn({ type: 'ask', text: question.trim() }))
                      setQuestion('');
                  }}
                >
                  <label htmlFor="free-story-question">Hva lurer du på?</label>
                  <textarea
                    id="free-story-question"
                    value={question}
                    maxLength={600}
                    rows={2}
                    disabled={busy}
                    onChange={(event) => setQuestion(event.target.value)}
                  />
                  <button disabled={busy || !question.trim()}>
                    Spør {tutorName}
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      )}

      {view?.playing && !activeTask && !view.ending && (
        <p className={styles.waiting} role="status">
          Henter neste del av eventyret. Du beholder alt du har gjort.
        </p>
      )}

      {view?.ending && (
        <section className={styles.ending}>
          <p className={styles.eyebrow}>Dette fikk du til, Leo!</p>
          <h2>Et kapittel er fullført</h2>
          <p>{view.ending}</p>
          <div className={styles.endingActions}>
            <Link href="/leo">Ta pause og gå hjem</Link>
            {view.nextChapterId && (
              <button
                className={styles.primary}
                disabled={busy}
                onClick={() =>
                  void request({
                    command: 'start',
                    chapterId: view.nextChapterId!,
                  })
                }
              >
                Fortsett til neste kapittel
              </button>
            )}
          </div>
        </section>
      )}

      {view && (
        <footer className={styles.footer}>
          Kapittelet og bekreftede handlinger lagres for deg.
        </footer>
      )}
    </div>
  );
}
