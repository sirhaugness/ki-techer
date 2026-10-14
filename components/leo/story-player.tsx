'use client';
import { useState, type ReactNode, type Ref } from 'react';
import type { LearningEvent, LearningView } from '@/lib/learning/types';
import { StoryWorld, ResourceGlyph, ActorPortrait } from './story-world';
import { Manipulatives } from './manipulatives';
import { RouteChoice } from './route-choice';
import { SolidExplorer } from './solid-explorer';

export function StoryPlayer({
  view,
  busy,
  teacher,
  onTurn,
  sectionRef,
}: {
  view: LearningView;
  busy: boolean;
  teacher: ReactNode;
  onTurn: (event: LearningEvent) => void;
  sectionRef?: Ref<HTMLElement>;
}) {
  const task = view.task!;
  const scene = task.scene!;
  const previous = task.submittedAnswer;
  const initial =
    previous && typeof previous === 'object' && !Array.isArray(previous)
      ? 'value' in previous
        ? String(previous.value)
        : 'quotient' in previous
          ? String(previous.quotient)
          : 'x' in previous
            ? String(previous.x)
            : ''
      : typeof previous === 'number'
        ? String(previous)
        : Array.isArray(previous)
          ? previous.join(', ')
          : '';
  const [value, setValue] = useState(initial);
  const [expression, setExpression] = useState(
    previous &&
      typeof previous === 'object' &&
      !Array.isArray(previous) &&
      'expression' in previous
      ? previous.expression
      : '',
  );
  const [choice, setChoice] = useState(
    typeof previous === 'string' ? previous : '',
  );
  const [second, setSecond] = useState(
    previous &&
      typeof previous === 'object' &&
      !Array.isArray(previous) &&
      'remainder' in previous
      ? String(previous.remainder)
      : previous &&
          typeof previous === 'object' &&
          !Array.isArray(previous) &&
          'y' in previous
        ? String(previous.y)
        : '',
  );
  const [allocations, setAllocations] = useState<number[]>(
    previous &&
      typeof previous === 'object' &&
      !Array.isArray(previous) &&
      'allocations' in previous
      ? previous.allocations
      : Array.from(
          {
            length:
              task.interaction?.kind === 'grouping'
                ? task.interaction.math.groups
                : 0,
          },
          () => 0,
        ),
  );
  const [edited, setEdited] = useState(false);
  const n = /^\d+$/.test(value) ? Number(value) : 0;
  const disabled = busy || task.resolved;
  const two = ['remainder', 'coordinate'].includes(task.answerType);
  const canSubmit =
    task.answerType === 'choice'
      ? !!choice
      : task.answerType === 'sequence'
        ? !!value.trim()
        : /^\d+$/.test(value) &&
          (!two || /^\d+$/.test(second)) &&
          (!task.expressionRequired || !!expression.trim());
  const update = (text: string) => {
    setValue(text);
    setEdited(true);
  };
  const allocate = (index: number, amount: number) => {
    const next = allocations.map((v, i) =>
      i === index ? Math.max(0, Math.min(999, amount)) : v,
    );
    setAllocations(next);
    update(
      String(
        task.interaction?.math.kind === 'share'
          ? next[0]
          : next.reduce((a, b) => a + b, 0),
      ),
    );
  };
  const submit = () => {
    if (disabled || !canSubmit) return;
    setEdited(false);
    const answer =
      task.answerType === 'choice'
        ? choice
        : task.answerType === 'sequence'
          ? value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : task.answerType === 'remainder'
            ? { quotient: n, remainder: Number(second) }
            : task.answerType === 'coordinate'
              ? { x: n, y: Number(second) }
              : task.interaction?.kind === 'grouping'
                ? { value: n, allocations }
                : task.expressionRequired
                  ? { value: n, expression }
                  : n;
    onTurn({
      type: 'answer',
      itemId: task.id,
      answer,
      inputMode: allocations.length ? 'manipulativ' : 'tastatur',
    });
  };
  const state = task.resolved
    ? 'solved'
    : view.correct === false && !edited
      ? 'retry'
      : edited
        ? 'working'
        : 'waiting';
  const actors = scene.cast;
  const speaker = actors.find((a) => a.name === scene.speaker) ?? actors[0];
  const adventure = view.adventure;
  return (
    <section
      className="story-player"
      data-action={scene.action}
      ref={sectionRef}
      aria-busy={busy}
      aria-label="Det levende eventyret"
    >
      <header className="story-chapter-heading">
        <div>
          <p className="story-kicker">
            {adventure?.interest} · Kapittel {adventure?.number}
          </p>
          <h2>{adventure?.title}</h2>
        </div>
        <ol className="story-steps" aria-label="Oppdrag i kapittelet">
          {Array.from({ length: adventure?.total ?? 6 }, (_, i) => (
            <li
              key={i}
              aria-current={i + 1 === adventure?.mission ? 'step' : undefined}
              className={i + 1 < (adventure?.mission ?? 1) ? 'complete' : ''}
            >
              <span>{i + 1}</span>
            </li>
          ))}
        </ol>
      </header>
      {scene.previousEvent && (
        <p className="story-recap">Tidligere: {scene.previousEvent}</p>
      )}
      <div className="story-mission-heading">
        <h3>{scene.title}</h3>
        <span>
          Oppdrag {adventure?.mission} av {adventure?.total}
        </span>
      </div>
      <StoryWorld
        scene={scene}
        state={state}
        value={n}
        allocations={allocations}
        targetCount={
          task.interaction?.math.kind === 'groups'
            ? task.interaction.math.total
            : task.interaction?.math.kind === 'share'
              ? task.interaction.math.total
              : undefined
        }
      />
      <div className="story-cast" aria-label="Med på oppdraget">
        {actors.map((actor) => (
          <span key={actor.name}>
            <ActorPortrait actor={actor} />
            <strong>{actor.name}</strong>
          </span>
        ))}
      </div>
      <div className="story-dialogue">
        <ActorPortrait actor={speaker} />
        <div>
          <p className="story-before">{scene.before}</p>
          <p>
            <strong>{scene.speaker}:</strong> «{scene.dialogue}»
          </p>
        </div>
      </div>
      {scene.branch && <p className="story-branch">◈ {scene.branch}</p>}
      <div className="story-play-layout">
        <div className="story-console">
          {task.visual.type === 'figur3d' && task.visual.shape && (
            <SolidExplorer
              shape={task.visual.shape}
              count={task.visual.count}
              property={task.visual.property}
            />
          )}
          {task.visual.steps.length > 0 && (
            <p>Følg programmet: {task.visual.steps.join(' → ')}</p>
          )}
          {(task.visual.type === 'figur2d' || task.visual.steps.length > 0) && (
            <Manipulatives
              visual={task.visual}
              disabled={disabled}
              onAnswer={(answer) => {
                if (
                  answer &&
                  typeof answer === 'object' &&
                  'x' in answer &&
                  'y' in answer
                ) {
                  update(String(answer.x));
                  setSecond(String(answer.y));
                }
              }}
            />
          )}
          <p className="story-clue">{scene.clue}</p>
          <h3 id="task-question">{task.question}</h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            {allocations.length ? (
              <fieldset className="story-distribution">
                <legend>{scene.container}</legend>
                <p>
                  {task.interaction?.math.kind === 'share'
                    ? `Fordel ${task.interaction.math.total} ${scene.object} likt.`
                    : `Gjør ${allocations.length} ${scene.container} klare.`}
                </p>
                <div className="story-targets">
                  {allocations.map((count, i) => (
                    <div className="story-target" key={i}>
                      <span>
                        {scene.container} {i + 1}
                      </span>
                      <div className="story-target-objects" aria-hidden="true">
                        {Array.from({ length: Math.min(count, 12) }, (_, j) => (
                          <ResourceGlyph
                            key={j}
                            glyph={scene.glyph}
                            size={25}
                          />
                        ))}
                      </div>
                      <div className="story-target-controls">
                        <button
                          type="button"
                          disabled={disabled || !count}
                          aria-label={`Ta én fra ${scene.container} ${i + 1}`}
                          onClick={() => allocate(i, count - 1)}
                        >
                          −
                        </button>
                        <label>
                          <span className="sr-only">
                            Antall i {scene.container} {i + 1}
                          </span>
                          <input
                            inputMode="numeric"
                            value={count}
                            disabled={disabled}
                            onChange={(e) => {
                              if (/^\d*$/.test(e.target.value))
                                allocate(i, Number(e.target.value));
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={disabled || count >= 999}
                          aria-label={`Legg én i ${scene.container} ${i + 1}`}
                          onClick={() => allocate(i, count + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p aria-live="polite">
                  Lagt ut: {allocations.reduce((a, b) => a + b, 0)}{' '}
                  {scene.object}.
                </p>
              </fieldset>
            ) : task.answerType === 'choice' ? (
              <div className="story-answer-options">
                {task.choices.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    aria-pressed={choice === option}
                    onClick={() => {
                      setChoice(option);
                      setEdited(true);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : scene.action === 'route' &&
              task.interaction?.kind === 'compare' ? (
              <div className="story-answer-options">
                {task.interaction.options.map((amount) => (
                  <button
                    type="button"
                    key={amount}
                    disabled={disabled}
                    aria-pressed={n === amount && !!value}
                    onClick={() => update(String(amount))}
                  >
                    <ResourceGlyph glyph={scene.glyph} />
                    <strong>{amount}</strong> {scene.object}
                  </button>
                ))}
              </div>
            ) : (
              <div className="story-resource-control">
                <button
                  type="button"
                  disabled={disabled || !n}
                  aria-label="Ta bort én"
                  onClick={() => update(String(n - 1))}
                >
                  −
                </button>
                <label>
                  {task.answerType === 'remainder'
                    ? 'Fulle beholdere'
                    : 'Svaret ditt'}
                  <input
                    autoComplete="off"
                    inputMode="numeric"
                    disabled={disabled}
                    value={value}
                    onChange={(e) => update(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={disabled || n >= 999}
                  aria-label="Legg til én"
                  onClick={() => update(String(n + 1))}
                >
                  + <ResourceGlyph glyph={scene.glyph} />
                </button>
              </div>
            )}
            {two && (
              <label>
                {task.answerType === 'remainder' ? 'Til overs' : 'y (oppover)'}
                <input
                  inputMode="numeric"
                  disabled={disabled}
                  value={second}
                  onChange={(e) => {
                    setSecond(e.target.value);
                    setEdited(true);
                  }}
                />
              </label>
            )}
            {task.expressionRequired && (
              <label className="story-expression">
                Regnestykket ditt
                <input
                  value={expression}
                  disabled={disabled}
                  maxLength={120}
                  autoComplete="off"
                  placeholder="Du kan bruke x, × eller +"
                  onChange={(e) => {
                    setExpression(e.target.value);
                    setEdited(true);
                  }}
                />
              </label>
            )}
            <div
              className="story-feedback answer-feedback"
              aria-live="polite"
              key={`${task.id}-${view.revision}`}
            >
              {task.resolved ? (
                <strong>✓ Riktig! {scene.success}</strong>
              ) : view.correct === false && !edited ? (
                <strong>
                  ↻{' '}
                  {view.lastAnswerCorrect && task.expressionRequired
                    ? 'Tallsvaret stemmer. Vis også regnestykket som passer.'
                    : `Prøv igjen. ${scene.retry}`}
                </strong>
              ) : (
                <span>Løs utfordringen, så fortsetter reisen.</span>
              )}
            </div>
            <div className="story-actions">
              <button
                className="primary"
                type={task.resolved ? 'button' : 'submit'}
                disabled={
                  busy || (task.resolved ? !!adventure?.choice : !canSubmit)
                }
                onClick={
                  task.resolved ? () => onTurn({ type: 'next' }) : undefined
                }
              >
                {busy
                  ? 'Vi lagrer …'
                  : task.resolved
                    ? 'Fortsett eventyret →'
                    : 'Sjekk svaret'}
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onTurn({ type: 'hint' })}
              >
                Jeg vil ha et hint
              </button>
            </div>
          </form>
          {adventure?.choice && (
            <RouteChoice
              key={task.id}
              choice={adventure.choice}
              busy={busy}
              onChoose={(option, remaining) =>
                onTurn({ type: 'choice', itemId: task.id, option, remaining })
              }
            />
          )}
        </div>
        <div className="story-teacher">{teacher}</div>
      </div>
      {adventure?.journey && (
        <details className="story-journal">
          <summary>Reisen vår · {adventure.journey.title}</summary>
          <p>{adventure.journey.goal}</p>
          {adventure.journey.chapters.map((chapter) => (
            <div key={chapter.number}>
              <strong>
                Kapittel {chapter.number}: {chapter.title}
              </strong>
              <ul>
                {chapter.events.map((event) => (
                  <li key={event.id}>{event.outcome}</li>
                ))}
              </ul>
              {chapter.choices.map((choice, i) => (
                <p key={i}>◈ {choice}</p>
              ))}
            </div>
          ))}
          {adventure.journey.inventory.length > 0 && (
            <p>Vi har med: {adventure.journey.inventory.join(', ')}.</p>
          )}
        </details>
      )}
    </section>
  );
}
