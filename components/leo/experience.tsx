'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  LearningView,
  LearningEvent,
  LearnerProfile,
} from '@/lib/learning/types';
import type { Answer } from '@/lib/engine/skills/generators';
import type { PartProgress } from '@/lib/engine/medallion';
import { AnswerPanel } from './answer-panel';
import { Manipulatives } from './manipulatives';
import { SpeechControls } from './speech-controls';
import { RecordButton } from './record-button';
import { homeSpeech } from '@/lib/voice/text';
import { parseVoiceAnswer } from '@/lib/voice/parse';
import { Medallion, Tutor, partTitles } from './art';
export function LeoExperience({
  profile,
  initial,
  parts,
  diagnosticComplete,
}: {
  profile: LearnerProfile;
  initial: LearningView | null;
  parts: PartProgress[];
  diagnosticComplete: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState(initial && !initial.ended ? initial : null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [explanation, setExplanation] = useState(''),
    [showExplain, setShowExplain] = useState(false),
    [showEnd, setShowEnd] = useState(false),
    [reflection, setReflection] = useState('');
  const [transcript, setTranscript] = useState('');
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  async function send(command: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setPending(command);
    try {
      const response = await fetch('/api/leo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Prøv igjen.');
      setView(data as LearningView);
      setPending(null);
      setExplanation('');
      setShowExplain(false);
      setShowEnd(false);
      setTranscript('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prøv igjen.');
    } finally {
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
  return (
    <div className="leo-experience">
      <nav className="leo-nav">
        <Link href="/leo">🌱 Hjem</Link>
        <Link href="/leo/interesser">Mine interesser</Link>
      </nav>
      {!view ? (
        <>
          <div className="leo-welcome">
            <div>
              <p className="eyebrow">DITT MATTEEVENTYR</p>
              <h1>Hei, {profile.firstName}!</h1>
              <p>
                Jeg heter {profile.tutorName}. Vi utforsker matte sammen, steg
                for steg.
              </p>
            </div>
            <Tutor />
          </div>
          <SpeechControls
            source="home"
            initialAuto={profile.settings.auto_read === true}
            view={{
              id: profile.id,
              revision: 0,
              mode: 'practice',
              task: null,
              speech: homeSpeech(profile.tutorName),
              parts: displayedParts,
              ended: true,
              correct: null,
              hintLevel: 0,
              pauseOffered: false,
              celebration: null,
              diagnosticComplete,
              masterProgress: null,
            }}
          />
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
          <div className="session-title">
            <h1>
              {view.mode === 'diagnostic'
                ? 'Bli kjent'
                : view.mode === 'master'
                  ? 'Mesterutfordring'
                  : 'Vi øver sammen'}
            </h1>
            <Tutor thinking={busy} />
          </div>
          <div className="tutor-speech" aria-live="polite">
            <p>{view.speech}</p>
          </div>
          <SpeechControls
            view={view}
            initialAuto={profile.settings.auto_read === true}
          />
          {view.celebration && (
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
              <section className="task-card">
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
                {!view.task.resolved && (
                  <>
                    <RecordButton disabled={busy} onText={setTranscript} />
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
                            Vi trenger ett tydelig svar. Rett teksten eller bruk
                            tastaturet.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
                {view.task.resolved ? (
                  <>
                    <p role="status">
                      {view.mode === 'master' || view.mode === 'diagnostic'
                        ? 'Svaret ditt er lagret.'
                        : 'Du fant en løsning.'}
                    </p>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => turn({ type: 'next' })}
                    >
                      Neste oppgave
                    </button>
                  </>
                ) : (
                  <AnswerPanel
                    key={view.task.id}
                    task={view.task}
                    busy={busy}
                    onAnswer={(answer) =>
                      turn({
                        type: 'answer',
                        itemId: view.task!.id,
                        answer: answer as Answer,
                        inputMode: 'tastatur',
                      })
                    }
                  />
                )}
              </section>
              {view.mode !== 'master' && (
                <>
                  <div className="button-row session-actions">
                    <button
                      disabled={busy || view.task.resolved}
                      onClick={() => turn({ type: 'hint' })}
                    >
                      Jeg vil ha et hint
                    </button>
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
                      <RecordButton
                        label="Hold for å forklare"
                        disabled={busy}
                        onText={setExplanation}
                      />
                      <button disabled={busy || !explanation.trim()}>
                        Send forklaringen
                      </button>
                    </form>
                  )}
                  {!view.task.visual.shape && (
                    <details
                      className="manipulative-details"
                      open={view.task.showVisual}
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
                    turn({ type: 'end', mood: 'rolig', reflection });
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
                  <RecordButton
                    label="Hold for å fortelle hva du lærte"
                    disabled={busy}
                    onText={setReflection}
                  />
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
      {busy && <p role="status">Læreren tenker …</p>}
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
