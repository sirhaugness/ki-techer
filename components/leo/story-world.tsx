'use client';
import { useId } from 'react';
import type { StoryActor, StoryScene } from '@/lib/learning/story-contract';
import { canonicalActor } from '@/lib/learning/story-contract';

export function ResourceGlyph({
  glyph,
  x = 0,
  y = 0,
  size = 32,
}: {
  glyph: StoryScene['glyph'];
  x?: number;
  y?: number;
  size?: number;
}) {
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      {glyph === 'stone' ? (
        <path
          d="m4 28 5-17 15-5 12 13-6 15H12Z"
          fill="#b5b3a4"
          stroke="#e9e4cf"
          strokeWidth="2"
        />
      ) : glyph === 'wedge' ? (
        <>
          <path
            d="M4 32 32 7l4 25Z"
            fill="#bb7951"
            stroke="#f1c398"
            strokeWidth="2"
          />
          <path d="m12 29 18-16" stroke="#855235" strokeWidth="3" />
        </>
      ) : glyph === 'resin' ? (
        <>
          <path
            d="M7 28Q1 16 14 8t20 9q7 17-9 19Z"
            fill="#d8a33e"
            stroke="#ffe08a"
            strokeWidth="2"
          />
          <path d="m12 17 8-5" stroke="#fff0b4" strokeWidth="3" />
        </>
      ) : glyph === 'rope' ? (
        <>
          <path
            d="M8 30c-8-13 7-25 19-19s9 24-3 24S8 20 18 18s8 9 2 9"
            fill="none"
            stroke="#e8c58d"
            strokeWidth="5"
          />
          <path d="m8 30-5 5" stroke="#bc8b50" strokeWidth="4" />
        </>
      ) : glyph === 'beacon' ? (
        <>
          <rect
            x="11"
            y="12"
            width="18"
            height="24"
            rx="5"
            fill="#9caec4"
            stroke="#e8f5ff"
            strokeWidth="2"
          />
          <path d="M20 12V3" stroke="#d5e8f7" strokeWidth="3" />
          <circle cx="20" cy="23" r="5" fill="#80e6e6" />
          <path d="m7 7-4-3m30 3 4-3" stroke="#7bdbdf" strokeWidth="2" />
        </>
      ) : glyph === 'energy' ? (
        <>
          <rect
            x="9"
            y="4"
            width="22"
            height="32"
            rx="6"
            fill="#62e5ec"
            stroke="#c2fbff"
            strokeWidth="2"
          />
          <path d="m23 9-10 13h7l-3 10 11-14h-8Z" fill="#123947" />
        </>
      ) : glyph === 'coin' ? (
        <>
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="#ffc35c"
            stroke="#ffe3a1"
            strokeWidth="3"
          />
          <circle
            cx="20"
            cy="20"
            r="10"
            fill="none"
            stroke="#a36e28"
            strokeWidth="2"
          />
          <path d="M20 11v18m-6-9h12" stroke="#a36e28" strokeWidth="3" />
        </>
      ) : glyph === 'water' ? (
        <>
          <path
            d="M17 3h6v6l5 7v19H12V16l5-7Z"
            fill="#bceaf9"
            stroke="#f3fdff"
            strokeWidth="2"
          />
          <path d="M13 22h14v12H13Z" fill="#38a6e3" />
          <path d="M17 4h6" stroke="#ffc779" strokeWidth="5" />
        </>
      ) : glyph === 'crystal' ? (
        <>
          <path
            d="m20 2 13 10-5 23-8 4-9-4-5-23Z"
            fill="#92c9ff"
            stroke="#d9f4ff"
            strokeWidth="2"
          />
          <path d="m20 2-3 16 3 21 7-20Z" fill="#58a0ff" />
        </>
      ) : glyph === 'part' ? (
        <>
          <path
            d="m9 7 5 8 7-2 2-7 7 6-1 8-9 3-9 12-6-5 9-11-6-6Z"
            fill="#b5c9dd"
            stroke="#eef7ff"
            strokeWidth="2"
          />
          <circle cx="10" cy="30" r="2" fill="#123947" />
        </>
      ) : glyph === 'plank' ? (
        <>
          <rect
            x="3"
            y="12"
            width="34"
            height="16"
            rx="3"
            fill="#cf965d"
            stroke="#f5ce97"
            strokeWidth="2"
          />
          <path d="M9 16h20M7 23h25" stroke="#996239" strokeWidth="2" />
        </>
      ) : glyph === 'map' ? (
        <>
          <path d="m4 8 10-3 12 4 10-4v26l-10 4-12-4-10 4Z" fill="#e8d4a0" />
          <path
            d="m9 22 8-10 10 14 5-11"
            fill="none"
            stroke="#9a633d"
            strokeWidth="3"
          />
        </>
      ) : glyph === 'ball' ? (
        <>
          <circle cx="20" cy="20" r="17" fill="#edf5ff" />
          <path d="m20 10 9 7-4 10H15l-4-10Z" fill="#243749" />
        </>
      ) : glyph === 'food' ? (
        <>
          <circle cx="15" cy="23" r="11" fill="#fb795e" />
          <circle cx="26" cy="24" r="10" fill="#ffaf68" />
          <path
            d="m18 10 3-8m-2 8q10-12 15-5"
            fill="none"
            stroke="#69bb85"
            strokeWidth="4"
          />
        </>
      ) : (
        <>
          <rect x="4" y="8" width="32" height="24" rx="5" fill="#94c0df" />
          <path
            d="M10 20h5l4-8 4 16 5-8h4"
            fill="none"
            stroke="#1f475b"
            strokeWidth="3"
          />
        </>
      )}
    </svg>
  );
}

export function ActorPortrait({ actor: source }: { actor: StoryActor }) {
  const actor = canonicalActor(source);
  const droid =
    actor.appearance.includes('droid') || actor.appearance === 'robot';
  return (
    <svg
      viewBox="0 0 80 80"
      className="actor-portrait"
      role="img"
      aria-label={actor.name}
    >
      <circle cx="40" cy="40" r="39" fill={droid ? '#203b52' : '#433a51'} />
      {actor.appearance === 'round-droid' ? (
        <>
          <circle cx="40" cy="54" r="23" fill="#f4ecda" />
          <circle
            cx="40"
            cy="54"
            r="14"
            fill="none"
            stroke="#ee9d49"
            strokeWidth="7"
          />
          <path
            d="M20 32a20 20 0 0 1 40 0Z"
            fill="#f4ecda"
            stroke="#d29657"
            strokeWidth="3"
          />
          <circle cx="41" cy="25" r="5" fill="#1b3142" />
          <path d="M46 12V3" stroke="#f4ecda" strokeWidth="2" />
        </>
      ) : actor.appearance === 'robot' ? (
        <>
          <rect x="20" y="31" width="40" height="38" rx="5" fill="#e2edf2" />
          <path d="M20 31a20 20 0 0 1 40 0Z" fill="#a7b5c7" />
          <rect x="28" y="20" width="17" height="11" fill="#447ac0" />
          <circle cx="37" cy="25" r="4" fill="#1b3142" />
          <path
            d="M29 40h22m-22 9h22m-22 9h22"
            stroke="#447ac0"
            strokeWidth="5"
          />
          <path d="M16 44v27m48-27v27" stroke="#ecf5fb" strokeWidth="7" />
        </>
      ) : actor.appearance === 'gold-droid' ? (
        <>
          <path d="M21 69V47q19-13 38 0v22" fill="#b88736" />
          <rect x="25" y="13" width="30" height="34" rx="13" fill="#d5ae54" />
          <circle cx="33" cy="27" r="5" fill="#fff0aa" />
          <circle cx="47" cy="27" r="5" fill="#fff0aa" />
          <path d="M32 38h16m8-8h7" stroke="#785526" strokeWidth="3" />
        </>
      ) : actor.appearance === 'wookiee' ? (
        <>
          <path d="M13 76V28Q15 4 40 5t27 24v47" fill="#96734b" />
          <path
            d="m20 24 7-6m2 30 5-7m10-23 9 6m-27 37 9-6m14-17 8 6m-35 21 7 7"
            stroke="#c6a06d"
            strokeWidth="5"
          />
          <ellipse cx="40" cy="36" rx="17" ry="12" fill="#5c4635" />
          <circle cx="31" cy="30" r="3" fill="#141d2b" />
          <circle cx="49" cy="30" r="3" fill="#141d2b" />
          <path d="M29 40h22" stroke="#ede0bf" strokeWidth="3" />
          <path d="m23 76 29-26" stroke="#383b44" strokeWidth="9" />
          <path d="m27 72 23-20" stroke="#c1c3c7" strokeWidth="3" />
        </>
      ) : actor.appearance === 'dinosaur' || actor.appearance === 'animal' ? (
        <>
          <path
            d="M13 69V42q8-24 33-24 21 0 22 22l-11 6-1 23Z"
            fill="#7fb897"
          />
          <circle cx="50" cy="30" r="4" fill="#152f32" />
          <path d="m18 32-4-9 11 2m4-6 2-9 8 7" fill="#eacb78" />
          <path d="M56 43h8" stroke="#2a6154" strokeWidth="3" />
        </>
      ) : (
        <>
          <path
            d="M14 76q2-24 26-24t26 24"
            fill={actor.appearance === 'pilot' ? '#c47347' : '#77a4a5'}
          />
          <ellipse cx="40" cy="33" rx="17" ry="22" fill="#f1c49c" />
          <path
            d="M21 27q1-28 23-22 16 2 17 26l-10-13-27 9Z"
            fill={actor.appearance === 'jedi' ? '#c7a161' : '#5b4037'}
          />
          <circle cx="33" cy="33" r="2.5" fill="#29384b" />
          <circle cx="47" cy="33" r="2.5" fill="#29384b" />
          <path
            d="M34 43q6 6 12 0"
            fill="none"
            stroke="#ab725d"
            strokeWidth="2"
          />
          {actor.appearance === 'pilot' && (
            <path
              d="M21 25V12q19-16 38 0v13l-12-9H33Z"
              fill="#f6eed6"
              stroke="#ed9b4a"
              strokeWidth="4"
            />
          )}
        </>
      )}
    </svg>
  );
}

function Starship({
  solved,
  count,
  glyph,
  falcon,
}: {
  falcon: boolean;
  solved: boolean;
  count: number;
  glyph: StoryScene['glyph'];
}) {
  return (
    <g className="story-ship" transform="translate(515 238)">
      <ellipse cy="95" rx="245" ry="20" fill="#000" opacity=".25" />
      {!falcon && (
        <>
          <g className={`ship-wings ${solved ? 'repaired' : 'damaged'}`}>
            <path
              d="m-70-5-178-73-25 24L-90 38m-2-35-144 97-21-21 179-64M65-5l178-73 25 24L85 38m2-35 144 97 21-21L74 15"
              fill="#a9b6c4"
              stroke="#e3ebf3"
              strokeWidth="4"
            />
            <path
              d="m-218-66 15 6m-10 122 14-10m403-118-15 6m10 122-14-10"
              stroke="#db6b48"
              strokeWidth="12"
            />
          </g>
          {!solved && (
            <path
              d="m-200-57 13 12-18 6 19 14m379-36-13 12 18 6-19 14"
              stroke="#d98a66"
              strokeWidth="6"
              fill="none"
            />
          )}
          <path
            d="M-100 20-76-13l76-11L180 8 195 21 29 44-83 9Z"
            fill="#c9d2da"
            stroke="#edf7ff"
            strokeWidth="3"
          />
          <path
            d="m-36-18 49 2 54 25-105 9Z"
            fill="#263e58"
            stroke="#829fb4"
            strokeWidth="3"
          />
          <path d="m12 31 131-15" stroke="#cc704b" strokeWidth="7" />
          {[-1, 1].map((side) => (
            <g key={side} transform={`translate(-72 ${side * 50})`}>
              <rect
                x="-41"
                y="-13"
                width="88"
                height="26"
                rx="12"
                fill="#6e849e"
                stroke="#b7c8d9"
                strokeWidth="3"
              />
              <circle
                cx="-34"
                r="9"
                fill={solved ? '#65e1f0' : '#dfaf75'}
                className="story-engine"
              />
              <path
                d="m-43-7-85 7 85 7"
                fill="#81e4ff"
                className="story-exhaust"
              />
            </g>
          ))}
        </>
      )}
      {falcon && (
        <>
          <ellipse
            rx="210"
            ry="88"
            fill="#b8c6cf"
            stroke="#ecf4f8"
            strokeWidth="5"
          />
          <path
            d="M90-76 270-40 130-2m-5 8 145 41-185 31"
            fill="#a0b2c0"
            stroke="#e2edf4"
            strokeWidth="5"
          />
          <ellipse
            rx="124"
            ry="54"
            fill="#667b90"
            stroke="#e2edf4"
            strokeWidth="3"
          />
          <path
            d="M-180-35Q-205 0-180 35"
            stroke={solved ? '#7ceafa' : '#49798e'}
            strokeWidth="15"
            fill="none"
            className="story-engine"
          />
          <path
            d="M-199-20-285 0-199 20"
            fill="#81e4ff"
            className="story-exhaust"
          />
          <path
            d="M85 64h117l14-24-97-4Z"
            fill="#718ea5"
            stroke="#e2edf4"
            strokeWidth="4"
          />
          <circle
            cx="-43"
            cy="-17"
            r="27"
            fill="#40566c"
            stroke="#cedee6"
            strokeWidth="4"
          />
          <path
            d="M-110-75v150m80-160v180m85-160v145"
            stroke="#8096a6"
            strokeWidth="3"
          />
        </>
      )}
      {Array.from({ length: Math.min(count, 12) }, (_, i) => (
        <g key={i} className="story-added-object">
          <ResourceGlyph
            glyph={glyph}
            x={-155 + (i % 6) * 48}
            y={60 - Math.floor(i / 6) * 39}
            size={28}
          />
        </g>
      ))}
    </g>
  );
}

function StoryCreature({ dinosaur }: { dinosaur: boolean }) {
  return (
    <g className="story-creature" transform="translate(480 240)">
      {dinosaur ? (
        <>
          <path
            d="M-120 75q-90-25-116-83 63 22 104 3-15-62 60-78L25-53q50-102 105-61 46 34 7 60L70-28Q89 48 39 72Z"
            fill="#74a58b"
            stroke="#b0d2a2"
            strokeWidth="4"
          />
          <path
            d="m-69 58-10 63h36l18-57m58 0 9 56h38L59 49"
            fill="#61937e"
            stroke="#b0d2a2"
            strokeWidth="4"
          />
          <circle cx="117" cy="-83" r="6" fill="#132b33" />
          <path d="M114-51h20" stroke="#365c50" strokeWidth="3" />
          <path
            d="m-84-53-15-24 30 10m10-7-5-27 25 18m12 3 5-27 20 27"
            fill="#e9c578"
          />
        </>
      ) : (
        <>
          <path
            d="M-50 22a50 50 0 0 1 100 0Z"
            fill="#c0d1e0"
            stroke="#70a7d4"
            strokeWidth="5"
          />
          <rect x="-50" y="22" width="100" height="92" rx="10" fill="#e8eef0" />
          <path
            d="M-31 42h62m-62 26h62m-62 24h62"
            stroke="#5e92c8"
            strokeWidth="12"
          />
          <circle cx="8" cy="3" r="10" fill="#16243a" />
          <path d="M-68 48v83m136-83v83" stroke="#d5e5ef" strokeWidth="17" />
        </>
      )}
    </g>
  );
}

export function StoryWorld({
  scene,
  state,
  value,
  allocations,
  targetCount,
  groups,
  groupSize,
  groupValues,
}: {
  scene: StoryScene;
  state: 'waiting' | 'working' | 'retry' | 'solved';
  value: number;
  allocations: number[];
  targetCount?: number;
  groups?: number;
  groupSize?: number;
  groupValues?: number[];
}) {
  const id = useId().replaceAll(':', '');
  const space = ['space', 'base'].includes(scene.backdrop);
  const forest = ['forest', 'river'].includes(scene.backdrop);
  const cave = scene.backdrop === 'cave';
  const artwork =
    scene.illustration === 'prehistoric-river'
      ? forest && scene.artwork
      : scene.illustration === 'crystal-cavern'
        ? cave && scene.artwork
        : scene.illustration === 'desert-hangar'
          ? (scene.backdrop === 'desert' ||
              /tatooine|mos eisley|ørken/i.test(scene.location)) &&
            scene.artwork
          : undefined;
  const solved = state === 'solved';
  const rescuedActor =
    scene.cast.find((actor) =>
      /fanget|savnet|reddes|fange/i.test(actor.role),
    ) ??
    scene.cast.find(
      (actor) => canonicalActor(actor).appearance === 'princess',
    ) ??
    scene.cast.find((actor) => actor.appearance !== 'player') ??
    scene.cast[0];
  const ship = scene.subject === 'starship';
  const count = allocations.length
    ? allocations.reduce((total, n) => total + n, 0)
    : value;
  const bridgeSlots = Math.min(targetCount ?? Math.max(count, 12), 20);
  return (
    <div
      className="story-world"
      data-state={state}
      data-effect={scene.effect}
      data-backdrop={scene.backdrop}
      data-action={scene.action}
    >
      <svg
        viewBox="0 0 1000 440"
        role="img"
        aria-label={`${scene.location}. ${solved ? scene.success : scene.before}`}
      >
        <defs>
          <linearGradient id={`${id}-sky`} x2="0.6" y2="1">
            <stop
              stopColor={forest ? '#163d44' : cave ? '#141e38' : '#101d36'}
            />
            <stop
              offset="1"
              stopColor={forest ? '#72aa83' : space ? '#354868' : '#e6a366'}
            />
          </linearGradient>
          <radialGradient id={`${id}-glow`}>
            <stop stopColor="#75eaff" stopOpacity=".45" />
            <stop offset="1" stopColor="#75eaff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-ground`} x2="0" y2="1">
            <stop stopColor={forest ? '#294e47' : '#433d4b'} />
            <stop offset="1" stopColor="#101b2e" />
          </linearGradient>
        </defs>
        <rect width="1000" height="440" fill={`url(#${id}-sky)`} />
        {space &&
          Array.from({ length: 45 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 137 + 73) % 1000}
              cy={(i * 43 + 17) % 210}
              r={i % 4 === 0 ? 2 : 1}
              fill="#dbeaff"
              opacity={0.3 + (i % 3) * 0.2}
            />
          ))}
        {!forest && !cave && (
          <>
            <circle
              cx="780"
              cy="102"
              r={space ? 65 : 39}
              fill={space ? '#d2d3db' : '#ffd89b'}
              opacity=".8"
            />
            {scene.backdrop === 'desert' && (
              <circle cx="690" cy="124" r="24" fill="#ffe6bc" />
            )}
          </>
        )}
        {forest ? (
          <>
            <path
              d="M0 260Q150 170 320 235T650 190T1000 210V440H0Z"
              fill="#386956"
            />
            {[25, 145, 810, 940].map((x, i) => (
              <g key={x}>
                <path d={`M${x} 350V55`} stroke="#243e3c" strokeWidth="28" />
                <ellipse
                  cx={x}
                  cy={70 + i * 14}
                  rx="100"
                  ry="65"
                  fill={i % 2 ? '#397262' : '#264f4c'}
                />
                <path
                  d={`M${x} 210q-70-75-95-10m95-75q75-70 106-5`}
                  fill="none"
                  stroke="#315a4d"
                  strokeWidth="12"
                />
              </g>
            ))}
          </>
        ) : cave ? (
          <>
            <path
              d="M0 0h1000v105L848 62 749 142 620 70 532 146 381 45 226 121 119 62 0 172Z"
              fill="#27364b"
            />
            <path
              d="M0 0v440h115l-43-165 69-152L226 0m774 0v440H882l63-168-100-161-94-111"
              fill="#1a263b"
            />
            {[135, 810, 890].map((x, i) => (
              <path
                key={x}
                d={`m${x} 335 14-${70 + i * 12} 20 9 9 70Z`}
                fill="#75b9ff"
                opacity=".8"
                className="story-crystal"
              />
            ))}
          </>
        ) : (
          <>
            <path
              d="M0 277 170 205 344 270 504 194 744 251 862 178 1000 229V440H0Z"
              fill={space ? '#24364c' : '#aa7558'}
            />
            <path
              d="M0 308q150-90 347-25t330-23 323 29v151H0Z"
              fill={space ? '#182940' : '#c08863'}
            />
          </>
        )}
        {artwork && (
          <image
            href={artwork}
            width="1000"
            height="440"
            preserveAspectRatio="xMidYMid slice"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
        <path
          d="M0 355Q500 300 1000 355v85H0Z"
          fill={`url(#${id}-ground)`}
          opacity={artwork ? 0.35 : 1}
        />
        {scene.backdrop === 'river' && (
          <path
            d="M360 244q240 30 132 95t110 101H260q-57-79 76-104t24-92"
            fill="#62b8c6"
            opacity=".65"
          />
        )}
        {scene.backdrop === 'base' && (
          <>
            <path
              d="M0 0h150l-70 320H0m1000-320H850l70 320h80"
              fill="#192739"
              stroke="#58687d"
              strokeWidth="8"
            />
            <path
              d="M137 30h726"
              stroke="#a5dfe9"
              strokeWidth="4"
              opacity=".45"
            />
          </>
        )}
        <ellipse
          cx="500"
          cy="265"
          rx="250"
          ry="185"
          fill={`url(#${id}-glow)`}
          opacity={solved ? 1 : 0.35}
        />
        {ship ? (
          <Starship
            solved={solved}
            count={count}
            glyph={scene.glyph}
            falcon={/falcon/i.test(
              [scene.location, scene.before, scene.success, ...scene.uses].join(
                ' ',
              ),
            )}
          />
        ) : ['creature', 'droid'].includes(scene.subject) ? (
          <StoryCreature
            dinosaur={scene.cast.some(
              (actor) =>
                (scene.subject === 'creature' &&
                  actor.appearance === 'dinosaur') ||
                actor.appearance === 'animal',
            )}
          />
        ) : scene.subject === 'gate' ? (
          <g transform="translate(395 125)">
            <path
              d="M-16 225V0h242v225"
              fill="#617187"
              stroke="#a2b6c6"
              strokeWidth="6"
            />
            <rect width="208" height="215" fill="#0b172b" />
            <g className="story-door">
              <rect x="4" y="4" width="200" height="208" fill="#33455e" />
              <path
                d="M104 8v193m-92-156h184m-184 112h184"
                stroke="#627a94"
                strokeWidth="4"
              />
              <circle
                cx="104"
                cy="105"
                r="27"
                fill="#16253b"
                stroke={solved ? '#81e4dd' : '#eac284'}
                strokeWidth="4"
              />
              <ResourceGlyph glyph={scene.glyph} x={87} y={88} size={34} />
            </g>
          </g>
        ) : scene.subject === 'marker-trail' ? (
          <g className="story-marker-trail">
            <path
              d="M70 350Q200 70 390 190T930 100"
              stroke="#cebd94"
              strokeWidth="30"
              fill="none"
              opacity=".45"
            />
            {Array.from(
              {
                length: Math.min(groups ?? groupValues?.length ?? 1, 12),
              },
              (_, g) => (
                <g
                  key={g}
                  transform={`translate(${155 + (g % 4) * 225} ${95 + Math.floor(g / 4) * 120})`}
                >
                  <rect
                    x="-63"
                    y="-34"
                    width="134"
                    height="100"
                    rx="30"
                    fill="#213d3d"
                    fillOpacity=".8"
                    stroke="#b9c4a3"
                    strokeDasharray="5 5"
                  />
                  {Array.from(
                    {
                      length: Math.min(
                        12,
                        groupValues
                          ? Math.max(0, groupValues[g] ?? 0)
                          : Math.min(
                              groupSize ?? count,
                              Math.max(0, count - g * (groupSize ?? count)),
                            ),
                      ),
                    },
                    (_, i) => (
                      <g key={i} className="story-added-object">
                        <ResourceGlyph
                          glyph="stone"
                          x={-51 + (i % 4) * 29}
                          y={-23 + Math.floor(i / 4) * 28}
                          size={27}
                        />
                      </g>
                    ),
                  )}
                </g>
              ),
            )}
          </g>
        ) : scene.subject === 'slab' ? (
          <g>
            <path
              d="m245 129 59-31 443 23 37 156-60 43-470-20Z"
              fill="#857c68"
              stroke="#c7bd9e"
              strokeWidth="7"
            />
            <path
              d="m378 166 22 16m68 8 22 16m78 12 22 16"
              stroke="#4c5143"
              strokeWidth="20"
              strokeLinecap="round"
            />
            {Array.from({ length: Math.min(count, 24) }, (_, i) => {
              const t = (i * 4) / Math.min(count, 24),
                f = t % 1,
                edge = Math.floor(t);
              const px =
                edge === 0
                  ? 270 + 440 * f
                  : edge === 1
                    ? 730
                    : edge === 2
                      ? 730 - 440 * f
                      : 270;
              const py =
                edge === 0
                  ? 125
                  : edge === 1
                    ? 125 + 175 * f
                    : edge === 2
                      ? 300
                      : 300 - 175 * f;
              return (
                <g
                  key={i}
                  transform={`translate(${solved ? px : 130 + (i % 12) * 64} ${solved ? py : 355 + Math.floor(i / 12) * 35}) rotate(${solved ? edge * 90 : 0})`}
                >
                  <g className="story-placed-wedge">
                    <ResourceGlyph glyph="wedge" x={-18} y={-18} size={36} />
                  </g>
                </g>
              );
            })}
          </g>
        ) : scene.subject === 'bag' ? (
          <g className="story-supply-bag" transform="translate(325 92)">
            <path
              d="M48 42 20 3h320l-28 39q80 73 60 204-14 40-190 42Q-5 286-12 246-35 120 48 42Z"
              fill="#876b56"
              stroke="#d9c4a2"
              strokeWidth="6"
            />
            <path
              d="M48 42q134 26 264 0"
              stroke="#e8d3aa"
              strokeWidth="8"
              fill="none"
            />
            {Array.from({ length: Math.min(count, 40) }, (_, i) => (
              <g key={i} className="story-added-object">
                <ResourceGlyph
                  glyph={scene.glyph}
                  x={20 + (i % 8) * 40}
                  y={225 - Math.floor(i / 8) * 38}
                  size={34}
                />
              </g>
            ))}
            {solved && (
              <path
                className="story-bag-tie"
                d="m40 45 277-1m-143 1-37-31 5 34 39-3 44-32-8 35-35-3v35"
                stroke="#f0d7a3"
                strokeWidth="7"
                fill="none"
              />
            )}
          </g>
        ) : scene.subject === 'mirror' ? (
          <g transform="translate(510 195)">
            <path d="M0 1v160m-70 0H70" stroke="#aa8b62" strokeWidth="14" />
            <ellipse
              rx="85"
              ry="65"
              fill="#a4c7d4"
              stroke="#e2f2ee"
              strokeWidth="7"
              transform="rotate(-20)"
            />
            <path
              className="story-mirror-beam"
              d="m-280-155 280 155 350-90"
              stroke="#fff1b3"
              strokeWidth={solved ? 25 : 5}
              opacity={solved ? 0.9 : 0.25}
              fill="none"
            />
          </g>
        ) : scene.subject === 'map' ? (
          <g transform="translate(205 82)" className="story-holomap">
            <path
              d="m0 35 150-35 190 43 222-29v232l-222 25-190-45L0 265Z"
              fill="#193c53"
              stroke="#77c7d1"
              strokeWidth="3"
            />
            <path
              d="m50 198 110-90 107 56L420 62m-160 102 97 57 154-68"
              stroke="#f7bf6c"
              strokeWidth="5"
              fill="none"
              strokeDasharray="10 8"
            />
            <circle
              cx="50"
              cy="198"
              r="13"
              fill="#cce9ff"
              className="story-traveller"
            />
            <circle cx="420" cy="62" r="16" fill="#87ddd9" />
            <ResourceGlyph glyph="map" x={430} y={190} size={55} />
          </g>
        ) : scene.subject === 'market' ? (
          <g transform="translate(320 132)">
            <path
              d="M-70 20 80-42 390 20v25H-70Z"
              fill="#b15f43"
              stroke="#ecac7a"
              strokeWidth="4"
            />
            <path
              d="M-43 35v167m401-167v167"
              stroke="#b38e6d"
              strokeWidth="9"
            />
            <path
              d="M-55 153h421v64H-55Z"
              fill="#614741"
              stroke="#ad8363"
              strokeWidth="4"
            />
            <path
              d="M230 150h87v-91h-87Z"
              fill="#273647"
              stroke="#79949e"
              strokeWidth="3"
            />
            <ResourceGlyph glyph="map" x={247} y={82} size={50} />
          </g>
        ) : scene.subject === 'sender' ? (
          <g transform="translate(510 145)">
            <path d="M0 166V55m-82 110H81" stroke="#adc2d4" strokeWidth="12" />
            <path
              d="M-65 3q65 104 130 0Z"
              fill="#b6c6d3"
              stroke="#e5f4ff"
              strokeWidth="4"
            />
            <circle r="10" fill="#77e5ef" />
            {[1, 2, 3].map((i) => (
              <path
                key={i}
                className="story-signal"
                d={`M${-i * 25} ${-i * 24}q${i * 25}-${i * 15} ${i * 50} 0`}
                stroke="#7ce7ed"
                strokeWidth="5"
                fill="none"
              />
            ))}
          </g>
        ) : scene.subject === 'bridge' ? (
          <g transform="translate(260 260)">
            <path d="M0 0h475M0 68h475" stroke="#96715a" strokeWidth="11" />
            {Array.from({ length: Math.min(count, 20) }, (_, i) => (
              <rect
                key={i}
                className="story-bridge-plank"
                x={(i * 475) / bridgeSlots}
                y="-3"
                width={450 / bridgeSlots}
                height="76"
                rx="3"
                fill="#dfa76b"
                stroke="#f1c790"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </g>
        ) : scene.subject === 'person' ? (
          <g transform="translate(460 240)">
            <path
              d="M-60-110h200v200H-60Z"
              fill="#172c45"
              stroke="#9db4cd"
              strokeWidth="8"
            />
            {!solved && (
              <path
                d="M-30-105v190m45-190v190m45-190v190m45-190v190"
                stroke="#7d8ca2"
                strokeWidth="8"
              />
            )}
          </g>
        ) : (
          <g transform="translate(300 164)">
            <path
              d="M-27 152h465v50H-27Z"
              fill="#283c51"
              stroke="#8099ab"
              strokeWidth="4"
            />
            <path
              d="M0 143V0h412v143"
              fill="#182c44"
              stroke="#587992"
              strokeWidth="6"
            />
            {scene.effect === 'build' && solved && (
              <g className="story-built-object">
                <path
                  d="M0 10 85-34 412-34 327 10Z"
                  fill="#d0e0eb"
                  stroke="#edf8ff"
                  strokeWidth="5"
                />
                <path
                  d="M327 10 412-34v134l-85 43Z"
                  fill="#8199b0"
                  stroke="#edf8ff"
                  strokeWidth="5"
                />
                <rect
                  x="0"
                  y="10"
                  width="327"
                  height="133"
                  fill="#a9bdcc"
                  stroke="#edf8ff"
                  strokeWidth="5"
                />
                <path
                  d="M109 10v133m109-133v133M0 75h327"
                  stroke="#526b82"
                  strokeWidth="5"
                />
                <path
                  d="m141 76 22 22 41-50"
                  fill="none"
                  stroke="#134d42"
                  strokeWidth="10"
                />
              </g>
            )}
            {scene.action === 'fill' && (
              <>
                <path
                  d="M40 133V16h332v117"
                  fill="#284d67"
                  stroke="#a4d4e3"
                  strokeWidth="4"
                />
                <rect
                  x="43"
                  y={132 - Math.min(count, 20) * 5}
                  width="326"
                  height={Math.min(count, 20) * 5}
                  fill="#69c4e1"
                  opacity=".75"
                />
              </>
            )}
          </g>
        )}
        {scene.effect === 'rescue' &&
          ['person', 'gate'].includes(scene.subject) &&
          rescuedActor &&
          (solved || scene.subject === 'person') && (
            <g className="story-rescued-friend" transform="translate(500 315)">
              <path
                d="M-22-56h44l18 67h-80Z"
                fill="#a399d3"
                stroke="#e7e5ff"
                strokeWidth="3"
              />
              <path d="M-18 8v30m36-30v30" stroke="#cedeea" strokeWidth="12" />
              <g transform="translate(-40 -134)">
                <ActorPortrait actor={rescuedActor} />
              </g>
            </g>
          )}
        {!ship &&
          !['bag', 'slab', 'marker-trail', 'mirror'].includes(scene.subject) &&
          scene.action !== 'route' &&
          scene.effect !== 'signal' &&
          scene.effect !== 'open' &&
          scene.effect !== 'build' &&
          scene.action !== 'decode' &&
          Array.from({ length: Math.min(count, 40) }, (_, i) => (
            <g key={i} className="story-added-object">
              <ResourceGlyph
                glyph={scene.glyph}
                x={337 + (i % 10) * 34}
                y={265 - Math.floor(i / 10) * 35}
                size={30}
              />
            </g>
          ))}
        {allocations.length > 0 && (
          <g>
            {allocations.map((n, i) => (
              <g
                key={i}
                transform={`translate(${180 + (i * 640) / Math.max(allocations.length - 1, 1)} 360)`}
              >
                <circle
                  r="24"
                  fill="#152c45"
                  stroke="#79c5d1"
                  strokeWidth="2"
                />
                <text textAnchor="middle" y="7" fill="#e7f5ff" fontSize="22">
                  {n}
                </text>
              </g>
            ))}
          </g>
        )}
        {solved && (
          <g className="story-completion-pulse">
            <circle
              cx="500"
              cy="235"
              r="110"
              fill="none"
              stroke="#83e8dc"
              strokeWidth="4"
              opacity=".7"
            />
          </g>
        )}
        {scene.effect === 'shield' && (
          <ellipse
            className="story-shield"
            cx="500"
            cy="255"
            rx="290"
            ry="140"
            fill="#73d4ef"
            fillOpacity=".1"
            stroke="#8ce7ff"
            strokeWidth="4"
          />
        )}
        {scene.effect === 'repair' && solved && (
          <path
            className="story-repair-spark"
            d="m267 200 24 12-11 20 28-7m348-25-24 12 11 20-28-7"
            stroke="#9bf2e6"
            strokeWidth="5"
            fill="none"
          />
        )}
      </svg>
      <div className="story-location">
        <span aria-hidden="true">◈</span> {scene.location}
      </div>
      <div className="story-world-counter" aria-live="polite">
        <span>Svaret ditt:</span>{' '}
        {state === 'waiting' && value === 0 ? '?' : value}
      </div>
      {state === 'retry' && (
        <div className="story-world-retry" role="status">
          ↻ {scene.retry}
        </div>
      )}
      {solved && (
        <div className="story-world-success" role="status">
          ✓ {scene.success}
        </div>
      )}
    </div>
  );
}
