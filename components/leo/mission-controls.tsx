'use client';
import type { MissionInteraction } from '@/lib/engine/mission';
import { CargoGlyph } from './world-art';

export function MissionControls({
  interaction,
  value,
  allocations,
  disabled,
  onValue,
  onAllocate,
}: {
  interaction: MissionInteraction;
  value: string;
  allocations: number[];
  disabled: boolean;
  onValue: (value: string) => void;
  onAllocate: (allocations: number[]) => void;
}) {
  const m = interaction.math;
  if (interaction.kind === 'compare')
    return (
      <fieldset className="mission-controls route-answers">
        <legend>Velg mengden som passer til regningen</legend>
        <p>Bruk mengdene i scenen. Dette blir forsyningene til rutevalget.</p>
        <div className="route-answer-grid">
          {interaction.options.map((n, i) => (
            <button
              type="button"
              key={n}
              disabled={disabled}
              aria-pressed={value === String(n)}
              onClick={() => onValue(String(n))}
            >
              <svg viewBox="0 0 96 55" aria-hidden="true">
                <path
                  d="m8 48 22-30 22 14 24-28 12 44"
                  fill="none"
                  stroke="#7ca695"
                  strokeWidth="5"
                />
                <circle cx="76" cy="5" r="5" fill="#c88d52" />
              </svg>
              <span>Alternativ {String.fromCharCode(65 + i)}</span>
              <strong>
                {n} {interaction.object}
              </strong>
            </button>
          ))}
        </div>
      </fieldset>
    );
  if (interaction.kind === 'grouping')
    return (
      <fieldset className="mission-controls grouping-controls">
        <legend>Gjør {interaction.container} klare</legend>
        <p>
          {m.kind === 'share'
            ? `Fordel ${m.total} ${interaction.object} likt i ${m.groups} ${interaction.container}.`
            : `Fyll ${m.groups} ${interaction.container}. Hver skal ha ${m.each} ${interaction.object}.`}
        </p>
        <div className="group-trays">
          {allocations.map((count, i) => (
            <div className="group-tray" key={i}>
              <span>Gruppe {i + 1}</span>
              <svg
                viewBox="0 0 144 90"
                role="img"
                aria-label={`Gruppe ${i + 1}: ${count} ${interaction.object}`}
              >
                <rect
                  x="1"
                  y="1"
                  width="142"
                  height="88"
                  rx="12"
                  fill="#e9e6c9"
                  stroke="#b7b99d"
                />
                {Array.from({ length: Math.min(count, 24) }, (_, j) => (
                  <CargoGlyph
                    key={j}
                    object={interaction.object}
                    x={8 + (j % 6) * 22}
                    y={8 + Math.floor(j / 6) * 20}
                    size={17}
                  />
                ))}
              </svg>
              {count > 24 && <small>Tegningen viser et utsnitt.</small>}
              <div className="tray-actions">
                <button
                  type="button"
                  aria-label={`Ta én fra gruppe ${i + 1}`}
                  disabled={disabled || count === 0}
                  onClick={() =>
                    onAllocate(allocations.map((n, j) => (j === i ? n - 1 : n)))
                  }
                >
                  −
                </button>
                <output>{count}</output>
                <button
                  type="button"
                  aria-label={`Legg én i gruppe ${i + 1}`}
                  disabled={disabled || count >= 99}
                  onClick={() =>
                    onAllocate(allocations.map((n, j) => (j === i ? n + 1 : n)))
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <p aria-live="polite">
          Du har lagt ut {allocations.reduce((a, b) => a + b, 0)}{' '}
          {interaction.object}.
        </p>
      </fieldset>
    );
  if (interaction.kind !== 'quantity') return null;
  const n = /^\d+$/.test(value) ? Number(value) : 0;
  return (
    <fieldset className="mission-controls quantity-controls">
      <legend>Fyll mengden som mangler</legend>
      <p>
        Legg til og ta bort {interaction.object}. Du kan også skrive tallet.
      </p>
      <div className="quantity-preview" aria-hidden="true">
        <svg viewBox="0 0 390 110">
          {Array.from({ length: Math.min(n, 30) }, (_, i) => (
            <CargoGlyph
              key={i}
              object={interaction.object}
              x={8 + (i % 15) * 25}
              y={10 + Math.floor(i / 15) * 43}
              size={22}
            />
          ))}
        </svg>
        {n > 30 && (
          <small>
            Tegningen viser de første 30. Tallet viser hele mengden.
          </small>
        )}
      </div>
      <div className="quantity-stepper">
        <button
          type="button"
          disabled={disabled || n === 0}
          aria-label="Ta bort én"
          onClick={() => onValue(String(n - 1))}
        >
          −
        </button>
        <label>
          Svaret ditt
          <input
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            value={value}
            onChange={(e) => onValue(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={disabled || n >= 999}
          aria-label="Legg til én"
          onClick={() => onValue(String(n + 1))}
        >
          +
        </button>
      </div>
    </fieldset>
  );
}
