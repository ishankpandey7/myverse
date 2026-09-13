export type Point = { x: number; y: number };
export type Place = "home" | "observatory";
export const SPAWN: Point = { x: 660, y: 580 };
export const LAND: Point[] = [
  { x: 130, y: 425 },
  { x: 250, y: 315 },
  { x: 520, y: 250 },
  { x: 880, y: 255 },
  { x: 1140, y: 320 },
  { x: 1280, y: 460 },
  { x: 1200, y: 630 },
  { x: 940, y: 740 },
  { x: 620, y: 780 },
  { x: 330, y: 680 },
  { x: 140, y: 540 },
];
export const PLACES: Record<Place, { name: string; entrance: Point }> = {
  home: { name: "Home Base", entrance: { x: 520, y: 500 } },
  observatory: { name: "Idea Observatory", entrance: { x: 980, y: 460 } },
};
export const TREES = [
  [230, 420, 1.1],
  [280, 390, 0.9],
  [320, 355, 0.85],
  [200, 480, 1],
  [290, 475, 0.8],
  [350, 425, 0.7],
  [300, 550, 0.9],
  [220, 535, 0.8],
  [360, 620, 1],
  [420, 655, 0.7],
  [580, 300, 0.7],
  [630, 320, 0.9],
  [715, 300, 0.7],
  [810, 295, 0.8],
  [1110, 395, 0.8],
  [1160, 440, 1],
  [1190, 500, 0.85],
  [1140, 555, 0.8],
  [1050, 590, 0.7],
  [1090, 640, 0.8],
  [630, 700, 0.8],
  [550, 690, 0.65],
] as const;
const STEP = 20;
const COLS = 71;
const ROWS = 46;
const rectangles = [
  { x: 405, y: 368, w: 170, h: 105 },
  { x: 915, y: 327, w: 120, h: 108 },
];
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export function onLand(p: Point): boolean {
  // Convex polygon with an inset so the character's feet stay on the island.
  return LAND.every((a, i) => {
    const b = LAND[(i + 1) % LAND.length];
    return (
      ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) /
        distance(a, b) >=
      12
    );
  });
}
export function walkable(p: Point): boolean {
  if (!onLand(p)) return false;
  if (
    rectangles.some(
      (r) =>
        p.x > r.x - 10 &&
        p.x < r.x + r.w + 10 &&
        p.y > r.y - 10 &&
        p.y < r.y + r.h + 10,
    )
  )
    return false;
  if (((p.x - 840) / 112) ** 2 + ((p.y - 620) / 58) ** 2 < 1) return false;
  return !TREES.some(
    ([x, y, s]) => Math.hypot(p.x - x, (p.y - y) * 1.4) < 14 * s + 8,
  );
}
export function segmentClear(a: Point, b: Point): boolean {
  const steps = Math.ceil(distance(a, b) / 4);
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    if (!walkable({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }))
      return false;
  }
  return true;
}
const nodes: Point[] = [];
const ids = new Map<string, number>();
for (let y = 0; y < ROWS; y++)
  for (let x = 0; x < COLS; x++) {
    const point = { x: x * STEP, y: y * STEP };
    if (walkable(point)) {
      ids.set(`${x},${y}`, nodes.length);
      nodes.push(point);
    }
  }
const edges = nodes.map((p) => {
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const id = ids.get(`${p.x / STEP + dx},${p.y / STEP + dy}`);
      if (id !== undefined && segmentClear(p, nodes[id])) result.push(id);
    }
  return result;
});

export function findPath(start: Point, destination: Point): Point[] {
  if (!walkable(start) || !onLand(destination)) return [];
  if (walkable(destination) && segmentClear(start, destination))
    return [destination];
  let startId = -1,
    best = Infinity;
  nodes.forEach((p, i) => {
    const d = distance(start, p);
    if (d < best && segmentClear(start, p)) {
      best = d;
      startId = i;
    }
  });
  if (startId < 0) return [];
  const parents = new Map<number, number>([[startId, -1]]),
    queue = [startId];
  let closest = startId;
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (
      distance(nodes[id], destination) < distance(nodes[closest], destination)
    )
      closest = id;
    for (const next of edges[id])
      if (!parents.has(next)) {
        parents.set(next, id);
        queue.push(next);
      }
  }
  const route: Point[] = [];
  for (let id = closest; id !== -1; id = parents.get(id)!)
    route.unshift(nodes[id]);
  if (walkable(destination) && segmentClear(nodes[closest], destination))
    route.push(destination);
  // Simplify without cutting across water, trees, buildings or island edges.
  const smooth: Point[] = [];
  let anchor = start,
    index = 0;
  while (index < route.length) {
    let last = index;
    for (let j = index; j < route.length; j++)
      if (segmentClear(anchor, route[j])) last = j;
    smooth.push(route[last]);
    anchor = route[last];
    index = last + 1;
  }
  return smooth;
}

export function moveBy(start: Point, dx: number, dy: number): Point {
  const end = { x: start.x + dx, y: start.y + dy };
  if (segmentClear(start, end)) return end;
  const horizontal = { x: start.x + dx, y: start.y };
  if (segmentClear(start, horizontal)) return horizontal;
  const vertical = { x: start.x, y: start.y + dy };
  return segmentClear(start, vertical) ? vertical : start;
}
