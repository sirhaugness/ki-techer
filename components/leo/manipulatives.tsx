'use client';
import { useState } from 'react';
import type { PublicTask } from '@/lib/learning/types';
export function Manipulatives({
  visual,
  onAnswer,
  disabled,
}: {
  visual: PublicTask['visual'];
  onAnswer: (answer: unknown) => void;
  disabled: boolean;
}) {
  const [assigned, setAssigned] = useState<(number | null)[]>(
    Array.from({ length: Math.min(visual.count, 200) }, () => null),
  );
  const [selected, setSelected] = useState<number | null>(null),
    [groups, setGroups] = useState(0),
    [hops, setHops] = useState(0);
  const [tens, setTens] = useState(0),
    [ones, setOnes] = useState(0),
    [rotation, setRotation] = useState(0);
  const [x, setX] = useState(0),
    [y, setY] = useState(0),
    [steps, setSteps] = useState<string[]>([]);
  const [rows, setRows] = useState(1),
    [columns, setColumns] = useState(1),
    [loops, setLoops] = useState(2),
    [condition, setCondition] = useState('høyre');
  if (visual.shape)
    return (
      <div className="manipulative">
        <h3>Utforsk figuren</h3>
        <svg
          viewBox="0 0 220 150"
          className="shape-view"
          role="img"
          aria-label={visual.shape}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {visual.type === 'figur3d' ? (
            <path
              d={
                visual.shape === 'trekantet pyramide'
                  ? 'M110 20L40 120L180 120ZM110 20L110 80L40 120M110 80L180 120'
                  : visual.shape === 'firkantet pyramide'
                    ? 'M110 10L35 100L100 140L185 100L120 70L35 100M110 10L100 140M110 10L185 100M110 10L120 70'
                    : visual.shape === 'trekantet prisme'
                      ? 'M40 110L75 25L110 110L175 100L140 15L75 25M140 15L110 110M40 110L175 100'
                      : 'M40 45L130 45L130 130L40 130ZM40 45L80 15L170 15L170 100L130 130M130 45L170 15M40 130L80 100L170 100M80 100L80 15'
              }
              fill="#d8b75e"
              fillOpacity=".45"
              stroke="#31574e"
              strokeWidth="3"
            />
          ) : (
            <polygon
              points={
                visual.shape === 'trekant'
                  ? '110,15 30,130 190,130'
                  : visual.shape === 'rektangel'
                    ? '25,40 195,40 195,120 25,120'
                    : visual.shape.includes('sekskant')
                      ? '65,20 155,20 195,75 155,130 65,130 25,75'
                      : visual.shape.includes('åttekant')
                        ? '70,15 150,15 195,50 195,100 150,140 70,140 25,100 25,50'
                        : '50,20 170,20 170,140 50,140'
              }
              fill="#d8b75e"
              stroke="#31574e"
              strokeWidth="3"
            />
          )}
        </svg>
        <p>{visual.shape}</p>
        <p>Antall slike figurer i oppgaven: {visual.count}</p>
        <button type="button" onClick={() => setRotation((r) => r + 30)}>
          Roter figuren
        </button>
      </div>
    );
  if (visual.steps.length)
    return (
      <div className="manipulative">
        <h3>Gi figuren instruksjoner</h3>
        <p>Start nederst til venstre. Opp betyr at y øker.</p>
        <div
          className="algorithm-board"
          role="img"
          aria-label={`Figuren står på x ${x}, y ${y}`}
        >
          <span style={{ left: `${x * 10}%`, bottom: `${y * 10}%` }}>🌱</span>
        </div>
        <p>Din sti: {steps.join(' → ') || 'Ingen steg ennå'}</p>
        <div className="button-row">
          <button
            onClick={() => {
              setX((v) => Math.min(9, v + 1));
              setSteps((s) => [...s, 'høyre']);
            }}
          >
            Gå høyre
          </button>
          <button
            onClick={() => {
              setY((v) => Math.min(9, v + 1));
              setSteps((s) => [...s, 'opp']);
            }}
          >
            Gå opp
          </button>
          <button
            onClick={() => {
              setX(0);
              setY(0);
              setSteps([]);
            }}
          >
            Start på nytt
          </button>
        </div>
        <label>
          Antall gjentakelser
          <input
            type="number"
            min="1"
            max="5"
            value={loops}
            onChange={(e) =>
              setLoops(Math.max(1, Math.min(5, Number(e.target.value))))
            }
          />
        </label>
        <label>
          Hvis x er mindre enn fem, gå
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option value="høyre">høyre</option>
            <option value="opp">opp</option>
          </select>
        </label>
        <button
          onClick={() => {
            const direction = x < 5 ? condition : 'opp';
            if (direction === 'høyre') setX((v) => Math.min(9, v + loops));
            else setY((v) => Math.min(9, v + loops));
            setSteps((s) => [...s, `Gjenta ${loops}: ${direction}`]);
          }}
        >
          Kjør løkken med vilkår
        </button>
        <button disabled={disabled} onClick={() => onAnswer({ x, y })}>
          Bruk posisjonen som svar
        </button>
      </div>
    );
  if (visual.type === 'tallinje')
    return (
      <div className="manipulative">
        <h3>Hopp på tallinjen</h3>
        <p aria-live="polite">
          Du står på {hops * visual.groups}. Du har tatt {hops} hopp.
        </p>
        <svg
          viewBox="0 0 400 70"
          role="img"
          aria-label="Tallinje med like hopp"
        >
          <path d="M10 50H390" stroke="#31574e" strokeWidth="3" />
          {Array.from({ length: Math.min(hops, 25) }, (_, i) => (
            <path
              key={i}
              d={`M${10 + i * 14} 50q7-40 14 0`}
              fill="none"
              stroke="#b56836"
              strokeWidth="2"
            />
          ))}
        </svg>
        <div className="button-row">
          <button onClick={() => setHops((n) => Math.min(100, n + 1))}>
            Hopp {visual.groups} frem
          </button>
          <button onClick={() => setHops((n) => Math.max(0, n - 1))}>
            Ett hopp tilbake
          </button>
          <button disabled={disabled} onClick={() => onAnswer(hops)}>
            Bruk antall hopp
          </button>
        </div>
      </div>
    );
  if (visual.type === 'tierblokker')
    return (
      <div className="manipulative">
        <h3>Bygg et tall</h3>
        <p>
          {tens} tiere og {ones} enere
        </p>
        <div className="blocks" aria-label="Dine tierblokker">
          {Array.from({ length: tens }, (_, i) => (
            <span className="ten-block" key={`t${i}`}>
              ▦
            </span>
          ))}
          {Array.from({ length: ones }, (_, i) => (
            <span key={`o${i}`}>■</span>
          ))}
        </div>
        <div className="button-row">
          <button onClick={() => setTens((n) => Math.min(20, n + 1))}>
            Legg til en tier
          </button>
          <button onClick={() => setOnes((n) => Math.min(20, n + 1))}>
            Legg til en ener
          </button>
          <button
            onClick={() => {
              setTens(0);
              setOnes(0);
            }}
          >
            Tøm
          </button>
          <button
            disabled={disabled}
            onClick={() => onAnswer(tens * 10 + ones)}
          >
            Bruk tallet
          </button>
        </div>
      </div>
    );
  if (visual.type === 'maaling')
    return (
      <div className="manipulative">
        <h3>Lag grupper på {visual.groups}</h3>
        <p>
          {Math.max(0, visual.count - groups * visual.groups)} klosser igjen
        </p>
        <div className="blocks">
          {Array.from({ length: groups }, (_, i) => (
            <span className="group-block" key={i}>
              {'●'.repeat(visual.groups)}
            </span>
          ))}
        </div>
        <div className="button-row">
          <button
            disabled={groups * visual.groups >= visual.count}
            onClick={() => setGroups((n) => n + 1)}
          >
            Lag en gruppe
          </button>
          <button onClick={() => setGroups((n) => Math.max(0, n - 1))}>
            Ta bort en gruppe
          </button>
          <button disabled={disabled} onClick={() => onAnswer(groups)}>
            Bruk antall grupper
          </button>
        </div>
      </div>
    );
  if (visual.type === 'grupper')
    return (
      <div className="manipulative">
        <h3>Del ut klossene</h3>
        <p>Trykk på en kloss, og så på en gruppe. Du kan også dra klossen.</p>
        <div className="object-pool" aria-label="Klosser som ikke er delt ut">
          {assigned.map((group, i) =>
            group === null ? (
              <button
                key={i}
                type="button"
                draggable
                aria-pressed={selected === i}
                aria-label={`Velg kloss ${i + 1}`}
                onDragStart={(e) =>
                  e.dataTransfer.setData('text/plain', String(i))
                }
                onClick={() => setSelected(i)}
              >
                ●
              </button>
            ) : null,
          )}
        </div>
        <div className="group-list">
          {Array.from({ length: Math.min(visual.groups, 20) }, (_, group) => (
            <button
              key={group}
              type="button"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const i = Number(e.dataTransfer.getData('text/plain'));
                if (Number.isInteger(i) && i >= 0 && i < assigned.length)
                  setAssigned((a) => a.map((v, j) => (j === i ? group : v)));
              }}
              onClick={() => {
                if (selected !== null) {
                  setAssigned((a) =>
                    a.map((v, j) => (j === selected ? group : v)),
                  );
                  setSelected(null);
                }
              }}
            >
              Gruppe {group + 1}
              <span
                aria-label={`${assigned.filter((v) => v === group).length} klosser`}
              >
                {'●'.repeat(assigned.filter((v) => v === group).length)}
              </span>
            </button>
          ))}
        </div>
        <div className="button-row">
          <button onClick={() => setAssigned((a) => a.map(() => null))}>
            Begynn på nytt
          </button>
          <button
            disabled={disabled}
            onClick={() => onAnswer(assigned.filter((v) => v === 0).length)}
          >
            Bruk antall i første gruppe
          </button>
        </div>
      </div>
    );
  return (
    <div className="manipulative">
      <h3>Bygg et rutenett</h3>
      <div className="button-row">
        <label>
          Rader
          <input
            type="number"
            min="1"
            max="12"
            value={rows}
            onChange={(e) =>
              setRows(Math.max(1, Math.min(12, Number(e.target.value))))
            }
          />
        </label>
        <label>
          Kolonner
          <input
            type="number"
            min="1"
            max="12"
            value={columns}
            onChange={(e) =>
              setColumns(Math.max(1, Math.min(12, Number(e.target.value))))
            }
          />
        </label>
      </div>
      <div
        className="array-grid"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        role="img"
        aria-label={`${rows} rader og ${columns} kolonner`}
      >
        {Array.from({ length: rows * columns }, (_, i) => (
          <span key={i}>●</span>
        ))}
      </div>
      <button disabled={disabled} onClick={() => onAnswer(rows * columns)}>
        Bruk antall ruter
      </button>
    </div>
  );
}
