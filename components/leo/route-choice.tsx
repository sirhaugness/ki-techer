'use client';
import { useState } from 'react';
import type { LearningView } from '@/lib/learning/types';

export function RouteChoice({
  choice,
  busy,
  onChoose,
}: {
  choice: NonNullable<NonNullable<LearningView['adventure']>['choice']>;
  busy: boolean;
  onChoose: (option: number, remaining: number) => void;
}) {
  const [option, setOption] = useState<number | null>(null);
  const [remaining, setRemaining] = useState('');
  return (
    <fieldset className="story-choice">
      <legend>Bruk regningen din til å velge veien</legend>
      <p>
        Dere har{' '}
        <strong>
          {choice.budget} {choice.unit}
        </strong>
        . Rutene gir forskjellig hjelp senere.
      </p>
      <div className="story-routes">
        {choice.options.map((route) => (
          <button
            type="button"
            key={route.id}
            disabled={busy}
            aria-pressed={option === route.id}
            onClick={() => {
              setOption(route.id);
              setRemaining('');
            }}
          >
            <strong>{route.label}</strong>
            <span>
              Bruker {route.cost} {choice.unit}.
            </span>
            <span>{route.consequence}</span>
          </button>
        ))}
      </div>
      {option !== null && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d+$/.test(remaining)) onChoose(option, Number(remaining));
          }}
        >
          <p>
            {choice.budget} − {choice.options[option].cost} = ?
          </p>
          <label>
            Forsyninger igjen
            <input
              inputMode="numeric"
              value={remaining}
              disabled={busy}
              onChange={(e) => setRemaining(e.target.value)}
            />
          </label>
          <button
            className="primary"
            disabled={busy || !/^\d+$/.test(remaining)}
          >
            Velg denne veien
          </button>
        </form>
      )}
      {choice.error && (
        <p className="route-error" role="status">
          {choice.error}
        </p>
      )}
    </fieldset>
  );
}
