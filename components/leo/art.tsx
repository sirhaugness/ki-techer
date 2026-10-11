import type { PartProgress } from '@/lib/engine/medallion';
export const partTitles = [
  'Forstå divisjon',
  'Regnestrategier',
  'Matte i hverdagen',
  'Former og algoritmer',
];
const colors = ['#e7b75c', '#8abdaf', '#e39f88', '#a6a9d0'];
export function Tutor({ thinking = false }: { thinking?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 130"
      width="100"
      height="110"
      role="img"
      aria-label={thinking ? 'Læreren tenker' : 'Læreren smiler'}
    >
      <path
        d="M60 32Q20 28 30 5Q57 3 60 32M60 32Q90 0 107 12Q99 35 60 32"
        fill="#5d9684"
      />
      <path
        d="M28 49Q60 22 94 50L102 99Q61 136 20 100Z"
        fill="#ecdba8"
        stroke="#31574e"
        strokeWidth="3"
      />
      <ellipse cx="44" cy="70" rx="5" ry="7" fill="#31574e" />
      <ellipse cx="77" cy="70" rx="5" ry="7" fill="#31574e" />
      <path
        d={thinking ? 'M50 94Q60 86 71 93' : 'M47 90Q61 106 76 90'}
        stroke="#31574e"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="33" cy="86" r="6" fill="#dd9b7e" />
      <circle cx="86" cy="86" r="6" fill="#dd9b7e" />
    </svg>
  );
}
export function Medallion({ parts }: { parts: PartProgress[] }) {
  return (
    <svg
      viewBox="0 0 260 275"
      className="medallion"
      role="img"
      aria-label={`Mattemedaljong: ${parts.filter((p) => p.awardedAt).length} av fire deler tildelt`}
    >
      <path
        d="M90 5L130 52L170 5"
        fill="none"
        stroke="#56776b"
        strokeWidth="20"
      />
      <circle
        cx="130"
        cy="150"
        r="110"
        fill="#f0ebe0"
        stroke="#d1c4aa"
        strokeWidth="3"
      />
      {parts.map((p, i) => {
        const angle = (i * Math.PI) / 2;
        const x = 130 + 104 * Math.cos(angle),
          y = 150 + 104 * Math.sin(angle),
          x2 = 130 + 104 * Math.cos(angle + Math.PI / 2),
          y2 = 150 + 104 * Math.sin(angle + Math.PI / 2);
        return (
          <g key={p.id}>
            <path
              d={`M130 150L${x} ${y}A104 104 0 0 1 ${x2} ${y2}Z`}
              fill={p.status === 'låst' ? '#dedbd3' : colors[i]}
              opacity={p.awardedAt ? 1 : 0.4}
              stroke="#f8f7f0"
              strokeWidth="5"
            />
            {Array.from({ length: p.skillsTotal }, (_, j) => {
              const t = angle + 0.18 + (j / (p.skillsTotal - 1)) * 1.2;
              return (
                <circle
                  key={j}
                  cx={130 + 79 * Math.cos(t)}
                  cy={150 + 79 * Math.sin(t)}
                  r="5"
                  fill={j < p.skillsMastered ? '#214e44' : '#fffaf0'}
                  stroke="#527166"
                />
              );
            })}
            <text
              x={130 + 46 * Math.cos(angle + 0.78)}
              y={155 + 46 * Math.sin(angle + 0.78)}
              textAnchor="middle"
              fontSize="25"
              fill="#214e44"
            >
              {p.awardedAt ? '✦' : p.id}
            </text>
          </g>
        );
      })}
      <circle cx="130" cy="150" r="22" fill="#fffaf0" />
      <path
        d="M119 150l8 8 16-19"
        fill="none"
        stroke="#31574e"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
