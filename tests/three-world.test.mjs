import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { LAND, SPAWN, PLACES } from "../src/world/navigation.ts";
import { toWorld, toIsland } from "../src/world/three/coordinates.ts";
import {
  makeTerrain,
  makeWorkshop,
  disposeObject,
} from "../src/world/three/models.ts";
import {
  freshSave,
  createProject,
  addMilestone,
  addProjectTask,
  completeMission,
  totalXP,
} from "../src/game.ts";

test("3D ground and navigation use the same island coordinates", () => {
  for (const point of [
    SPAWN,
    ...LAND,
    ...Object.values(PLACES).map((p) => p.entrance),
  ]) {
    const world = toWorld(point),
      restored = toIsland(world.x, world.z);
    assert.ok(Math.abs(restored.x - point.x) < 1e-9);
    assert.ok(Math.abs(restored.y - point.y) < 1e-9);
  }
  const terrain = makeTerrain();
  terrain.top.updateMatrixWorld();
  const bounds = new T.Box3().setFromObject(terrain.top);
  const outline = LAND.map(toWorld);
  assert.ok(
    Math.abs(bounds.min.x - Math.min(...outline.map((p) => p.x))) < 1e-5,
  );
  assert.ok(
    Math.abs(bounds.max.z - Math.max(...outline.map((p) => p.z))) < 1e-5,
  );
  assert.ok(Math.abs(bounds.min.y) < 1e-5);
  disposeObject(terrain.group);
});

test("living Workshop grows from shared mission completion without mutating saves", () => {
  let save = createProject(freshSave(), "project", "A real build");
  save = addMilestone(save, "project", "milestone", "Ship it");
  function model(stage) {
    const before = JSON.stringify(save),
      mesh = makeWorkshop(save, "project");
    assert.equal(mesh.userData.stage, stage);
    assert.equal(JSON.stringify(save), before);
    assert.equal(!!mesh.getObjectByName("pitched-roof"), stage >= 2);
    disposeObject(mesh);
  }
  model(0);
  save = addProjectTask(save, "project", "milestone", "first", "First step");
  save = addProjectTask(save, "project", "milestone", "second", "Second step");
  model(1);
  save = completeMission(save, "first");
  model(2);
  save = completeMission(save, "second");
  model(3);
  assert.equal(totalXP(completeMission(save, "first")), 50);
});

test("replacing a model releases shared GPU resources once", () => {
  const geometry = new T.BoxGeometry(),
    material = new T.MeshStandardMaterial();
  let geometryDisposed = 0,
    materialDisposed = 0;
  geometry.addEventListener("dispose", () => geometryDisposed++);
  material.addEventListener("dispose", () => materialDisposed++);
  const group = new T.Group();
  group.add(new T.Mesh(geometry, material), new T.Mesh(geometry, material));
  disposeObject(group);
  assert.equal(geometryDisposed, 1);
  assert.equal(materialDisposed, 1);
});
