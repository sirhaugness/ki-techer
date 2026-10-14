'use client';
import { useState } from 'react';
import type { PublicTask } from '@/lib/learning/types';
import { CargoGlyph } from './world-art';

export function ExpressionChoice({
  task,
  value,
  disabled,
  onChange,
}: {
  task: PublicTask;
  value: string;
  disabled: boolean;
  onChange: (answer: string) => void;
}) {
  const numbers = [
    ...new Set(task.choices.flatMap((c) => c.match(/\d+/g) ?? [])),
  ];
  const previous = /^(\d+)\s*([+−×:/\*-])\s*(\d+)$/.exec(value);
  const [left, setLeft] = useState(previous?.[1] ?? '');
  const [operator, setOperator] = useState(
    previous?.[2] === '/' ? ':' : (previous?.[2] ?? ''),
  );
  const [right, setRight] = useState(previous?.[3] ?? '');
  function build(a: string, op: string, b: string) {
    setLeft(a);
    setOperator(op);
    setRight(b);
    onChange(a && op && b ? `${a} ${op} ${b}` : '');
  }
  return (
    <fieldset className="mission-controls">
      <legend>Bygg regneuttrykket på panelet</legend>
      <p>Velg et tall, et regnetegn og et tall til.</p>
      <output className="built-expression" aria-live="polite">
        {value || `${left || '?'} ${operator || '?'} ${right || '?'}`}
      </output>
      <div className="expression-slots">
        <fieldset>
          <legend>Første tall</legend>
          {numbers.map((n) => (
            <button
              type="button"
              disabled={disabled}
              key={n}
              aria-pressed={left === n}
              onClick={() => build(n, operator, right)}
            >
              {n}
            </button>
          ))}
        </fieldset>
        <fieldset>
          <legend>Regnetegn</legend>
          {['+', '−', '×', ':'].map((op) => (
            <button
              type="button"
              disabled={disabled}
              key={op}
              aria-pressed={operator === op}
              onClick={() => build(left, op, right)}
            >
              {op}
            </button>
          ))}
        </fieldset>
        <fieldset>
          <legend>Siste tall</legend>
          {numbers.map((n) => (
            <button
              type="button"
              disabled={disabled}
              key={n}
              aria-pressed={right === n}
              onClick={() => build(left, operator, n)}
            >
              {n}
            </button>
          ))}
        </fieldset>
      </div>
    </fieldset>
  );
}

export function SceneChoice({
  task,
  value,
  disabled,
  onChange,
}: {
  task: PublicTask;
  value: string;
  disabled: boolean;
  onChange: (answer: string) => void;
}) {
  return (
    <fieldset className="mission-controls">
      <legend>Velg tegningen som passer til regnestykket</legend>
      <div className="scene-options">
        {task.choices.map((option) => {
          const [total, groups] = option.match(/\d+/g)!.map(Number);
          const share = option.startsWith('Del');
          const add = option.startsWith('Legg');
          return (
            <button
              type="button"
              key={option}
              disabled={disabled}
              aria-pressed={value === option}
              onClick={() => onChange(option)}
            >
              <svg viewBox="0 0 190 100" aria-hidden="true">
                {share ? (
                  <>
                    <rect
                      x="7"
                      y="5"
                      width="176"
                      height="31"
                      rx="6"
                      fill="#e9dfb9"
                    />
                    <text
                      x="95"
                      y="26"
                      textAnchor="middle"
                      fill="#365c55"
                      fontSize="17"
                    >
                      {total} kort
                    </text>
                    {Array.from({ length: Math.min(groups, 8) }, (_, i) => (
                      <g
                        key={i}
                        transform={`translate(${9 + (i * 175) / Math.max(groups, 1)} 56)`}
                      >
                        <rect
                          width={155 / Math.max(groups, 1)}
                          height="30"
                          rx="4"
                          fill="#b8d0b2"
                        />
                        <path
                          d="M8-8V0m-4-4 4 4 4-4"
                          stroke="#648d78"
                          fill="none"
                        />
                      </g>
                    ))}
                  </>
                ) : add ? (
                  <>
                    <CargoGlyph object="kartbiter" x={20} y={30} size={32} />
                    <text x="94" y="54" fontSize="26" fill="#365c55">
                      +
                    </text>
                    <CargoGlyph object="kartbiter" x={130} y={30} size={32} />
                  </>
                ) : (
                  <>
                    <text
                      x="95"
                      y="23"
                      textAnchor="middle"
                      fontSize="17"
                      fill="#365c55"
                    >
                      {total} grupper
                    </text>
                    {[0, 1, 2].map((i) => (
                      <rect
                        key={i}
                        x={18 + i * 55}
                        y="37"
                        width="44"
                        height="42"
                        rx="5"
                        fill="#b8d0b2"
                      />
                    ))}
                    <text
                      x="95"
                      y="96"
                      textAnchor="middle"
                      fontSize="14"
                      fill="#365c55"
                    >
                      {groups} i hver
                    </text>
                  </>
                )}
              </svg>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
