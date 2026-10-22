'use client';

import type { Control, Work } from '@/lib/star-wars/contracts';
import { Plate } from './prepared-scene';
import styles from './star-wars-controls.module.css';

type Props = {
  control: Control;
  work: Work;
  disabled: boolean;
  onChange: (work: Work) => void;
  missionId: string;
};

const directions = [
  { id: 'right', label: 'Høyre →' },
  { id: 'up', label: 'Opp ↑' },
  { id: 'left', label: 'Venstre ←' },
  { id: 'down', label: 'Ned ↓' },
] as const;

export function StarWarsControls({
  control,
  work,
  disabled,
  onChange,
  missionId,
}: Props) {
  const total = work.groups.reduce((sum, count) => sum + count, 0);
  const plate =
    work.choice === 'A' || work.choice === 'B' || work.choice === 'C'
      ? work.choice
      : null;
  const cornerCount = plate === 'A' ? 3 : 4;
  const options = control.options ?? [];

  function select(id: string) {
    onChange({ ...work, choice: id });
  }

  return (
    <div className={styles.controls} data-mission={missionId}>
      {control.kind === 'groups' && (
        <>
          <div className={styles.bank}>
            <p aria-live="polite" aria-atomic="true">
              <strong>{24 - total}</strong> av 24 energiceller igjen å fordele
            </p>
            <div className={styles.bankCells} aria-hidden="true">
              {Array.from({ length: 24 - total }, (_, i) => (
                <span className={styles.cell} key={i} />
              ))}
            </div>
          </div>
          <div className={styles.shields}>
            {work.groups.map((count, index) => (
              <div className={styles.shield} key={index}>
                <h3>Skjoldfelt {index + 1}</h3>
                <div className={styles.shieldCells} aria-hidden="true">
                  {Array.from({ length: count }, (_, i) => (
                    <span className={styles.cell} key={i} />
                  ))}
                </div>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    disabled={disabled || count === 0}
                    aria-label={`Ta én energicelle fra skjoldfelt ${index + 1}`}
                    onClick={() =>
                      onChange({
                        ...work,
                        groups: work.groups.map((value, i) =>
                          i === index ? value - 1 : value,
                        ),
                      })
                    }
                  >
                    −
                  </button>
                  <output aria-label={`Energiceller i skjoldfelt ${index + 1}`}>
                    {count}
                  </output>
                  <button
                    type="button"
                    disabled={disabled || total === 24}
                    aria-label={`Legg én energicelle i skjoldfelt ${index + 1}`}
                    onClick={() =>
                      onChange({
                        ...work,
                        groups: work.groups.map((value, i) =>
                          i === index ? value + 1 : value,
                        ),
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {control.kind === 'route' && (
        <figure className={styles.routeMap}>
          <svg
            viewBox="0 0 520 300"
            role="img"
            aria-label={`Navigasjonskart: 2, 5, 8, 11. Deretter deler banen seg i ${options.length} ruter. ${options.map((option, i) => `Rute ${i + 1}: ${option.values?.join(', ') ?? option.label}`).join('. ')}`}
          >
            <rect width="520" height="300" rx="18" fill="#10283f" />
            <path
              d="M30 150H210"
              fill="none"
              stroke="#c8e5eb"
              strokeWidth="4"
            />
            {[2, 5, 8, 11].map((value, index) => (
              <g key={value}>
                <circle cx={30 + index * 60} cy="150" r="20" fill="#f5f5e9" />
                <text
                  x={30 + index * 60}
                  y="157"
                  textAnchor="middle"
                  fill="#10283f"
                >
                  {value}
                </text>
              </g>
            ))}
            {options.map((option, index) => {
              const y = 50 + index * 100;
              const chosen = work.choice === option.id;
              return (
                <g key={option.id}>
                  <path
                    d={`M230 150Q270 150 300 ${y}H465`}
                    fill="none"
                    stroke={chosen ? '#f7ca73' : '#a1bdcd'}
                    strokeWidth={chosen ? 7 : 3}
                    strokeDasharray={chosen ? undefined : '8 5'}
                  />
                  <text x="300" y={y - 24} fill="#fff8e8">
                    {chosen ? '✓ ' : ''}Rute {index + 1}
                  </text>
                  {(option.values ?? []).map((value, position) => (
                    <g key={position}>
                      <circle
                        cx={335 + position * 90}
                        cy={y}
                        r="22"
                        fill={chosen ? '#f7ca73' : '#e2edf0'}
                      />
                      <text
                        x={335 + position * 90}
                        y={y + 7}
                        textAnchor="middle"
                        fill="#10283f"
                      >
                        {value}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
          <figcaption>Følg kodene og velg en av rutene nedenfor.</figcaption>
        </figure>
      )}

      {control.kind === 'program' && (
        <>
          <figure className={styles.programMap}>
            <svg
              viewBox="0 0 340 235"
              role="img"
              aria-label="Kart med start på (0,0) og mål på (4,2). Den trygge trappestien går to ruter mot høyre og én opp, to ganger."
            >
              <rect width="340" height="235" rx="18" fill="#f1f5f2" />
              {Array.from({ length: 6 }, (_, x) => (
                <g key={`x-${x}`}>
                  <path
                    d={`M${45 + x * 48} 38V182`}
                    stroke="#9baeb4"
                    strokeWidth="1"
                  />
                  <text x={45 + x * 48} y="211" textAnchor="middle">
                    {x}
                  </text>
                </g>
              ))}
              {Array.from({ length: 4 }, (_, y) => (
                <g key={`y-${y}`}>
                  <path
                    d={`M45 ${182 - y * 48}H285`}
                    stroke="#9baeb4"
                    strokeWidth="1"
                  />
                  <text x="22" y={189 - y * 48} textAnchor="middle">
                    {y}
                  </text>
                </g>
              ))}
              <path
                d="M45 182H141V134H237V86"
                fill="none"
                stroke="#1c746c"
                strokeWidth="7"
                strokeLinejoin="round"
              />
              <circle cx="45" cy="182" r="10" fill="#10283f" />
              <path d="M225 75h24v22h-24Z" fill="#b4771c" />
              <text x="53" y="166">
                Start
              </text>
              <text x="250" y="79">
                Mål
              </text>
              <text x="312" y="211">
                x
              </text>
              <text x="19" y="23">
                y
              </text>
            </svg>
            <figcaption>Bygg pilrekken som følger den trygge stien.</figcaption>
          </figure>
          <fieldset className={styles.loop} disabled={disabled}>
            <legend>Gjenta 2 ganger</legend>
            <div className={styles.commands}>
              {[0, 1, 2].map((index) => (
                <label key={index}>
                  Steg {index + 1}
                  <select
                    value={work.commands[index] ?? ''}
                    disabled={disabled || index > work.commands.length}
                    onChange={(event) => {
                      const selected = directions.find(
                        (direction) => direction.id === event.target.value,
                      );
                      if (!selected) return;
                      const commands = [...work.commands];
                      commands[index] = selected.id;
                      onChange({ ...work, commands });
                    }}
                  >
                    <option value="" disabled>
                      Velg pil
                    </option>
                    {directions.map((direction) => (
                      <option key={direction.id} value={direction.id}>
                        {direction.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {control.kind === 'shape' && (
        <>
          <div
            className={styles.plates}
            role="group"
            aria-label="Velg en nøkkel"
          >
            {(['A', 'B', 'C'] as const).map((id) => (
              <button
                type="button"
                key={id}
                disabled={disabled}
                aria-pressed={plate === id}
                aria-label={`Velg nøkkel ${id}`}
                className={plate === id ? styles.selected : undefined}
                onClick={() =>
                  onChange({
                    ...work,
                    choice: id,
                    corners: plate === id ? work.corners : [],
                  })
                }
              >
                <span className={styles.plateLabel}>
                  {plate === id ? '✓ ' : ''}Nøkkel {id}
                </span>
                <span
                  className={
                    control.rotated && id === 'B'
                      ? styles.rotatedPlate
                      : styles.plateDrawing
                  }
                >
                  <Plate
                    id={id}
                    selected={false}
                    corners={[]}
                    template={false}
                  />
                </span>
              </button>
            ))}
          </div>
          {plate && (
            <fieldset className={styles.cornerPicker} disabled={disabled}>
              <legend>Marker de rette vinklene på nøkkel {plate}</legend>
              <div className={styles.platePreview}>
                <div
                  className={
                    control.rotated && plate === 'B'
                      ? styles.rotatedPlate
                      : styles.plateDrawing
                  }
                >
                  <Plate
                    id={plate}
                    selected
                    corners={work.corners}
                    template={false}
                  />
                </div>
              </div>
              <div className={styles.cornerButtons}>
                {Array.from({ length: cornerCount }, (_, corner) => (
                  <button
                    type="button"
                    key={corner}
                    aria-pressed={work.corners.includes(corner)}
                    className={
                      work.corners.includes(corner)
                        ? styles.selected
                        : undefined
                    }
                    onClick={() =>
                      onChange({
                        ...work,
                        corners: work.corners.includes(corner)
                          ? work.corners.filter((value) => value !== corner)
                          : [...work.corners, corner],
                      })
                    }
                  >
                    {work.corners.includes(corner) ? '✓ ' : ''}Hjørne{' '}
                    {corner + 1}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}

      {control.kind === 'numbers' && control.grid && (
        <figure className={styles.floor}>
          <div
            className={styles.floorGrid}
            style={{
              gridTemplateColumns: `repeat(${control.grid.columns}, 1fr)`,
            }}
            role="img"
            aria-label={`${control.grid.columns} meter langs den ene siden, ${control.grid.rows} meter langs den andre. Hver rute dekker én kvadratmeter.`}
          >
            {Array.from(
              { length: control.grid.columns * control.grid.rows },
              (_, index) => (
                <span key={index} />
              ),
            )}
          </div>
          <figcaption>
            {control.grid.columns} m × {control.grid.rows} m. Hver rute er 1 m².
          </figcaption>
        </figure>
      )}

      {control.kind === 'numbers' && (
        <div className={styles.numbers}>
          {control.labels.map((label, index) => (
            <label
              key={`${index}-${label}`}
              htmlFor={`${missionId}-number-${index}`}
            >
              {label}
              <input
                id={`${missionId}-number-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                value={work.numbers[index] ?? ''}
                disabled={disabled}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!/^\d{0,3}$/.test(value)) return;
                  const numbers = control.labels.map(
                    (_, i) => work.numbers[i] ?? null,
                  );
                  numbers[index] = value === '' ? null : Number(value);
                  onChange({ ...work, numbers });
                }}
              />
            </label>
          ))}
        </div>
      )}

      {options.length > 0 &&
        ['route', 'choice', 'ending', 'numbers'].includes(control.kind) && (
          <div className={styles.options} role="group" aria-label="Velg svar">
            {options.map((option, index) => (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                aria-pressed={work.choice === option.id}
                className={
                  work.choice === option.id ? styles.selected : undefined
                }
                onClick={() => select(option.id)}
              >
                <span>
                  {work.choice === option.id ? '✓ ' : ''}
                  {control.kind === 'route' ? `Rute ${index + 1}: ` : ''}
                  {option.label}
                </span>
                {control.kind === 'route' && option.values && (
                  <span className={styles.routeValues}>
                    {option.values.join(' → ')}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
