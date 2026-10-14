export type Point3 = [number, number, number];
export type Solid = { vertices: Point3[]; faces: number[][] };
export const solids: Record<string, Solid> = {
  kube: {
    vertices: [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ],
    faces: [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [0, 3, 7, 4],
      [1, 2, 6, 5],
      [0, 1, 5, 4],
      [3, 2, 6, 7],
    ],
  },
  'firkantet pyramide': {
    vertices: [
      [-1, 1, -1],
      [1, 1, -1],
      [1, 1, 1],
      [-1, 1, 1],
      [0, -1.3, 0],
    ],
    faces: [
      [0, 1, 2, 3],
      [0, 1, 4],
      [1, 2, 4],
      [2, 3, 4],
      [3, 0, 4],
    ],
  },
  'trekantet pyramide': {
    vertices: [
      [-1, 1, -0.8],
      [1, 1, -0.8],
      [0, 1, 1],
      [0, -1.2, 0],
    ],
    faces: [
      [0, 1, 2],
      [0, 1, 3],
      [1, 2, 3],
      [2, 0, 3],
    ],
  },
  'trekantet prisme': {
    vertices: [
      [-1, 1, -0.8],
      [1, 1, -0.8],
      [0, -1, -0.8],
      [-1, 1, 0.8],
      [1, 1, 0.8],
      [0, -1, 0.8],
    ],
    faces: [
      [0, 1, 2],
      [3, 4, 5],
      [0, 1, 4, 3],
      [1, 2, 5, 4],
      [2, 0, 3, 5],
    ],
  },
};
export function solidFor(name: string): Solid {
  const shape = solids[name] ?? solids.kube;
  return name === 'rett firkantet prisme'
    ? {
        ...shape,
        vertices: shape.vertices.map(([x, y, z]) => [x * 1.45, y, z]),
      }
    : shape;
}
export function solidEdges(solid: Solid): number[][] {
  return [
    ...new Map(
      solid.faces.flatMap((face) =>
        face.map((a, i) => {
          const b = face[(i + 1) % face.length];
          return [[a, b].sort().join('-'), [a, b]] as [string, number[]];
        }),
      ),
    ).values(),
  ];
}
