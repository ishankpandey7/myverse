import test from "node:test";
import assert from "node:assert/strict";
import {
  freshSave,
  totalXP,
  completeMission,
  decodeSave,
  persistGame,
  SAVE_KEY,
  createProject,
  addMilestone,
  addProjectTask,
} from "../src/game.ts";
import {
  FRAGMENTS,
  FRAGMENT_IDS,
  BEACON,
  collectFragment,
  canLightBeacon,
  lightBeacon,
} from "../src/starfall.ts";
import {
  walkable,
  findPath,
  SPAWN,
  distance,
} from "../src/world/navigation.ts";
import { restoreGame, BEFORE_RESTORE } from "../src/polish.ts";

test("all story stops are on reachable land, including paths between fragments", () => {
  let position = SPAWN;
  for (const point of [...Object.values(FRAGMENTS), BEACON]) {
    assert.equal(walkable(point), true);
    const route = findPath(position, point);
    assert.ok(route.length > 0);
    assert.ok(distance(route.at(-1), point) < 5);
    position = route.at(-1);
  }
});

test("exploration is collected once and beacon requires both fragments and a real mission; XP stays shared", () => {
  let save = createProject(freshSave(), "project", "A real project");
  save = addMilestone(save, "project", "milestone", "First result");
  save = addProjectTask(
    save,
    "project",
    "milestone",
    "task",
    "Finish a real step",
  );
  const missions = save.missions,
    projects = save.projects;
  assert.equal(lightBeacon(save), save);
  for (const id of FRAGMENT_IDS) {
    save = collectFragment(save, id);
    assert.equal(collectFragment(save, id), save);
  }
  assert.equal(collectFragment(save, "unknown"), save);
  assert.equal(save.missions, missions);
  assert.equal(save.projects, projects);
  assert.equal(totalXP(save), 0);
  assert.equal(canLightBeacon(save), false);
  assert.equal(lightBeacon(save), save);
  save = completeMission(save, "task");
  assert.equal(canLightBeacon(save), true);
  const lit = lightBeacon(save);
  assert.equal(lit.starfall.beaconLit, true);
  assert.equal(lightBeacon(lit), lit);
  assert.equal(totalXP(lit), 25);
  assert.equal(completeMission(lit, "task"), lit);
  assert.deepEqual(decodeSave(JSON.stringify(lit)), lit);
  const noFragments = { ...lit, starfall: undefined };
  assert.equal(lightBeacon(noFragments), noFragments);
});

test("existing v3 worlds stay compatible; story survives autosave, export, restore and recovery", () => {
  const original = freshSave();
  assert.deepEqual(decodeSave(JSON.stringify(original)), original);
  const session = collectFragment(original, "grove");
  const raw = JSON.stringify(original),
    values = new Map([[SAVE_KEY, raw]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(persistGame(storage, session), "");
  assert.deepEqual(decodeSave(values.get(SAVE_KEY)), session);
  const exported = decodeSave(JSON.stringify(session));
  assert.equal(restoreGame(storage, original, exported), "");
  assert.deepEqual(decodeSave(values.get(BEFORE_RESTORE)), exported);
  assert.equal(restoreGame(storage, exported, original), "");
  assert.deepEqual(decodeSave(values.get(SAVE_KEY)), session);
});

test("corrupt story state cannot replace browser data through autosave or backup restore", () => {
  for (const starfall of [
    null,
    { fragments: ["unknown"], beaconLit: false },
    { fragments: ["grove", "grove"], beaconLit: false },
    { fragments: [], beaconLit: true },
    { fragments: FRAGMENT_IDS, beaconLit: "yes" },
    { fragments: FRAGMENT_IDS, beaconLit: true },
  ]) {
    const invalid = { ...freshSave(), starfall };
    const raw = JSON.stringify(invalid),
      values = new Map([[SAVE_KEY, raw]]);
    const storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
    assert.throws(() => decodeSave(raw));
    assert.notEqual(persistGame(storage, freshSave()), "");
    assert.equal(values.get(SAVE_KEY), raw);
    assert.notEqual(restoreGame(storage, invalid, freshSave()), "");
    assert.equal(values.get(SAVE_KEY), raw);
  }
});
