import test from "node:test";
import assert from "node:assert/strict";
import {
  SPAWN,
  PLACES,
  findPath,
  walkable,
  segmentClear,
  moveBy,
  distance,
} from "../src/world/navigation.ts";

function checkRoute(start, route) {
  assert.ok(route.length > 0, "a route exists");
  let previous = start;
  for (const point of route) {
    assert.ok(walkable(point));
    assert.ok(
      segmentClear(previous, point),
      "every segment stays clear of obstacles",
    );
    previous = point;
  }
}
test("both buildings can be reached from spawn and from one another", () => {
  for (const start of [
    SPAWN,
    ...Object.values(PLACES).map((p) => p.entrance),
  ]) {
    for (const place of Object.values(PLACES)) {
      const path = findPath(start, place.entrance);
      checkRoute(start, path);
      assert.deepEqual(path.at(-1), place.entrance);
    }
  }
});
test("routes around the pond instead of walking through water", () => {
  const start = { x: 700, y: 620 },
    end = { x: 1000, y: 620 };
  assert.equal(segmentClear(start, end), false);
  const path = findPath(start, end);
  checkRoute(start, path);
  assert.deepEqual(path.at(-1), end);
});
test("a click inside water resolves to a reachable shore", () => {
  const path = findPath(SPAWN, { x: 840, y: 620 });
  checkRoute(SPAWN, path);
  assert.ok(distance(path.at(-1), { x: 840, y: 620 }) < 125);
});
test("clicks beyond the island do not create a route", () => {
  assert.deepEqual(findPath(SPAWN, { x: 0, y: 0 }), []);
});
test("keyboard movement cannot tunnel through buildings or the pond", () => {
  for (const [start, dx, dy] of [
    [{ x: 520, y: 500 }, 0, -170],
    [{ x: 700, y: 620 }, 300, 0],
  ]) {
    const end = moveBy(start, dx, dy);
    assert.ok(walkable(end));
    assert.ok(segmentClear(start, end));
  }
});
test("repeated edge movement keeps the character on land", () => {
  let position = SPAWN;
  for (let i = 0; i < 1000; i++) position = moveBy(position, -6, 0);
  assert.ok(walkable(position));
  assert.ok(position.x > 130);
});
