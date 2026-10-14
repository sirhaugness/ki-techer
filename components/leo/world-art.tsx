import type { StoryStage, StoryAsset } from '@/lib/learning/storyboard';
import type { MissionMath } from '@/lib/engine/mission';

export function CargoGlyph({
  object,
  x = 0,
  y = 0,
  size = 24,
}: {
  object: string;
  x?: number;
  y?: number;
  size?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 24})`}>
      {/plank|material/.test(object) ? (
        <>
          <path
            d="M1 7 20 3 23 16 4 21Z"
            fill="#d9a461"
            stroke="#795c3d"
            strokeWidth="1.5"
          />
          <path d="m5 10 14-3M7 16l13-3" stroke="#ac7a46" />
        </>
      ) : /kart|brikke/.test(object) ? (
        <>
          <rect
            x="2"
            y="2"
            width="20"
            height="20"
            rx="3"
            fill="#f8d88e"
            stroke="#7b5f3b"
          />
          <path d="M6 7h4v7h8v4" fill="none" stroke="#bd7041" strokeWidth="2" />
          <circle cx="17" cy="7" r="2" fill="#bd7041" />
        </>
      ) : /spor/.test(object) ? (
        <>
          <ellipse cx="11" cy="15" rx="5" ry="7" fill="#be9369" />
          <circle cx="5" cy="4" r="3" fill="#be9369" />
          <circle cx="13" cy="3" r="3" fill="#be9369" />
          <circle cx="20" cy="7" r="3" fill="#be9369" />
        </>
      ) : /bær|epl/.test(object) ? (
        <>
          <path
            d="M12 6q-9-6-11 5t11 12q13-3 11-12T12 6"
            fill="#e98259"
            stroke="#aa5239"
          />
          <path d="M12 6q0-6 8-5-1 7-8 5" fill="#599a73" />
          <path
            d="M6 11v4"
            stroke="#ffd6a3"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : /ball/.test(object) ? (
        <>
          <circle cx="12" cy="12" r="10" fill="#fff9e9" stroke="#527065" />
          <path d="m12 7 5 4-2 6H9l-2-6Z" fill="#527065" />
        </>
      ) : /kjeg/.test(object) ? (
        <>
          <path d="m12 2 9 18H3Z" fill="#f19052" stroke="#915436" />
          <path d="M8 10h8" stroke="#fff4d5" strokeWidth="3" />
          <rect y="20" width="24" height="3" rx="1" fill="#915436" />
        </>
      ) : /flaske/.test(object) ? (
        <>
          <rect x="8" width="8" height="5" rx="1" fill="#b4d8dd" />
          <rect
            x="5"
            y="5"
            width="14"
            height="18"
            rx="4"
            fill="#6ba4bb"
            stroke="#315979"
          />
          <path d="M5 12h14" stroke="#edf5ed" strokeWidth="5" />
        </>
      ) : /stein/.test(object) ? (
        <path d="m3 7 10-5 9 8-3 12H4L1 14Z" fill="#a6b5b6" stroke="#657c82" />
      ) : (
        <>
          <rect
            x="3"
            y="3"
            width="18"
            height="19"
            rx="4"
            fill="#a8d8da"
            stroke="#35647a"
          />
          <rect x="7" width="10" height="4" rx="1" fill="#35647a" />
          <path d="m13 6-5 7h5l-2 6 7-9h-5Z" fill="#f5d889" />
        </>
      )}
    </g>
  );
}

export function Person({
  x,
  y,
  name,
  companion = false,
  robot = false,
}: {
  x: number;
  y: number;
  name: string;
  companion?: boolean;
  robot?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy="102" rx="32" ry="8" fill="#142c3a" opacity=".16" />
      {robot ? (
        <>
          <circle
            cy="67"
            r="34"
            fill="#f4ead3"
            stroke="#446675"
            strokeWidth="3"
          />
          <circle cy="67" r="21" fill="none" stroke="#e49d50" strokeWidth="8" />
          <path
            d="M-26 27a26 26 0 0 1 52 0Z"
            fill="#f4ead3"
            stroke="#446675"
            strokeWidth="3"
          />
          <circle cx="5" cy="14" r="8" fill="#294153" />
          <circle cx="6" cy="12" r="2" fill="#bddde1" />
          <path d="m-13 0-4-19" stroke="#446675" strokeWidth="3" />
        </>
      ) : (
        <>
          <path
            d="m-17 71-5 26m38-26 5 26"
            stroke="#344c65"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <path
            d="M-29 55-45 70m74-15 13 10"
            stroke="#e8b78c"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <rect
            x="-24"
            y="35"
            width="48"
            height="43"
            rx="13"
            fill={companion ? '#dc9360' : '#6194ab'}
          />
          <path d="M-9 38v32M8 38v32" stroke="#f4d797" strokeWidth="6" />
          <circle r="27" cy="14" fill="#f1c59b" />
          <path
            d="M-27 11Q-30-17 1-17t26 31L16 1Q3 8-14 1Z"
            fill={companion ? '#854f39' : '#514a47'}
          />
          <circle cx="-8" cy="15" r="2.7" fill="#344655" />
          <circle cx="9" cy="15" r="2.7" fill="#344655" />
          <path
            d="M-5 25q5 5 11 0"
            fill="none"
            stroke="#a2644b"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
      <rect
        x="-53"
        y="116"
        width="106"
        height="29"
        rx="14"
        fill="#fff9e9"
        opacity=".96"
      />
      <text y="136" textAnchor="middle" fontSize="17" fill="#344e57">
        {name.length > 15 ? name.slice(0, 14) + '…' : name}
      </text>
    </g>
  );
}
function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="m-9 40 2-98h14l9 98" fill="#ad7e57" />
      <path
        d="M-64-41q-38-55 17-73-5-57 48-48 36-44 62 1 65 13 30 64 29 41-20 57Z"
        fill="#528970"
      />
      <path
        d="M-51-92q-8-30 26-28m36-12q32-6 46 14"
        fill="none"
        stroke="#7baa7f"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </g>
  );
}
export function Background({ stage, id }: { stage: StoryStage; id: string }) {
  if (['hangar', 'station'].includes(stage))
    return (
      <>
        <rect width="960" height="520" fill="#173047" />
        {Array.from({ length: 22 }, (_, i) => (
          <circle
            key={i}
            cx={60 + ((i * 137) % 830)}
            cy={24 + ((i * 71) % 270)}
            r={(i % 3) + 1}
            fill="#c5e7e5"
          />
        ))}
        <circle cx="734" cy="116" r="65" fill="#b8cdd0" />
        <path
          d="M725 61q-34 57 11 116"
          fill="none"
          stroke="#90adb4"
          strokeWidth="17"
        />
        <path
          d="M0 0h225L154 322H0Zm960 0H806l30 322h124ZM0 0h960v39H0"
          fill="#63818e"
        />
        <path
          d="m210 40-50 270M819 40l20 270"
          stroke="#b2c9c6"
          strokeWidth="10"
        />
        <path d="M0 320h960v200H0Z" fill={`url(#${id}-floor)`} />
        {Array.from({ length: 5 }, (_, i) => (
          <path
            key={i}
            d={`M${480 + (i - 2) * 260} 520 480 320`}
            stroke="#75959d"
            strokeWidth="2"
          />
        ))}
        <path d="M0 400h960M0 467h960" stroke="#75959d" strokeWidth="2" />
        <rect
          x="30"
          y="126"
          width="82"
          height="109"
          rx="12"
          fill="#345467"
          stroke="#93afab"
          strokeWidth="3"
        />
        <path
          d="M45 151h45m-45 20h29m-29 20h45"
          stroke="#b3d8c1"
          strokeWidth="5"
        />
      </>
    );
  if (stage === 'stadium')
    return (
      <>
        <rect width="960" height="520" fill={`url(#${id}-sky)`} />
        <path d="M0 80q480-90 960 0v174H0Z" fill="#e6bd86" />
        {Array.from({ length: 90 }, (_, i) => (
          <circle
            key={i}
            cx={15 + (i % 30) * 32}
            cy={91 + Math.floor(i / 30) * 38}
            r="7"
            fill={['#759da3', '#cc7652', '#d5a05c'][i % 3]}
          />
        ))}
        <path d="M0 228h960v292H0Z" fill="#76a37a" />
        <path d="M0 290h960v80H0m0 80h960" fill="#86ae7e" />
        <path
          d="M110 296h740v173H110Zm370 0v173"
          fill="none"
          stroke="#f8f1d7"
          strokeWidth="4"
        />
        <ellipse
          cx="480"
          cy="382"
          rx="69"
          ry="51"
          fill="none"
          stroke="#f8f1d7"
          strokeWidth="4"
        />
        <path
          d="M797 279v-79h88v79"
          fill="none"
          stroke="#f4e8c5"
          strokeWidth="6"
        />
        <path
          d="M809 200v79m15-79v79m15-79v79m15-79v79m15-79v79M797 219h88m-88 19h88m-88 19h88"
          stroke="#f4e8c5"
          opacity=".6"
        />
      </>
    );
  if (stage === 'workshop')
    return (
      <>
        <rect width="960" height="520" fill="#f0d3a5" />
        <path
          d="M0 0h960v46H0M190 46v320M767 46v320"
          stroke="#af8055"
          strokeWidth="18"
        />
        <path d="m0 53 960 238M0 284 960 53" stroke="#e5bf8a" strokeWidth="9" />
        <rect
          x="363"
          y="82"
          width="278"
          height="191"
          rx="10"
          fill="#8fbbc5"
          stroke="#af8055"
          strokeWidth="12"
        />
        <path d="M502 82v190m-139-96h278" stroke="#d8d9b4" strokeWidth="8" />
        <path d="M0 329h960v191H0" fill="#d3b48a" />
        <path
          d="M60 264h145v58H60Zm18 58v96m109-96v96"
          fill="#bb8956"
          stroke="#765c44"
          strokeWidth="8"
        />
        <path
          d="m95 125 37 45-32 20m-27-61 32 47"
          stroke="#536d79"
          strokeWidth="9"
          strokeLinecap="round"
        />
      </>
    );
  return (
    <>
      <rect width="960" height="520" fill={`url(#${id}-sky)`} />
      <circle cx="777" cy="78" r="40" fill="#f8ddb1" />
      <path
        d="M0 224 187 69l163 149L573 83l214 164 173-109v230H0Z"
        fill="#99b9ab"
      />
      <path d="m120 124 67-55 71 65-53-13-20 11-23-13Z" fill="#e4e8ce" />
      <path
        d="M0 262q210-120 453 13t507-33v278H0Z"
        fill={stage === 'desert' ? '#d9ab75' : '#8faf80'}
      />
      <path
        d="M0 360q332-92 960 30v130H0"
        fill={stage === 'desert' ? '#ecc595' : '#acc58e'}
      />
      {stage === 'river' ? (
        <>
          <path
            d="M421 276q-96 80 22 141t-124 103h270q131-101-19-170t-1-74"
            fill="#85bec5"
          />
          <path
            d="M428 315q-50 39 24 72m41 54-45 45m32-168q-18 36 37 45"
            fill="none"
            stroke="#cde5d7"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <Tree x={91} y={336} scale={1.2} />
          <Tree x={863} y={344} scale={0.9} />
        </>
      ) : stage === 'desert' ? (
        <>
          <path d="m622 260 138-30 54 44-23 52-148-10Z" fill="#b38467" />
          <path
            d="m632 266 118 15m-24-35-6 31"
            stroke="#775f54"
            strokeWidth="5"
          />
          <path
            d="M14 441q149-83 292-33m326 94q129-74 301-45"
            fill="none"
            stroke="#d0a574"
            strokeWidth="3"
          />
        </>
      ) : stage === 'village' ? (
        <>
          <path d="M373 280v-91h120v91M570 278V162h159v116" fill="#efcb95" />
          <path d="m345 189 89-65 86 65m27-27 103-74 105 74" fill="#b97355" />
          <rect x="413" y="229" width="33" height="51" rx="12" fill="#7894a0" />
          <rect x="611" y="205" width="39" height="73" rx="12" fill="#7894a0" />
          <Tree x={92} y={334} />
        </>
      ) : (
        <>
          <Tree x={52} y={343} scale={1.5} />
          <Tree x={882} y={350} scale={1.2} />
          <Tree x={726} y={288} scale={0.8} />
          <path
            d="M340 520q-57-112 172-250h68q-204 183-94 250"
            fill="#e2c497"
          />
          <path d="m59 439 37-12-11 23m754 23 26-30 14 27" fill="#699967" />
        </>
      )}
    </>
  );
}
export function Creature({ dinosaur }: { dinosaur: boolean }) {
  return (
    <g transform="translate(590 293)">
      <ellipse cy="70" rx="53" ry="11" fill="#325b56" opacity=".18" />
      {dinosaur ? (
        <>
          <path
            d="M-58 18q44 30 49-1T34-43q55-4 48 31-3 15-24 10L47 21q-4 32-48 32l-42-17Z"
            fill="#c79467"
            stroke="#805c49"
            strokeWidth="3"
          />
          <path
            d="m-9 42-5 25m44-26 10 25"
            stroke="#805c49"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <circle cx="65" cy="-23" r="4" fill="#384d4c" />
          <path d="m14-25 10-12 9 11m-51 49 10-12 8 11" fill="#e7c781" />
        </>
      ) : (
        <>
          <path
            d="M-34 13q-40-24-43 11 30 22 52 12"
            fill="#c98251"
            stroke="#805c49"
            strokeWidth="3"
          />
          <ellipse cy="31" rx="37" ry="25" fill="#c98251" />
          <path
            d="m4 13 1-35 22 13L48-24 56 7q-12 27-52 6"
            fill="#d69257"
            stroke="#805c49"
            strokeWidth="3"
          />
          <path d="m9 6 20 13 25-17" fill="#f4debd" />
          <circle cx="22" cy="-2" r="3" fill="#384d4c" />
          <circle cx="43" cy="-4" r="3" fill="#384d4c" />
        </>
      )}
    </g>
  );
}
export function Asset({ asset }: { asset: StoryAsset }) {
  return (
    <g transform="translate(311 333)" className="world-asset">
      <rect
        x="-29"
        y="-30"
        width="65"
        height="65"
        rx="15"
        fill="#fff2c8"
        stroke="#a87940"
        strokeWidth="3"
      />
      {asset === 'key' ? (
        <>
          <circle
            cx="-5"
            cy="-9"
            r="8"
            fill="none"
            stroke="#a87940"
            strokeWidth="5"
          />
          <path d="m1-3 18 18m-8-1 6-6" stroke="#a87940" strokeWidth="5" />
        </>
      ) : asset === 'fossil' ? (
        <>
          <ellipse cx="3" cy="2" rx="21" ry="17" fill="#c3a786" />
          <path
            d="M14 6q-27 4-19-17 15-8 14 6-9 11-10 1"
            fill="none"
            stroke="#795f49"
            strokeWidth="4"
          />
        </>
      ) : asset === 'equipment' ? (
        <CargoGlyph object="fotballer" x={-9} y={-10} size={30} />
      ) : (
        <>
          <path
            d="m-16-16 13 5 14-6 12 6v34l-14-7-14 5-11-7Z"
            fill="#eacb84"
            stroke="#a87940"
          />
          <path
            d="m-8 10 9-17 13 11"
            fill="none"
            stroke="#b66b47"
            strokeWidth="3"
          />
        </>
      )}
    </g>
  );
}
export function MathPanel({
  math,
  object,
  solved,
  effect,
}: {
  math: MissionMath;
  object: string;
  solved: boolean;
  effect: string;
}) {
  if (math.kind === 'native') return null;
  const grouped = math.kind === 'groups' || math.kind === 'share';
  const showGroups = grouped && (math.kind === 'groups' || solved);
  const slots = Math.min(120, math.total);
  const columns = Math.min(16, Math.max(1, slots));
  const cellSize = Math.min(18, 292 / columns);
  return (
    <g transform="translate(573 337)" className="world-math-panel">
      <rect
        width="326"
        height="154"
        rx="18"
        fill="#fff9e9"
        stroke="#496c73"
        strokeWidth="3"
      />
      <text x="17" y="25" fill="#344e57" fontSize="17">
        {math.equation}
      </text>
      {showGroups ? (
        Array.from({ length: math.groups }, (_, r) => (
          <g
            key={r}
            transform={`translate(${16 + r * (292 / math.groups)} 42)`}
          >
            <rect
              width={Math.max(20, 280 / math.groups)}
              height="86"
              rx="6"
              fill="#e5e9d8"
            />
            {Array.from({ length: math.each }, (_, c) => (
              <g
                key={c}
                opacity={effect === 'charge' && !solved ? 0.22 : 1}
                className={solved ? 'world-cell' : ''}
                style={{ animationDelay: `${(r * math.each + c) * 15}ms` }}
              >
                <CargoGlyph
                  object={object}
                  x={4 + (c % 2) * Math.min(12, 100 / math.groups)}
                  y={
                    7 +
                    Math.floor(c / 2) *
                      (66 / Math.max(1, Math.ceil(math.each / 2)))
                  }
                  size={Math.min(
                    15,
                    120 / math.groups,
                    60 / Math.max(1, Math.ceil(math.each / 2)),
                  )}
                />
              </g>
            ))}
          </g>
        ))
      ) : (
        <>
          <text x="17" y="46" fill="#344e57" fontSize="14">
            {math.kind === 'missing'
              ? `Trenger ${math.total} · har ${math.known}`
              : math.kind === 'share'
                ? `${math.total} fordeles i ${math.groups} like grupper`
                : math.kind === 'measure'
                  ? `${math.total} · hver gruppe får ${math.each}`
                  : math.mode === 'halvere'
                    ? 'Ta med halvparten av mengden'
                    : 'Hent like mange til'}
          </text>
          {Array.from({ length: slots }, (_, i) => {
            const muted =
              math.kind === 'missing'
                ? i >= math.known && !solved
                : math.kind === 'double'
                  ? math.mode === 'doble'
                    ? i >= math.known && !solved
                    : i >= math.known && solved
                  : false;
            return (
              <g
                key={i}
                opacity={muted ? 0.2 : 1}
                className={solved && !muted ? 'world-cell' : ''}
              >
                <CargoGlyph
                  object={object}
                  x={17 + (i % columns) * (292 / columns)}
                  y={
                    57 +
                    Math.floor(i / columns) *
                      (68 / Math.max(1, Math.ceil(slots / columns)))
                  }
                  size={Math.min(
                    cellSize,
                    62 / Math.max(1, Math.ceil(slots / columns)),
                  )}
                />
              </g>
            );
          })}
          {math.total > 120 && (
            <text x="17" y="140" fill="#344e57" fontSize="12">
              Viser et utsnitt. Hele mengden er {math.total}.
            </text>
          )}
        </>
      )}
      {solved && <circle cx="302" cy="23" r="10" fill="#72a482" />}
      {effect === 'charge' && (
        <rect
          className="world-energy"
          x="16"
          y="138"
          width={solved ? 292 : 24}
          height="6"
          rx="3"
          fill={solved ? '#77b8bb' : '#b1bcb3'}
        />
      )}
    </g>
  );
}

export function WorldProblem({
  effect,
  space,
  solved,
  object,
  dinosaur,
  people = false,
}: {
  people?: boolean;
  effect: string;
  space: boolean;
  solved: boolean;
  object: string;
  dinosaur: boolean;
}) {
  if (['charge', 'launch'].includes(effect) && space)
    return (
      <g transform="translate(548 211)">
        <g className="world-ship">
          <ellipse cy="90" rx="174" ry="14" fill="#153c50" opacity=".25" />
          <path
            d="m-158 19 99-33L25-39l83 41 41 43-119 8-103-12Z"
            fill="#b5c9c8"
            stroke="#3b596b"
            strokeWidth="5"
          />
          <path d="m-2-26 44 3 31 28H-22Z" fill="#4a7289" />
          <path
            d="m-153 22 61 7M83 23l57 17"
            stroke="#ebd1a2"
            strokeWidth="8"
          />
          <path d="M-51 32v27m113-11v22" stroke="#3b596b" strokeWidth="6" />
          <circle
            className="ship-light"
            cx="-82"
            cy="13"
            r="9"
            fill={solved ? '#e6df82' : '#526877'}
          />
          <circle
            className="ship-light"
            cx="93"
            cy="23"
            r="7"
            fill={solved ? '#e6df82' : '#526877'}
          />
          <path
            className="ship-exhaust"
            d="m-155 26-56 12 58 6Z"
            fill="#edbc72"
            opacity={solved ? 1 : 0}
          />
        </g>
      </g>
    );
  if (effect === 'open')
    return (
      <g transform="translate(462 169)">
        <path
          d="M0 155V0h180v155"
          fill="#607d83"
          stroke="#d3d5bd"
          strokeWidth="8"
        />
        <path d="M16 148V17h148v131" fill="#253f52" />
        <g className="world-gate">
          <rect x="16" y="17" width="148" height="131" fill="#a2b4ab" />
          <path
            d="M27 49h126m-126 32h126m-126 33h126"
            stroke="#738c8c"
            strokeWidth="7"
          />
          <circle
            cx="136"
            cy="126"
            r="6"
            fill={solved ? '#eddb86' : '#a6614d'}
          />
        </g>
      </g>
    );
  if (effect === 'build')
    return (
      <g transform="translate(365 330)">
        <path d="M0 0h222M0 45h222" stroke="#876143" strokeWidth="8" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect
            className="world-plank"
            style={{ animationDelay: `${i * 100}ms` }}
            key={i}
            x={i * 29}
            y="-2"
            width="23"
            height="51"
            rx="3"
            fill="#efc18b"
            stroke="#9a704b"
            opacity={solved ? 1 : 0.18}
          />
        ))}
      </g>
    );
  if (effect === 'rescue' || effect === 'arrive')
    return (
      <g className="world-creature">
        {people ? (
          <Person x={590} y={255} name="Vennen" companion />
        ) : (
          <Creature dinosaur={dinosaur} />
        )}
      </g>
    );
  if (effect === 'signal')
    return (
      <g transform="translate(608 206)">
        <path d="M0 108V14m-54 99h109" stroke="#5f7e88" strokeWidth="12" />
        <path
          d="M-43-11q43 81 86 0Z"
          fill="#d1d5b4"
          stroke="#527582"
          strokeWidth="4"
        />
        <circle cy="-6" r="8" fill="#efc47e" />
        {[1, 2, 3].map((i) => (
          <path
            className="world-signal"
            key={i}
            style={{ animationDelay: `${i * 120}ms` }}
            d={`M${-i * 26} ${-18 - i * 16}q${i * 26} ${-i * 20} ${i * 52} 0`}
            stroke="#d0e6cf"
            strokeWidth="5"
            fill="none"
            opacity={solved ? 1 : 0.1}
          />
        ))}
      </g>
    );
  if (effect === 'travel')
    return (
      <g transform="translate(478 221)">
        <path
          d="M0 94V0m0 14h138l-15 22H0m0 35h-126l12 23H0"
          stroke="#8b7152"
          strokeWidth="8"
          fill="#f1d096"
        />
        <text x="21" y="28" fontSize="16" fill="#40595d">
          Rute A
        </text>
        <circle
          className="world-traveller"
          cx="-70"
          cy="112"
          r="12"
          fill="#d9a265"
        />
        <text x="-95" y="88" fontSize="16" fill="#40595d">
          Rute B
        </text>
      </g>
    );
  if (effect === 'reveal' && /spor|stein|kjeg/.test(object))
    return (
      <g transform="translate(430 270)" className="world-map">
        {Array.from({ length: 5 }, (_, i) => (
          <CargoGlyph
            key={i}
            object={object}
            x={i * 42}
            y={(i % 2) * 24}
            size={30}
          />
        ))}
      </g>
    );
  if (effect === 'reveal')
    return (
      <g transform="translate(465 216)">
        <g className="world-map">
          <path
            d="m0 0 68-12 45 17 66-7v112l-66 8-45-22-68 8Z"
            fill="#f0d69a"
            stroke="#947754"
            strokeWidth="4"
          />
          <path
            d="m29 66 32-29 52 35 38-35"
            fill="none"
            stroke="#b17a54"
            strokeWidth="5"
            strokeDasharray="8 7"
          />
          <circle cx="150" cy="37" r="8" fill="#638b76" />
        </g>
      </g>
    );
  return (
    <g transform="translate(500 246)">
      <g className="world-cargo">
        <path
          d="M-34 45h192v41H-34Z"
          fill="#ac8158"
          stroke="#735b47"
          strokeWidth="4"
        />
        <circle cx="-1" cy="96" r="15" fill="#50666b" />
        <circle cx="128" cy="96" r="15" fill="#50666b" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect
              x={i * 53}
              y="-2"
              width="46"
              height="47"
              rx="5"
              fill="#e5bd82"
              stroke="#8e7150"
              strokeWidth="3"
            />
            <CargoGlyph object={object} x={10 + i * 53} y={8} />
          </g>
        ))}
      </g>
    </g>
  );
}
