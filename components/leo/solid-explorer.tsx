'use client';
import { useState, type KeyboardEvent } from 'react';
import { solidFor, solidEdges } from '@/lib/engine/solids';
export function SolidExplorer({
  shape,
  count,
  property = 'faces',
}: {
  shape: string;
  count: number;
  property?: string;
}) {
  const [tilt, setTilt] = useState(0.4);
  const [angle, setAngle] = useState(0.55),
    [marked, setMarked] = useState<Set<number>>(() => new Set());
  const source = solidFor(shape);
  const points = source.vertices.map(([x, y, z]) => {
    const rotatedX = x * Math.cos(angle) + z * Math.sin(angle),
      depth = z * Math.cos(angle) - x * Math.sin(angle);
    return {
      x: 170 + rotatedX * 65,
      y: 125 + (y * Math.cos(tilt) - depth * Math.sin(tilt)) * 65,
      depth: depth * Math.cos(tilt) + y * Math.sin(tilt),
    };
  });
  const edges = solidEdges(source),
    label =
      property === 'corners'
        ? 'hjørner'
        : property === 'edges'
          ? 'kanter'
          : 'flater',
    single =
      property === 'corners'
        ? 'hjørne'
        : property === 'edges'
          ? 'kant'
          : 'flate';
  const toggle = (id: number) =>
    setMarked((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const controls = (id: number) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': `Marker ${single} ${id + 1}`,
    'aria-pressed': marked.has(id),
    onClick: () => toggle(id),
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle(id);
      }
    },
  });
  return (
    <div className="story-solid-explorer">
      <p>
        {shape} · {count} {count === 1 ? 'figur' : 'figurer'} i oppdraget
      </p>
      <svg viewBox="0 0 340 250" role="group" aria-label={`Undersøk ${shape}`}>
        {source.faces
          .map((face, id) => ({
            face,
            id,
            depth:
              face.reduce((sum, i) => sum + points[i].depth, 0) / face.length,
          }))
          .sort((a, b) => b.depth - a.depth)
          .map(({ face, id }) => (
            <polygon
              key={id}
              points={face
                .map((i) => `${points[i].x},${points[i].y}`)
                .join(' ')}
              fill={
                property === 'faces' && marked.has(id)
                  ? '#f4c47e'
                  : ['#315a7c', '#537e9c', '#79a4b5'][id % 3]
              }
              stroke="#c3e5ee"
              strokeWidth="2"
              fillOpacity=".8"
              {...(property === 'faces' ? controls(id) : {})}
            />
          ))}
        {property === 'edges' &&
          edges.map(([a, b], id) => (
            <g key={id} {...controls(id)}>
              <line
                x1={points[a].x}
                y1={points[a].y}
                x2={points[b].x}
                y2={points[b].y}
                stroke="transparent"
                strokeWidth="48"
              />
              <line
                x1={points[a].x}
                y1={points[a].y}
                x2={points[b].x}
                y2={points[b].y}
                stroke={marked.has(id) ? '#ffd69a' : '#c3e5ee'}
                strokeWidth="5"
              />
            </g>
          ))}
        {property === 'corners' &&
          points.map((point, id) => (
            <g key={id} {...controls(id)}>
              <circle cx={point.x} cy={point.y} r="24" fill="transparent" />
              <circle
                cx={point.x}
                cy={point.y}
                r="9"
                fill={marked.has(id) ? '#ffd69a' : '#a4f0ec'}
                stroke="#19324c"
                strokeWidth="2"
              />
            </g>
          ))}
      </svg>
      <div className="story-solid-tools">
        <button type="button" onClick={() => setAngle((a) => a - 0.55)}>
          ↶ Roter
        </button>
        <button type="button" onClick={() => setAngle((a) => a + 0.55)}>
          Roter ↷
        </button>
        <button type="button" onClick={() => setTilt((t) => t + 0.55)}>
          Vipp opp/ned
        </button>
        <button type="button" onClick={() => setMarked(new Set())}>
          Fjern merkene
        </button>
      </div>
      <p aria-live="polite">
        Du har markert {marked.size} {label} på denne figuren.
      </p>
    </div>
  );
}
