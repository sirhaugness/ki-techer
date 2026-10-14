'use client';
import { useState, type ReactNode } from 'react';
import type { PublicTask } from '@/lib/learning/types';
export function AnswerPanel({
  task,
  busy,
  onAnswer,
  teacher,
  onNext,
}: {
  task: PublicTask;
  busy: boolean;
  onAnswer: (answer: unknown) => void;
  teacher?: ReactNode;
  onNext?: () => void;
}) {
  const previous = task.submittedAnswer;
  const initialValues = () => {
    if (previous && typeof previous === 'object' && !Array.isArray(previous)) {
      if ('value' in previous) return [String(previous.value), ''];
      if ('quotient' in previous)
        return [String(previous.quotient), String(previous.remainder)];
      if ('x' in previous) return [String(previous.x), String(previous.y)];
    }
    return [
      previous === undefined
        ? ''
        : Array.isArray(previous)
          ? previous.join(', ')
          : String(previous),
      '',
    ];
  };
  const [values, setValues] = useState(initialValues),
    [field, setField] = useState(0),
    [choice, setChoice] = useState(
      typeof previous === 'string' ? previous : '',
    ),
    [expression, setExpression] = useState(
      previous &&
        typeof previous === 'object' &&
        !Array.isArray(previous) &&
        'expression' in previous
        ? previous.expression
        : '',
    );
  const two =
    task.answerType === 'remainder' || task.answerType === 'coordinate';
  const valid = values
    .slice(0, two ? 2 : 1)
    .every((v) => /^-?\d+(?:[.,]\d+)?$/.test(v));
  const update = (value: string, index = field) =>
    setValues((v) => v.map((old, i) => (i === index ? value : old)));
  const submit = () => {
    if (busy || task.resolved) return;
    if (task.answerType === 'choice') {
      if (choice) onAnswer(choice);
      return;
    }
    if (task.answerType === 'sequence') {
      onAnswer(
        values[0]
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      );
      return;
    }
    if (!valid) return;
    const n = values.map((v) => Number(v.replace(',', '.')));
    onAnswer(
      task.answerType === 'remainder'
        ? { quotient: n[0], remainder: n[1] }
        : task.answerType === 'coordinate'
          ? { x: n[0], y: n[1] }
          : task.expressionRequired
            ? { value: n[0], expression }
            : n[0],
    );
  };
  return (
    <form
      className="answer-panel"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {task.answerType === 'choice' ? (
        <div className="choice-list">
          {task.choices.map((option) => (
            <button
              type="button"
              key={option}
              disabled={busy || task.resolved}
              aria-pressed={choice === option}
              onClick={() => setChoice(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="answer-fields">
            {Array.from({ length: two ? 2 : 1 }, (_, i) => (
              <label key={i}>
                {task.answerType === 'remainder'
                  ? i === 0
                    ? 'Hele grupper'
                    : 'Rest'
                  : task.answerType === 'coordinate'
                    ? i === 0
                      ? 'x (bortover)'
                      : 'y (oppover)'
                    : 'Svaret ditt'}
                <input
                  disabled={busy || task.resolved}
                  value={values[i]}
                  onFocus={() => setField(i)}
                  onChange={(e) => update(e.target.value, i)}
                  inputMode="decimal"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submit();
                    }
                  }}
                />
              </label>
            ))}
          </div>
          {task.expressionRequired && (
            <label className="expression-field">
              b) Regnestykket ditt
              <input
                value={expression}
                disabled={busy || task.resolved}
                maxLength={120}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="Bruk + eller ×"
                autoComplete="off"
              />
            </label>
          )}
          {teacher}
          <div className="number-pad" aria-label="Talltastatur">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map(
              (key) => (
                <button
                  type="button"
                  disabled={busy || task.resolved}
                  key={key}
                  aria-label={
                    key === '⌫'
                      ? 'Slett siste tegn'
                      : key === ','
                        ? 'Desimaltegn'
                        : key
                  }
                  onClick={() =>
                    update(
                      key === '⌫'
                        ? values[field].slice(0, -1)
                        : values[field].length < 12
                          ? values[field] + key
                          : values[field],
                    )
                  }
                >
                  {key}
                </button>
              ),
            )}
          </div>
        </>
      )}
      {task.answerType === 'choice' && teacher}
      <div className="answer-action">
        {task.resolved ? (
          <button
            className="primary"
            type="button"
            disabled={busy || !onNext}
            onClick={onNext}
          >
            Fortsett eventyret
          </button>
        ) : (
          <button
            className="primary"
            type="submit"
            disabled={
              busy ||
              (task.expressionRequired && !expression.trim()) ||
              (task.answerType === 'choice'
                ? !choice
                : task.answerType === 'sequence'
                  ? !values[0]
                  : !valid)
            }
          >
            Sjekk svaret
          </button>
        )}
      </div>
    </form>
  );
}
