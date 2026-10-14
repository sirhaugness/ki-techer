'use client';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type {
  LearningView,
  LearningEvent,
  LearnerProfile,
} from '@/lib/learning/types';
import type { Answer } from '@/lib/engine/skills/generators';
import type { PartProgress } from '@/lib/engine/medallion';
import { TeacherDesk } from './teacher-desk';
import { AnswerPanel } from './answer-panel';
import { Manipulatives } from './manipulatives';
import { SpeechControls } from './speech-controls';
import { RecordButton } from './record-button';
import { homeSpeech } from '@/lib/voice/text';
import { parseVoiceAnswer } from '@/lib/voice/parse';
import { Medallion, Tutor, partTitles } from './art';
import { AdventureScene } from './adventure-scene';
import { StoryPlayer } from './story-player';
import { readLearningResponse } from '@/lib/learning/read-response';
import { RouteChoice } from './route-choice';
export function LeoExperience({
  profile,
  initial,
  parts,
  diagnosticComplete,
  story,
}: {
  profile: LearnerProfile;
  initial: LearningView | null;
  parts: PartProgress[];
  diagnosticComplete: boolean;
  story: {
    title: string;
    number: number;
    text: string;
    completed?: number;
    part?: 1 | 2 | 3 | 4 | null;
    interest?: string | null;
    icon?: string;
  };
}) {
  const router = useRouter();
  const taskRef = useRef<HTMLElement>(null);
  const sending = useRef(false);
  const liveTask = useRef(initial?.task?.id);
  const feedbackController = useRef<AbortController | null>(null);
  const [teacherBusy, setTeacherBusy] = useState(false),
    [teacherSpeech, setTeacherSpeech] = useState(''),
    [teacherError, setTeacherError] = useState('');
  useEffect(() => () => feedbackController.current?.abort(), []);
  const [view, setView] = useState(initial && !initial.ended ? initial : null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [explanation, setExplanation] = useState(''),
    [showExplain, setShowExplain] = useState(false),
    [showEnd, setShowEnd] = useState(false),
    [reflection, setReflection] = useState('');
  const [school, setSchool] = useState('');
  const [transcript, setTranscript] = useState('');
  const [endMood, setEndMood] = useState<'glad' | 'rolig' | 'sliten'>('rolig');
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [chapterProgress, setChapterProgress] = useState('');
  async function requestFeedback(current: LearningView) {
    if (!current.task) return;
    feedbackController.current?.abort();
    const controller = new AbortController();
    feedbackController.current = controller;
    const taskId = current.task.id;
    setTeacherBusy(true);
    setTeacherError('');
    try {
      const response = await fetch('/api/leo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'feedback',
          sessionId: current.id,
          itemId: taskId,
          revision: current.revision,
        }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(25000),
        ]),
      });
      const data = await response.json();
      if (!response.ok) throw new Error('Læreren fikk ikke svart nå.');
      if (liveTask.current === taskId && !controller.signal.aborted) {
        setTeacherSpeech(data.speech);
        if (data.fallback)
          setTeacherError(
            `${profile.tutorName} bruker den faste hjelpen nå. Du kan prøve å spørre igjen.`,
          );
      }
    } catch {
      if (liveTask.current === taskId && !controller.signal.aborted)
        setTeacherError(
          'Læreren fikk ikke svart nå. Du kan fortsette eller prøve igjen.',
        );
    } finally {
      if (feedbackController.current === controller) setTeacherBusy(false);
    }
  }
  async function send(command: Record<string, unknown>) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    setPending(command);
    setChapterProgress('');
    feedbackController.current?.abort();
    setTeacherBusy(false);
    setTeacherSpeech('');
    setTeacherError('');
    try {
      const response = await fetch('/api/leo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Leo-Progress': '1' },
        body: JSON.stringify(command),
        signal: AbortSignal.timeout(
          ['next', 'mood'].includes(
            (command.event as LearningEvent | undefined)?.type ?? '',
          )
            ? 290000
            : 60000,
        ),
      });
      const data = (await readLearningResponse(
        response,
        setChapterProgress,
      )) as LearningView & { message?: string };
      if (!response.ok) throw new Error(data.message ?? 'Prøv igjen.');
      setView(data as LearningView);
      liveTask.current = (data as LearningView).task?.id;
      const event = command.event as LearningEvent | undefined;
      if (
        data.adventure &&
        ((event?.type === 'answer' && data.correct) ||
          (event?.type === 'choice' && !data.adventure.choice))
      ) {
        requestAnimationFrame(() =>
          taskRef.current?.querySelector('.world-frame')?.scrollIntoView({
            block: 'center',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
              .matches
              ? 'instant'
              : 'smooth',
          }),
        );
      }
      if (event?.type === 'answer' && data.mode === 'practice')
        void requestFeedback(data as LearningView);
      if (event?.type === 'next' || event?.type === 'mood')
        requestAnimationFrame(() => {
          const top = taskRef.current?.getBoundingClientRect().top;
          if (top !== undefined && (top < 0 || top > window.innerHeight / 2))
            taskRef.current?.scrollIntoView({
              block: 'start',
              behavior: 'instant',
            });
        });
      setPending(null);
      setExplanation('');
      setShowExplain(false);
      setShowEnd(false);
      setTranscript('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prøv igjen.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  function turn(event: LearningEvent) {
    if (view)
      void send({
        command: 'turn',
        sessionId: view.id,
        revision: view.revision,
        requestId: crypto.randomUUID(),
        event,
      });
  }
  const displayedParts = view?.parts ?? parts;
  const interestChanged =
    view?.mode === 'practice' &&
    !!view.task &&
    !!story.interest &&
    view.adventure?.interest !== story.interest;
  return (
    <div
      className={`leo-experience ${view?.adventure ? 'has-adventure' : ''} ${view?.task?.scene ? 'story-mode' : ''}`}
    >
      <nav className="leo-nav">
        <Link href="/leo">🌱 Hjem</Link>
        <Link href="/leo/interesser">Mine interesser</Link>
      </nav>
      {!view ? (
        <div className="leo-welcome">
          <div>
            <p className="eyebrow">DITT MATTEEVENTYR</p>
            <h1>Hei, {profile.firstName}!</h1>
            <p aria-label={`Din figur: ${profile.avatar}`}>
              {profile.avatar === 'stjerne'
                ? '⭐'
                : profile.avatar === 'fjell'
                  ? '⛰️'
                  : '🌱'}
            </p>
            <p>
              Jeg heter {profile.tutorName}. Vi utforsker matte sammen, steg for
              steg.
            </p>
          </div>
          <Tutor />
        </div>
      ) : (
        <>
          <div className="session-title">
            <h1>
              {view.mode === 'diagnostic'
                ? 'Bli kjent'
                : view.mode === 'master'
                  ? 'Mesterutfordring'
                  : view.task?.scene
                    ? view.adventure?.title
                    : 'Vi øver sammen'}
            </h1>
            {!view.task?.scene && <Tutor thinking={busy} />}
          </div>
          {(!view.task || view.ended) && (
            <div className="tutor-speech" aria-live="polite">
              <p>{view.speech}</p>
            </div>
          )}
        </>
      )}
      {profile.settings.voice !== false && (
        <SpeechControls
          source={view ? 'all' : 'home'}
          initialAuto={profile.settings.auto_read === true}
          view={
            view ?? {
              id: profile.id,
              revision: 0,
              mode: 'practice',
              task: null,
              speech: `${homeSpeech(profile.tutorName)} ${story.title}. Kapittel ${story.number}. ${story.text}`,
              parts: displayedParts,
              ended: true,
              correct: null,
              hintLevel: 0,
              pauseOffered: false,
              celebration: null,
              diagnosticComplete,
              masterProgress: null,
            }
          }
        />
      )}
      {profile.settings.voice === false && (
        <p className="voice-note">
          Tale er slått av. Du kan skrive til læreren.
        </p>
      )}
      {!view ? (
        <>
          <section className="card">
            <h2>{story.title}</h2>
            <p>Kapittel {story.number}</p>
            <p>{story.text}</p>
            {story.interest ? (
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void send({
                    command: 'start',
                    mode: diagnosticComplete ? 'practice' : 'diagnostic',
                    part: diagnosticComplete ? (story.part ?? null) : null,
                  })
                }
              >
                {story.completed ? 'Fortsett eventyret' : 'Start eventyret'}
              </button>
            ) : (
              <Link href="/leo/interesser">Velg ditt eventyr</Link>
            )}
            <p className="home-note">
              Eventyret følger deg i Basecamp og på kartet. Du kan bytte
              interesse og beholde matten du har lært.
            </p>
          </section>
          <div className="medallion-home">
            <Medallion parts={displayedParts} />
            <div>
              <h2>Din mattemedaljong</h2>
              <p>
                Hver stein lyser når du har mestret noe nytt. Du beholder alle
                delene du får.
              </p>
            </div>
          </div>
          {!diagnosticComplete ? (
            <section className="card">
              <h2>Bli kjent</h2>
              <p>
                Først utforsker vi noen oppgaver. Du trenger ikke kunne alt.
              </p>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void send({
                    command: 'start',
                    mode: 'diagnostic',
                    part: null,
                  })
                }
              >
                Start Bli kjent
              </button>
            </section>
          ) : (
            <section className="card">
              <h2>Basecamp</h2>
              <p>Bygg et godt grunnlag og repeter det du kan.</p>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void send({ command: 'start', mode: 'practice', part: null })
                }
              >
                Start en matteøkt
              </button>
            </section>
          )}
          <h2 className="map-heading">Velg en vei på kartet</h2>
          <div className="part-map">
            {displayedParts.map((p) => (
              <section key={p.id} className={`part-card part-${p.id}`}>
                <p className="eyebrow">DEL {p.id}</p>
                <h3>{partTitles[p.id - 1]}</h3>
                <p>
                  {p.skillsMastered} av {p.skillsTotal} steiner lyser
                </p>
                <p>
                  {p.status === 'låst'
                    ? 'Vi bygger grunnlaget først.'
                    : p.status === 'tildelt'
                      ? 'Denne delen er din. Vi repeterer videre.'
                      : p.status === 'klar_for_mesterprøve'
                        ? 'Alle steinene lyser. Mesterutfordringen venter.'
                        : 'Her kan du utforske og øve.'}
                </p>
                <button
                  disabled={busy || p.status === 'låst' || !diagnosticComplete}
                  onClick={() =>
                    void send({
                      command: 'start',
                      mode:
                        p.status === 'klar_for_mesterprøve'
                          ? 'master'
                          : 'practice',
                      part: p.id,
                    })
                  }
                >
                  {p.status === 'klar_for_mesterprøve'
                    ? 'Start mesterutfordring'
                    : 'Utforsk denne delen'}
                </button>
              </section>
            ))}
          </div>
          <p className="home-note">
            Det tar tid å lære. Noe øver vi på igjen en annen dag.
          </p>
        </>
      ) : (
        <>
          {view.fallbackMode && view.mode === 'practice' && (
            <p className="home-note">
              Vi øver med faste oppgaver og rolige hint i dag.
            </p>
          )}
          {view.celebration && view.ended && (
            <div className="celebration" role="status">
              <span aria-hidden="true">✦</span>
              <h2>{view.celebration}</h2>
              <p>Du prøvde, øvde og holdt ut.</p>
            </div>
          )}
          {view.masterProgress && (
            <p className="session-progress">
              {view.masterProgress.done} av {view.masterProgress.total} oppgaver
              utforsket
            </p>
          )}
          {view.ended ? (
            <section className="card">
              <Medallion parts={view.parts} />
              <h2>
                {view.diagnosticComplete && view.mode === 'diagnostic'
                  ? 'Nå er vi klare for matteeventyret'
                  : 'Takk for i dag'}
              </h2>
              <p>Fremgangen din er lagret.</p>
              <button
                className="primary"
                onClick={() => {
                  setView(null);
                  router.push('/leo');
                  router.refresh();
                }}
              >
                Tilbake til kartet
              </button>
            </section>
          ) : interestChanged ? (
            <section className="card">
              <h2>Videre til {story.interest}</h2>
              <p>
                {view.adventure?.interest ?? 'Det forrige eventyret'} settes på
                pause. Du beholder alt du har lært og kan komme tilbake senere.
              </p>
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => turn({ type: 'next' })}
              >
                Fortsett eventyret om {story.interest}
              </button>
            </section>
          ) : !view.task ? (
            <section className="card">
              <h2>Hvordan kjennes dagen?</h2>
              <div className="button-row">
                {(['glad', 'rolig', 'sliten'] as const).map((mood) => (
                  <button
                    disabled={busy}
                    key={mood}
                    onClick={() => turn({ type: 'mood', mood })}
                  >
                    {mood === 'glad'
                      ? '😊 Glad'
                      : mood === 'rolig'
                        ? '🙂 Rolig'
                        : '😴 Sliten'}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <>
              {view.task.scene ? (
                <StoryPlayer
                  key={view.task.id}
                  view={view}
                  busy={busy}
                  sectionRef={taskRef}
                  onTurn={turn}
                  teacher={
                    <TeacherDesk
                      view={
                        teacherSpeech
                          ? { ...view, speech: teacherSpeech }
                          : view
                      }
                      busy={busy || teacherBusy}
                      name={profile.tutorName}
                      voice={profile.settings.voice !== false}
                      onAsk={(text) => turn({ type: 'ask', text })}
                    />
                  }
                />
              ) : (
                <section className="task-card" ref={taskRef} aria-busy={busy}>
                  {view.adventure && (
                    <>
                      <p className="adventure-label">
                        {view.adventure.icon} {view.adventure.title} · Kapittel{' '}
                        {view.adventure.number}
                      </p>
                      <AdventureScene
                        key={view.task.id}
                        adventure={view.adventure}
                        task={view.task}
                      />
                    </>
                  )}
                  {!view.adventure && (
                    <p className="adventure-scene">{view.task.skillTitle}</p>
                  )}
                  <p className="eyebrow">{view.task.skillTitle}</p>
                  <h2 id="task-question">{view.task.question}</h2>
                  {view.task.visual.shape && (
                    <Manipulatives
                      key={`shape-${view.task.id}`}
                      visual={view.task.visual}
                      disabled={true}
                      onAnswer={() => {}}
                    />
                  )}
                  {!view.task.resolved &&
                    profile.settings.voice !== false &&
                    !view.task.expressionRequired && (
                      <>
                        <RecordButton
                          disabled={busy || profile.settings.voice === false}
                          onText={setTranscript}
                        />
                        {transcript && (
                          <div className="card">
                            <label>
                              Dette hørte vi. Du kan rette teksten.
                              <input
                                value={transcript}
                                maxLength={600}
                                onChange={(e) => setTranscript(e.target.value)}
                              />
                            </label>
                            <button
                              disabled={
                                busy ||
                                parseVoiceAnswer(
                                  transcript,
                                  view.task.answerType,
                                  view.task.choices,
                                ) === null
                              }
                              onClick={() => {
                                const answer = parseVoiceAnswer(
                                  transcript,
                                  view.task!.answerType,
                                  view.task!.choices,
                                );
                                if (answer !== null)
                                  turn({
                                    type: 'answer',
                                    itemId: view.task!.id,
                                    answer,
                                    inputMode: 'tale',
                                  });
                              }}
                            >
                              Bruk talesvaret
                            </button>
                            {parseVoiceAnswer(
                              transcript,
                              view.task.answerType,
                              view.task.choices,
                            ) === null && (
                              <p>
                                Vi trenger ett tydelig svar. Rett teksten eller
                                bruk tastaturet.
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  <div
                    key={`${view.task.id}-${view.revision}`}
                    className={`answer-feedback ${view.correct === false ? 'answer-retry' : view.correct ? 'answer-success' : ''}`}
                    aria-live="polite"
                  >
                    {view.task.resolved ? (
                      <strong>
                        {view.correct
                          ? view.celebration
                            ? `✓ ${view.celebration}`
                            : '✓ Riktig! Oppdraget er løst.'
                          : 'Svaret er lagret. Vi øver videre sammen.'}
                      </strong>
                    ) : view.correct === false ? (
                      <strong>
                        {view.lastAnswerCorrect && view.task.expressionRequired
                          ? '✓ Tallsvaret stemmer. Se på regnestykket.'
                          : '↻ Prøv igjen. Læreren hjelper deg.'}
                      </strong>
                    ) : (
                      <span>
                        {view.task.interaction?.kind === 'grouping'
                          ? 'Fordel gjenstandene, og sjekk løsningen din.'
                          : view.task.interaction?.kind === 'compare'
                            ? 'Velg alternativet som passer, og sjekk svaret.'
                            : 'Prøv oppdraget, og trykk «Sjekk svaret».'}
                      </span>
                    )}
                    {view.correct && view.task.resolved && (
                      <span
                        key={view.task.id}
                        className="answer-sparkles"
                        aria-hidden="true"
                      >
                        {view.adventure?.icon ?? '✨'} ✦ ✦
                      </span>
                    )}
                  </div>
                  {view.adventure?.route && !view.adventure.choice && (
                    <p className="route-memory">
                      Valgt vei: {view.adventure.route.label}. Dere har{' '}
                      {view.adventure.route.remaining} forsyninger igjen.
                    </p>
                  )}
                  {view.adventure?.choice && (
                    <RouteChoice
                      key={`choice-${view.task.id}`}
                      choice={view.adventure.choice}
                      busy={busy}
                      onChoose={(option, remaining) =>
                        turn({
                          type: 'choice',
                          itemId: view.task!.id,
                          option,
                          remaining,
                        })
                      }
                    />
                  )}
                  <AnswerPanel
                    key={`answer-${view.task.id}`}
                    task={view.task}
                    busy={busy}
                    teacher={
                      <TeacherDesk
                        view={
                          teacherSpeech
                            ? { ...view, speech: teacherSpeech }
                            : view
                        }
                        busy={busy || teacherBusy}
                        name={profile.tutorName}
                        voice={profile.settings.voice !== false}
                        onAsk={(text) => turn({ type: 'ask', text })}
                      />
                    }
                    onNext={
                      view.adventure?.choice
                        ? undefined
                        : () => turn({ type: 'next' })
                    }
                    onAnswer={(answer) =>
                      turn({
                        type: 'answer',
                        itemId: view.task!.id,
                        answer: answer as Answer,
                        inputMode: 'tastatur',
                      })
                    }
                  />
                  {view.adventure?.outcome && (
                    <p className="story-outcome" role="status">
                      {view.adventure.outcome}
                    </p>
                  )}
                  {teacherError && (
                    <div className="teacher-error" role="status">
                      <p>{teacherError}</p>
                      <button
                        type="button"
                        disabled={teacherBusy || busy}
                        onClick={() => void requestFeedback(view)}
                      >
                        Prøv læreren igjen
                      </button>
                    </div>
                  )}
                </section>
              )}
              {view.mode !== 'master' && (
                <>
                  <div className="button-row session-actions">
                    {!view.task.scene && (
                      <button
                        disabled={busy || view.task.resolved}
                        onClick={() => turn({ type: 'hint' })}
                      >
                        Jeg vil ha et hint
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() => setShowExplain((v) => !v)}
                    >
                      Jeg vil forklare
                    </button>
                  </div>
                  {showExplain && (
                    <form
                      className="card"
                      onSubmit={(e) => {
                        e.preventDefault();
                        turn({ type: 'explain', text: explanation });
                      }}
                    >
                      <label>
                        Hvordan tenkte du?
                        <textarea
                          value={explanation}
                          onChange={(e) => setExplanation(e.target.value)}
                          maxLength={600}
                        />
                      </label>
                      {profile.settings.voice !== false && (
                        <RecordButton
                          label="Hold for å forklare"
                          disabled={busy || profile.settings.voice === false}
                          onText={setExplanation}
                        />
                      )}
                      <button disabled={busy || !explanation.trim()}>
                        Send forklaringen
                      </button>
                    </form>
                  )}
                  {!view.task.scene && !view.task.visual.shape && (
                    <details
                      className="manipulative-details"
                      open={
                        view.helpHistory?.some(
                          (h) =>
                            h.itemId === view.task?.id &&
                            h.question === 'Vis meg med en tegning',
                        ) ?? false
                      }
                    >
                      <summary>Utforsk med tegning og klosser</summary>
                      <Manipulatives
                        key={view.task.id}
                        visual={view.task.visual}
                        disabled={busy || view.task.resolved}
                        onAnswer={(answer) =>
                          turn({
                            type: 'answer',
                            itemId: view.task!.id,
                            answer: answer as Answer,
                            inputMode: 'manipulativ',
                          })
                        }
                      />
                    </details>
                  )}
                </>
              )}
            </>
          )}
          {!view.ended && view.mode !== 'master' && (
            <details className="card">
              <summary>Hva øver dere på på skolen?</summary>
              <label>
                Fortell kort, uten navn på skolen.
                <input
                  value={school}
                  maxLength={240}
                  onChange={(e) => setSchool(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !school.trim()}
                onClick={() => turn({ type: 'school', text: school })}
              >
                Noter skoletema
              </button>
              <button
                disabled={busy}
                onClick={() => turn({ type: 'school', text: '' })}
              >
                Vet ikke
              </button>
            </details>
          )}
          {!view.ended && (
            <>
              <button
                className="quiet-button"
                disabled={busy}
                onClick={() => setShowEnd((v) => !v)}
              >
                {view.pauseOffered
                  ? 'Ta en pause eller avslutt'
                  : 'Avslutt for i dag'}
              </button>
              {showEnd && (
                <form
                  className="card"
                  onSubmit={(e) => {
                    e.preventDefault();
                    turn({ type: 'end', mood: endMood, reflection });
                  }}
                >
                  <label>
                    Hva lærte du i dag? Du kan også la feltet stå tomt.
                    <textarea
                      value={reflection}
                      maxLength={600}
                      onChange={(e) => setReflection(e.target.value)}
                    />
                  </label>
                  {profile.settings.voice !== false && (
                    <RecordButton
                      label="Hold for å fortelle hva du lærte"
                      disabled={busy || profile.settings.voice === false}
                      onText={setReflection}
                    />
                  )}
                  <fieldset>
                    <legend>Hvordan kjennes det nå?</legend>
                    <div className="button-row">
                      {(['glad', 'rolig', 'sliten'] as const).map((mood) => (
                        <button
                          key={mood}
                          type="button"
                          disabled={busy}
                          aria-pressed={endMood === mood}
                          onClick={() => setEndMood(mood)}
                        >
                          {mood === 'glad'
                            ? '😊 Glad'
                            : mood === 'rolig'
                              ? '🙂 Rolig'
                              : '😴 Sliten'}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <button className="primary" disabled={busy}>
                    Lagre og avslutt
                  </button>
                </form>
              )}
            </>
          )}
          {!view.ended && (
            <div className="quiet-progress" aria-label="Fremgang i medaljongen">
              {displayedParts.map((p) => (
                <span key={p.id}>
                  Del {p.id}: {p.skillsMastered}/{p.skillsTotal} ✦
                </span>
              ))}
            </div>
          )}
        </>
      )}
      <div className="request-status" role="status">
        {busy
          ? chapterProgress ||
            (['next', 'mood'].includes(
              (pending?.event as LearningEvent | undefined)?.type ?? '',
            )
              ? 'Vi gjør neste oppdrag klart …'
              : (pending?.event as LearningEvent | undefined)?.type === 'ask'
                ? 'Læreren tenker …'
                : 'Vi sjekker og lagrer …')
          : ''}
      </div>
      {error && (
        <div role="alert" className="error-box">
          <p>{error}</p>
          {pending && (
            <button disabled={busy} onClick={() => void send(pending)}>
              Prøv samme handling igjen
            </button>
          )}
          <button onClick={() => location.reload()}>Last siden på nytt</button>
        </div>
      )}
    </div>
  );
}
