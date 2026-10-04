import type { Point } from "../navigation";
export const WORLD_SCALE = 0.022;
export function toWorld(point: Point) {
  return { x: (point.x - 700) * WORLD_SCALE, z: (point.y - 490) * WORLD_SCALE };
}
export function toIsland(x: number, z: number): Point {
  return { x: x / WORLD_SCALE + 700, y: z / WORLD_SCALE + 490 };
}
