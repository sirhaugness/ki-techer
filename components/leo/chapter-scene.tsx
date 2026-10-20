import type { DemoAnswer, DemoView } from '@/lib/chapters/demo-contracts';
import styles from './chapter-player.module.css';

function Mira({ x = 109, y = 159 }: { x?: number; y?: number }) {
  return (
    <g data-testid="mira" transform={`translate(${x}, ${y})`}>
      <path
        d="m-8 22-5 26h29l-5-26Z"
        fill="#f1bd5d"
        stroke="#553e40"
        strokeWidth="2"
      />
      <circle cy="13" r="10" fill="#bb8061" />
      <path d="M-12 10q2-18 23-3l3 5Z" fill="#eab055" />
      <path d="M-6 48v12m14-12v12" stroke="#443e43" strokeWidth="5" />
    </g>
  );
}
function Boat({
  docked,
  leaving,
  aboard,
}: {
  docked: boolean;
  leaving: boolean;
  aboard: boolean;
}) {
  return (
    <g
      data-testid="post-boat"
      className={`${styles.boat} ${docked ? styles.docked : ''} ${leaving ? styles.leaving : ''}`}
    >
      <path
        d="M25 221h109l-17 23H43Z"
        fill="#a24d36"
        stroke="#553e40"
        strokeWidth="3"
      />
      <path
        d="M50 220v-34h49v34"
        fill="#f6e6bd"
        stroke="#553e40"
        strokeWidth="3"
      />
      <path d="m45 186 30-23 29 23Z" fill="#517d7f" />
      <circle
        cx="75"
        cy="202"
        r="8"
        fill="#c7e5e5"
        stroke="#553e40"
        strokeWidth="3"
      />
      <path
        d="M112 219v-54l25 15-25 12"
        fill="#e6ad4f"
        stroke="#553e40"
        strokeWidth="3"
      />
      {aboard && <Mira />}
    </g>
  );
}

/** All countable teaching objects use the public R1 quantities, never an answer key. */
export function ChapterScene({
  view,
  draft,
  solved,
  phase,
  allocations,
  changeAllocation,
  disabled,
}: {
  view: DemoView;
  draft: DemoAnswer;
  solved: boolean;
  phase: string;
  allocations: number[];
  changeAllocation: (index: number, delta: number) => void;
  disabled: boolean;
}) {
  const mission = view.mission!;
  const quantity = (id: string) =>
    mission.scene.objects.find((o) => o.id === id)!.quantity!;
  const entered = /^\d+$/.test(draft.value) ? Number(draft.value) : 0;
  const description = solved
    ? view.outcome!.sceneText
    : phase === 'retry'
      ? mission.scene.feedback.reducedMotion.incorrect
      : mission.scene.feedback.reducedMotion.working;
  return (
    <div
      className={styles.scene}
      data-phase={phase}
      data-testid="chapter-scene"
    >
      <svg
        viewBox="0 0 640 270"
        role="img"
        aria-label={
          solved
            ? view.outcome!.sceneText
            : `${mission.location.name}. ${view.index === 0 ? 'Båten venter utenfor grunna. Lyktene er slukket.' : view.index === 1 ? 'Lyktene lyser. Båten ligger ved brygga. Landgangen har tomme plankeplasser.' : 'Lyktene lyser, landgangen er hel og Mira har båret posten i land.'}`
        }
      >
        <defs>
          <linearGradient id="r2-sky" x2="0" y2="1">
            <stop stopColor="#273c61" />
            <stop offset="1" stopColor="#8c969b" />
          </linearGradient>
          <linearGradient id="r2-water" x2="0" y2="1">
            <stop stopColor="#467c8c" />
            <stop offset="1" stopColor="#264f69" />
          </linearGradient>
        </defs>
        <rect width="640" height="270" rx="22" fill="url(#r2-sky)" />
        <circle cx="89" cy="48" r="22" fill="#f8e9b7" />
        <path
          d="m165 40 2 5 5 1-5 2-2 5-1-5-5-2 5-1m230-30 2 5 5 1-5 2-2 5-1-5-5-2 5-1m145 2 2 5 5 1-5 2-2 5-1-5-5-2 5-1"
          fill="#f4e7cd"
        />
        <path
          d="M0 144 60 105l70 30 70-43 72 48 81-33 90 42 105-70 92 51v76H0Z"
          fill="#425e65"
        />
        <path
          d="M0 177q100-16 180 0t180 0 180 0 100 0v93H0Z"
          fill="url(#r2-water)"
        />
        <path d="M640 155q-80-16-139 21l-69 43 28 51h180Z" fill="#536e55" />
        <path d="M640 192q-82-20-125 9l-58 37 9 32h174Z" fill="#c5b38a" />
        <g stroke="#728f9c" strokeWidth="2" opacity=".6">
          <path d="M15 254h65m89-11h63m-120-44h37m108 60h69m11-57h48" />
        </g>
        <path
          d="M306 226h150v12H306Z"
          fill="#9b7954"
          stroke="#453f3c"
          strokeWidth="3"
        />
        <path d="M322 238v27m109-27v22" stroke="#544d41" strokeWidth="9" />
        <path
          d="m129 257 71-32 73 17 53-18"
          fill="none"
          stroke="#d3d0a8"
          strokeWidth="3"
          strokeDasharray="5 8"
        />
        {/* Harbor lights are environmental landmarks; teaching counts are below. */}
        {[196, 268, 322].map((x) => (
          <g key={x}>
            <path d={`M${x} 220v-34`} stroke="#453f3c" strokeWidth="5" />
            <rect
              x={x - 8}
              y="177"
              width="16"
              height="21"
              rx="4"
              fill={view.index > 0 || solved ? '#ffe497' : '#8d9b9f'}
              stroke="#453f3c"
              strokeWidth="2"
            />
            {(view.index > 0 || solved) && (
              <circle
                className={styles.glow}
                cx={x}
                cy="187"
                r="18"
                fill="#ffe497"
                opacity=".25"
              />
            )}
          </g>
        ))}
        <Boat
          docked={view.index > 0 || solved}
          leaving={view.index === 2 && solved}
          aboard={
            view.index === 0 ||
            (view.index === 1 && !solved) ||
            (view.index === 2 && solved)
          }
        />
        {(view.index > 1 || (view.index === 1 && solved)) && (
          <path
            className={styles.bridgeReveal}
            d="m413 211 76-12 2 15-76 12Z"
            fill="#dcaf77"
            stroke="#553e40"
            strokeWidth="3"
          />
        )}
        {((view.index === 1 && solved) || (view.index === 2 && !solved)) && (
          <Mira x={509} y={165} />
        )}
      </svg>
      <div className={styles.workbench} role="group" aria-label="Arbeidsstedet">
        {view.index === 0 && (
          <div className={styles.lanterns}>
            {Array.from({ length: quantity('lanterns') }, (_, i) => (
              <div key={i} className={styles.lantern}>
                <span>Lykt {i + 1}</span>
                <div
                  className={styles.stones}
                  role="img"
                  aria-label={`Lykt ${i + 1}: ${solved ? quantity('stones') : Math.min(quantity('stones'), Math.max(0, entered - i * quantity('stones')))} av ${quantity('stones')} plasser fylt`}
                >
                  {Array.from({ length: quantity('stones') }, (_, j) => (
                    <span
                      key={j}
                      aria-hidden="true"
                      className={
                        solved || entered > i * quantity('stones') + j
                          ? styles.filledStone
                          : styles.emptyStone
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
            {entered > quantity('lanterns') * quantity('stones') && (
              <p>Forslaget har flere steiner enn det er plass til.</p>
            )}
          </div>
        )}
        {view.index === 1 && (
          <div>
            <div
              className={styles.planks}
              role="group"
              aria-label={`${quantity('slots')} plankeplasser, ${quantity('placed')} planker fra før`}
            >
              {Array.from({ length: quantity('slots') }, (_, i) => (
                <span
                  key={i}
                  role="img"
                  className={
                    i < quantity('placed')
                      ? styles.oldPlank
                      : solved || i < quantity('placed') + entered
                        ? styles.newPlank
                        : styles.emptyPlank
                  }
                  aria-label={
                    i < quantity('placed')
                      ? 'Lagt fra før'
                      : solved || i < quantity('placed') + entered
                        ? 'Ny planke'
                        : 'Tom plass'
                  }
                >
                  {i + 1}
                </span>
              ))}
            </div>
            <p>Mørk = fra før · lys = ditt forslag</p>
            {entered + quantity('placed') > quantity('slots') && (
              <p>Forslaget har flere nye planker enn det er tomme plasser.</p>
            )}
          </div>
        )}
        {view.index === 2 && (
          <div>
            <p className={styles.bag}>
              I sekken:{' '}
              {quantity('letters') - allocations.reduce((sum, n) => sum + n, 0)}{' '}
              invitasjoner
            </p>
            <div className={styles.mailboxes}>
              {allocations.map((n, i) => (
                <div key={i} className={styles.mailbox}>
                  <span>Postkasse {i + 1}</span>
                  <div
                    className={styles.envelopes}
                    role="group"
                    aria-label={`${n} invitasjoner i postkasse ${i + 1}`}
                  >
                    {Array.from({ length: n }, (_, j) => (
                      <span key={j} aria-hidden="true">
                        ✉
                      </span>
                    ))}
                    <strong>{n}</strong>
                  </div>
                  <div className={styles.boxControls}>
                    <button
                      type="button"
                      aria-label={`Ta fra postkasse ${i + 1}`}
                      disabled={disabled || solved || n === 0}
                      onClick={() => changeAllocation(i, -1)}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      aria-label={`Gi til postkasse ${i + 1}`}
                      disabled={
                        disabled ||
                        solved ||
                        allocations.reduce((sum, v) => sum + v, 0) >=
                          quantity('letters')
                      }
                      onClick={() => changeAllocation(i, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className={styles.sceneDescription}>{description}</p>
    </div>
  );
}
