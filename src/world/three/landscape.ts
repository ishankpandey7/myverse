import * as T from "three";
import { toWorld } from "./coordinates.ts";
import { PLACES } from "../navigation.ts";
import { PLOTS } from "../../game.ts";
import { BEACON, FRAGMENTS } from "../../starfall.ts";

export const TRAILS = [
  {
    points: [
      [303, 516],
      [430, 499],
      [520, 500],
      [695, 528],
      [815, 492],
      [980, 460],
    ],
    width: 0.52,
  },
  {
    points: [
      [660, 580],
      [695, 528],
      [740, 617],
    ],
    width: 0.38,
  },
  {
    points: [
      [695, 528],
      [765, 405],
      [824, 376],
    ],
    width: 0.36,
  },
  {
    points: [
      [520, 500],
      [600, 548],
      [605, 680],
      [520, 670],
    ],
    width: 0.3,
  },
];
const trails = TRAILS.map(({ points }) =>
  points.map(([x, y]) => toWorld({ x, y })),
);
const clearings = [
  ...Object.values(PLACES).map((p) => ({
    ...toWorld(p.entrance),
    radius: 0.55,
  })),
  ...Object.values(PLOTS).map((p) => ({ ...toWorld(p), radius: 0.65 })),
  ...Object.values(FRAGMENTS).map((p) => ({ ...toWorld(p), radius: 0.6 })),
  { ...toWorld(BEACON), radius: 0.85 },
];
const pads = [
  [490, 420, 2.2, 1.75],
  [720, 410, 2.25, 1.4],
  [975, 381, 1.8, 1.8],
  [520, 605, 1.85, 1.05],
].map(([x, y, w, d]) => ({ ...toWorld({ x, y }), w, d }));
const smooth = (a: number, b: number, n: number) => {
  const t = Math.max(0, Math.min(1, (n - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function trailDistance(x: number, z: number) {
  let nearest = Infinity;
  for (const trail of trails)
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1],
        b = trail[i],
        dx = b.x - a.x,
        dz = b.z - a.z;
      const t = Math.max(
        0,
        Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)),
      );
      nearest = Math.min(
        nearest,
        Math.hypot(x - a.x - t * dx, z - a.z - t * dz),
      );
    }
  return nearest;
}

// One height field drives the mesh, planted objects, routes and the walking character.
// Buildings and existing interactions keep level landings; paths blend into the hills.
export function terrainHeight(x: number, z: number) {
  const hill = (cx: number, cz: number, w: number, d: number, h: number) =>
    h * Math.exp(-(((x - cx) / w) ** 2) - ((z - cz) / d) ** 2);
  const rolling =
    0.14 +
    (Math.sin(x * 1.1 + z * 0.3) + 1) * 0.07 +
    (Math.cos(z * 1.7 - x * 0.2) + 1) * 0.045;
  const height =
    rolling +
    hill(-8.4, -1.9, 3.9, 2.9, 1.55) +
    hill(0.3, -4.1, 4.5, 2.1, 1.65) +
    hill(9, 1, 2.6, 3.1, 1.15);
  let weight = smooth(0.62, 1.25, trailDistance(x, z));
  for (const p of pads) {
    const outside = Math.hypot(
      Math.max(0, Math.abs(x - p.x) - p.w),
      Math.max(0, Math.abs(z - p.z) - p.d),
    );
    weight = Math.min(weight, smooth(0, 0.85, outside));
  }
  for (const p of clearings)
    weight = Math.min(
      weight,
      smooth(p.radius, p.radius + 0.65, Math.hypot(x - p.x, z - p.z)),
    );
  const pond = toWorld({ x: 840, y: 620 });
  weight = Math.min(
    weight,
    smooth(1.15, 1.65, Math.hypot((x - pond.x) / 2.55, (z - pond.z) / 1.42)),
  );
  const end = toWorld({ x: 950, y: 727 }),
    start = { x: pond.x + 1.5, z: pond.z + 0.4 };
  const dx = end.x - start.x,
    dz = end.z - start.z;
  const along = Math.max(
    0,
    Math.min(
      1,
      ((x - start.x) * dx + (z - start.z) * dz) / (dx * dx + dz * dz),
    ),
  );
  weight = Math.min(
    weight,
    smooth(
      0.45,
      0.9,
      Math.hypot(x - start.x - along * dx, z - start.z - along * dz),
    ),
  );
  return height * weight;
}

export const GROUND_SUBDIVISIONS = 5;
// Index triangles into small cells once. Walking and planting then sample the
// actual rendered triangles, including interpolation between height-field vertices.
export function createGroundSampler(geometry: T.BufferGeometry) {
  const positions = geometry.getAttribute("position"),
    indices = geometry.getIndex()!;
  const cell = 0.75,
    bins = new Map<string, number[]>();
  for (let i = 0; i < indices.count; i += 3) {
    const vertices = [
      indices.getX(i),
      indices.getX(i + 1),
      indices.getX(i + 2),
    ];
    const xs = vertices.map((v) => positions.getX(v)),
      zs = vertices.map((v) => positions.getZ(v));
    for (
      let x = Math.floor(Math.min(...xs) / cell);
      x <= Math.floor(Math.max(...xs) / cell);
      x++
    )
      for (
        let z = Math.floor(Math.min(...zs) / cell);
        z <= Math.floor(Math.max(...zs) / cell);
        z++
      ) {
        const key = `${x}:${z}`,
          bin = bins.get(key);
        if (bin) bin.push(i);
        else bins.set(key, [i]);
      }
  }
  return (x: number, z: number) => {
    for (const i of bins.get(
      `${Math.floor(x / cell)}:${Math.floor(z / cell)}`,
    ) ?? []) {
      const a = indices.getX(i),
        b = indices.getX(i + 1),
        c = indices.getX(i + 2);
      const ax = positions.getX(a),
        az = positions.getZ(a),
        bx = positions.getX(b),
        bz = positions.getZ(b),
        cx = positions.getX(c),
        cz = positions.getZ(c);
      const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(denominator) < 1e-12) continue;
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator;
      const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator;
      const w = 1 - u - v;
      if (u >= -1e-6 && v >= -1e-6 && w >= -1e-6)
        return (
          u * positions.getY(a) + v * positions.getY(b) + w * positions.getY(c)
        );
    }
    return terrainHeight(x, z);
  };
}

export function groundBoundary(geometry: T.BufferGeometry) {
  const indices = geometry.getIndex()!,
    positions = geometry.getAttribute("position");
  const edges = new Map<string, { a: number; b: number; count: number }>();
  for (let i = 0; i < indices.count; i += 3)
    for (let side = 0; side < 3; side++) {
      const a = indices.getX(i + side),
        b = indices.getX(i + ((side + 1) % 3)),
        key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const edge = edges.get(key);
      if (edge) edge.count++;
      else edges.set(key, { a, b, count: 1 });
    }
  const next = new Map(
    [...edges.values()].filter((e) => e.count === 1).map((e) => [e.a, e.b]),
  );
  const start = next.keys().next().value!;
  const boundary: T.Vector3[] = [];
  let current = start;
  do {
    boundary.push(new T.Vector3().fromBufferAttribute(positions, current));
    current = next.get(current)!;
  } while (current !== start && boundary.length <= next.size);
  return boundary;
}

export function groundGeometry(outline: { x: number; z: number }[]) {
  const shape = new T.Shape(outline.map((p) => new T.Vector2(p.x, -p.z)));
  const base = new T.ShapeGeometry(shape),
    p = base.getAttribute("position");
  const points = Array.from({ length: p.count }, (_, i) => [
    p.getX(i),
    -p.getY(i),
  ]);
  let indices = Array.from(base.getIndex()!.array);
  base.dispose();
  for (let level = 0; level < GROUND_SUBDIVISIONS; level++) {
    const midpoints = new Map<string, number>(),
      next: number[] = [];
    const middle = (a: number, b: number) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      let index = midpoints.get(key);
      if (index === undefined) {
        index = points.length;
        points.push([
          (points[a][0] + points[b][0]) / 2,
          (points[a][1] + points[b][1]) / 2,
        ]);
        midpoints.set(key, index);
      }
      return index;
    };
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = indices.slice(i, i + 3),
        ab = middle(a, b),
        bc = middle(b, c),
        ca = middle(c, a);
      next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    }
    indices = next;
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      points.flatMap(([x, z]) => [x, terrainHeight(x, z), z]),
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new T.Float32BufferAttribute(
      points.flatMap(([x, z]) => [x / 3.2, z / 3.2]),
      2,
    ),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
