import styles from './prepared-player.module.css';
export function PreparedScene({
  index,
  solved,
}: {
  index: number;
  solved: boolean;
}) {
  return (
    <div className={styles.scene} data-solved={solved}>
      <svg
        viewBox="0 0 800 220"
        role="img"
        aria-label={
          index === 0
            ? 'Fra cockpiten i Falcon ser vi asteroider og romstasjonen.'
            : index === 1
              ? 'Luke og R2-D2 står ved en låst luke på romstasjonen.'
              : 'Falcon venter i hangaren mens Luke løper mot rampen.'
        }
      >
        <defs>
          <linearGradient id="space" x2="0" y2="1">
            <stop stopColor="#071023" />
            <stop offset="1" stopColor="#233a57" />
          </linearGradient>
          <radialGradient id="planet">
            <stop stopColor="#b8cce0" />
            <stop offset=".7" stopColor="#556d86" />
            <stop offset="1" stopColor="#273344" />
          </radialGradient>
        </defs>
        <rect width="800" height="220" fill="url(#space)" />
        {[30, 95, 170, 240, 310, 420, 500, 590, 690, 760].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={20 + ((i * 37) % 145)}
            r={i % 3 === 0 ? 2 : 1}
            fill="#deedff"
          />
        ))}
        {index === 0 ? (
          <>
            <circle cx="624" cy="96" r="62" fill="url(#planet)" />
            <path d="M568 96h113M575 108h96" stroke="#192c40" strokeWidth="4" />
            <circle cx="612" cy="72" r="15" fill="#2d4157" stroke="#8196ac" />
            {[
              [-10, 90, 27],
              [200, 40, 15],
              [380, 152, 27],
              [724, 176, 38],
            ].map(([x, y, r], i) => (
              <path
                key={i}
                d={`M${x - r} ${y}l${r / 2} ${-r} ${r} ${-r / 4} ${r} ${r} ${-r / 2} ${r} ${-r} ${r / 4}Z`}
                fill="#6e6f78"
                stroke="#a6a4a4"
                strokeWidth="3"
              />
            ))}
            <path
              d="M0 0h800v18H0M240 0l-70 220M560 0l70 220M0 190h800v30H0"
              stroke="#52647b"
              strokeWidth="18"
              fill="none"
            />
            {solved &&
              [0, 1, 2, 3].map((i) => (
                <path
                  className={styles.shield}
                  key={i}
                  d={`M${60 + i * 190} 160q50 -130 100 0`}
                  stroke="#8beedb"
                  strokeWidth="6"
                  fill="none"
                />
              ))}
            <path
              d="M25 220v-40q20-26 40 0v40M105 220v-48q23-30 46 0v48"
              fill="#24202a"
              stroke="#ad8760"
              strokeWidth="3"
            />
          </>
        ) : (
          <>
            <path d="M0 0h800v25H0M0 185h800v35H0" fill="#31465e" />
            {[70, 190, 610, 730].map((x) => (
              <path
                key={x}
                d={`M${x} 25v160`}
                stroke="#6a839b"
                strokeWidth="8"
              />
            ))}
            {index === 1 ? (
              <>
                <rect
                  x="270"
                  y="30"
                  width="270"
                  height="155"
                  rx="38"
                  fill="#07121d"
                  stroke="#91a8b9"
                  strokeWidth="8"
                />
                <g className={styles.doorLeft}>
                  <rect
                    x="280"
                    y="37"
                    width="124"
                    height="140"
                    fill="#667887"
                  />
                  <path
                    d="M295 65h94M295 151h94"
                    stroke="#96a9b9"
                    strokeWidth="5"
                  />
                </g>
                <g className={styles.doorRight}>
                  <rect
                    x="404"
                    y="37"
                    width="126"
                    height="140"
                    fill="#667887"
                  />
                  <path
                    d="M420 65h94M420 151h94"
                    stroke="#96a9b9"
                    strokeWidth="5"
                  />
                </g>
                <path d="M145 185l15-78h30l19 78" fill="#d5be96" />
                <circle cx="175" cy="86" r="18" fill="#efc29c" />
                <path d="M157 81q13-32 34 0" fill="#9f784a" />
                <path
                  d="M214 173h8l5-38h35l5 38h8M229 138v-16q15-23 31 0v16"
                  fill="#dbe5eb"
                  stroke="#568dc8"
                  strokeWidth="5"
                />
              </>
            ) : (
              <>
                <ellipse
                  cx="505"
                  cy="122"
                  rx="157"
                  ry="55"
                  fill="#bbc6ce"
                  stroke="#738b9e"
                  strokeWidth="7"
                />
                <path
                  d="M370 103l-65-8 18 43 60-1M410 79l-52-43 72 22M575 132l80 34 35-19-90-44"
                  fill="#9eaebc"
                  stroke="#6c8195"
                  strokeWidth="5"
                />
                <ellipse cx="505" cy="118" rx="60" ry="23" fill="#7d929f" />
                <path
                  d="M444 116h116M502 96v43"
                  stroke="#536c7b"
                  strokeWidth="4"
                />
                <path
                  d="M470 159l-20 38h75l-11-38"
                  fill="#718491"
                  stroke="#dae8f0"
                  strokeWidth="4"
                />
                <g className={solved ? styles.boarding : undefined}>
                  <path d="M184 190l18-60h24l18 60" fill="#cfb99c" />
                  <circle cx="215" cy="113" r="14" fill="#e9bf9a" />
                  <path d="M231 144l30-35" stroke="#8cead8" strokeWidth="6" />
                </g>
                <path d="M0 209h800" stroke="#dfba64" strokeWidth="3" />
              </>
            )}
          </>
        )}
      </svg>
      <span className={styles.sceneCaption}>
        {solved
          ? '✓ Handlingen lykkes'
          : index === 0
            ? 'Millennium Falcon · innflyging'
            : index === 1
              ? 'Den imperiale romstasjonen'
              : 'Hangaren · den siste fluktveien'}
      </span>
    </div>
  );
}
export function Plate({
  id,
  selected,
  corners,
  template,
}: {
  id: 'A' | 'B' | 'C';
  selected: boolean;
  corners: number[];
  template: boolean;
}) {
  const points =
    id === 'A'
      ? [
          [90, 12],
          [45, 90],
          [135, 90],
        ]
      : id === 'B'
        ? [
            [25, 25],
            [145, 25],
            [145, 85],
            [25, 85],
          ]
        : [
            [20, 25],
            [120, 25],
            [154.641, 85],
            [54.641, 85],
          ];
  return (
    <svg
      viewBox="0 0 180 110"
      role="img"
      aria-label={
        id === 'A'
          ? 'Trekant'
          : id === 'B'
            ? 'Rektangel'
            : 'Skrått parallellogram'
      }
    >
      <polygon
        points={points.map((p) => p.join(',')).join(' ')}
        fill={selected ? '#b7e7df' : '#e3e9ed'}
        stroke="#244451"
        strokeWidth="3"
      />
      {points.map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r={corners.includes(i) ? 7 : 3}
            fill={corners.includes(i) ? '#0b7468' : '#244451'}
          />
          {selected && (
            <text
              x={x + (x > 90 ? 8 : -16)}
              y={y + (y > 55 ? 18 : -9)}
              fontSize="14"
              fill="#173e4b"
            >
              {i + 1}
            </text>
          )}
        </g>
      ))}
      {template && selected && (
        <path d="M25 47V25h22" stroke="#ac5800" strokeWidth="4" fill="none" />
      )}
    </svg>
  );
}
