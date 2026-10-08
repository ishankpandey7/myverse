import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { makeGarden } from "../src/world/three/garden.ts";
import { disposeObject } from "../src/world/three/models.ts";
import { freshSave, completeMission, totalXP } from "../src/game.ts";
import { planGrowthMission } from "../src/growth.ts";
import {
  PLACES,
  walkable,
  findPath,
  segmentClear,
  SPAWN,
} from "../src/world/navigation.ts";

test("garden models reflect all four real stages and leave save/XP untouched", () => {
  let save = freshSave();
  for (const [count, stage] of [
    [0, 0],
    [1, 1],
    [3, 2],
    [6, 3],
  ]) {
    while (save.missions.length < count) {
      const id = `m${save.missions.length}`;
      save = completeMission(
        planGrowthMission(save, id, "Real task", "craft"),
        id,
      );
    }
    const raw = JSON.stringify(save),
      root = makeGarden(save);
    root.updateMatrixWorld(true);
    assert.deepEqual(root.userData.stages, [stage, 0, 0]);
    assert.equal(root.getObjectByName("garden-craft").userData.stage, stage);
    assert.equal(JSON.stringify(save), raw);
    assert.equal(totalXP(save), count * 25);
    if (stage === 3)
      assert.ok(
        new T.Box3().setFromObject(root.getObjectByName("garden-craft")).max.y >
          1.9,
      );
    const geometries = new Set(),
      materials = new Set();
    root.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) materials.add(o.material);
    });
    let geometryDisposals = 0,
      materialDisposals = 0;
    for (const g of geometries)
      g.addEventListener("dispose", () => geometryDisposals++);
    for (const m of materials)
      m.addEventListener("dispose", () => materialDisposals++);
    disposeObject(root);
    assert.equal(geometryDisposals, geometries.size);
    assert.equal(materialDisposals, materials.size);
  }
});
test("garden beds block walking but the entrance and existing reward plots remain reachable", () => {
  assert.equal(walkable({ x: 520, y: 605 }), false);
  assert.equal(walkable(PLACES.garden.entrance), true);
  assert.equal(walkable({ x: 600, y: 640 }), true);
  const route = findPath(SPAWN, PLACES.garden.entrance);
  assert.ok(route.length);
  let previous = SPAWN;
  for (const point of route) {
    assert.ok(segmentClear(previous, point));
    previous = point;
  }
  assert.deepEqual(route.at(-1), PLACES.garden.entrance);
});
