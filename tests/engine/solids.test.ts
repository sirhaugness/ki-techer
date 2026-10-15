import { expect, it } from 'vitest';
import { solidFor, solidEdges } from '../../lib/engine/solids';
import { shapes3d } from '../../lib/engine/skills/generators';
it('draws closed solids with the same independently specified properties as the graded curriculum', () => {
  for (const shape of shapes3d) {
    const solid = solidFor(shape.name),
      edges = solidEdges(solid);
    expect(solid.vertices.length, shape.name).toBe(shape.corners);
    expect(solid.faces.length, shape.name).toBe(shape.faces);
    expect(edges.length, shape.name).toBe(shape.edges);
    expect(solid.vertices.length - edges.length + solid.faces.length).toBe(2);
    for (const [a, b] of edges)
      expect(
        solid.faces.filter((face) =>
          face.some(
            (v, i) =>
              (v === a && face[(i + 1) % face.length] === b) ||
              (v === b && face[(i + 1) % face.length] === a),
          ),
        ).length,
      ).toBe(2);
  }
});
