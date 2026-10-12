import type { PublicTask } from '@/lib/learning/types';
/** Read-only drawing: it cannot submit an answer from inside the answer form. */
export function TaskDrawing({ task }: { task: PublicTask }) {
  const { count, groups, shape, steps, type } = task.visual;
  if (shape)
    return (
      <p>
        Se figuren ved oppgaven. Følg én kant, flate eller ett hjørne om gangen.
      </p>
    );
  if (steps.length)
    return <p>Start ved figuren. Følg pilene rolig: {steps.join(' → ')}.</p>;
  if (!task.illustrationSafe || count < 1 || groups < 1)
    return <p>Tegn det du vet fra oppgaven. Marker det du skal finne.</p>;
  const groupCount = type === 'maaling' ? Math.ceil(count / groups) : groups;
  const perGroup = type === 'maaling' ? groups : Math.ceil(count / groups);
  const shownGroups = Math.min(groupCount, 10),
    shownEach = Math.min(perGroup, 12);
  return (
    <figure className="task-drawing">
      <figcaption>
        {shownGroups < groupCount || shownEach < perGroup
          ? 'Her ser du noen av gruppene. Fortsett tegningen selv.'
          : 'Like grupper fra oppgaven. Tell prikkene rolig.'}
      </figcaption>
      <svg
        viewBox={`0 0 240 ${shownGroups * 30 + 10}`}
        role="img"
        aria-label="Prikker ordnet i like grupper"
      >
        {Array.from({ length: shownGroups }, (_, row) => (
          <g key={row}>
            <rect
              x="4"
              y={row * 30 + 4}
              width="232"
              height="26"
              rx="7"
              fill="#fffdf7"
              stroke="#476e61"
            />
            {Array.from({ length: shownEach }, (_, col) => (
              <circle
                key={col}
                cx={14 + col * 18}
                cy={row * 30 + 17}
                r="5"
                fill="#315f50"
              />
            ))}
          </g>
        ))}
      </svg>
    </figure>
  );
}
