import test from "node:test";
import assert from "node:assert/strict";
import {
  freshSave,
  completeMission,
  totalXP,
  decodeSave,
  persistGame,
  loadGame,
  SAVE_KEY,
  createProject,
  addMilestone,
  addProjectTask,
} from "../src/game.ts";
import {
  assignSkill,
  planGrowthMission,
  gardenProgress,
  galleryProgress,
  recordAchievements,
} from "../src/growth.ts";
import { renameItem, restoreGame, BEFORE_RESTORE } from "../src/polish.ts";

function store(raw) {
  const values = new Map(raw === undefined ? [] : [[SAVE_KEY, raw]]);
  return {
    values,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
  };
}
function grown(count = 6) {
  let save = freshSave();
  for (let i = 0; i < count; i++)
    save = completeMission(
      planGrowthMission(save, `m${i}`, `Work ${i}`, "craft"),
      `m${i}`,
    );
  return recordAchievements(save);
}
test("growth follows completed shared missions, with real stage thresholds and no added XP", () => {
  let save = freshSave();
  for (let i = 0; i < 7; i++) {
    save = planGrowthMission(save, `m${i}`, "Make", "craft");
    assert.equal(gardenProgress(save)[0].done, i);
    save = completeMission(save, `m${i}`);
    assert.equal(totalXP(save), (i + 1) * 25);
    assert.equal(gardenProgress(save)[0].stage, [1, 1, 2, 2, 2, 3, 3][i]);
  }
  assert.equal(gardenProgress(save)[0].next, undefined);
  assert.equal(totalXP(recordAchievements(completeMission(save, "m0"))), 175);
});
test("past work can be assigned and moved without changing IDs, completion or project links", () => {
  let save = addProjectTask(
    addMilestone(createProject(freshSave(), "p", "Build"), "p", "s", "Ship"),
    "p",
    "s",
    "task",
    "Real work",
  );
  save = completeMission(save, "task");
  const projects = save.projects;
  save = assignSkill(save, "task", "curiosity");
  assert.equal(gardenProgress(save)[1].done, 1);
  save = assignSkill(save, "task", "wellbeing");
  assert.equal(gardenProgress(save)[1].done, 0);
  assert.equal(gardenProgress(save)[2].done, 1);
  save = renameItem(save, "missions", "task", "Still the same task");
  assert.equal(save.missions[0].skill, "wellbeing");
  assert.equal(save.missions[0].id, "task");
  assert.equal(save.missions[0].done, true);
  assert.equal(totalXP(save), 25);
  assert.deepEqual(save.projects, projects);
  save = assignSkill(save, "task", "");
  assert.equal("skill" in save.missions[0], false);
  assert.equal(totalXP(save), 25);
});
test("earned milestones persist when assignments or project plans change, with no bonus XP", () => {
  let save = grown(),
    before = JSON.stringify(save);
  assert.ok(galleryProgress(save).find((a) => a.id === "in-bloom").earned);
  assert.equal(JSON.stringify(save), before);
  for (let i = 0; i < 6; i++) save = assignSkill(save, `m${i}`, "");
  assert.equal(gardenProgress(save)[0].stage, 0);
  assert.ok(galleryProgress(save).find((a) => a.id === "in-bloom").earned);
  assert.equal(totalXP(save), 150);
  assert.equal(recordAchievements(save), save);
});
test("balanced growth requires three distinct completed assignments; empty milestones do not earn Builder", () => {
  let save = grown(1);
  save = assignSkill(save, "m0", "curiosity");
  save = assignSkill(save, "m0", "wellbeing");
  assert.equal(
    galleryProgress(save).find((a) => a.id === "balanced").earned,
    false,
  );
  save = completeMission(
    planGrowthMission(save, "craft", "Make", "craft"),
    "craft",
  );
  save = completeMission(
    planGrowthMission(save, "curious", "Learn", "curiosity"),
    "curious",
  );
  save = recordAchievements(save);
  assert.ok(save.growth.earned.includes("balanced"));
  save = addProjectTask(
    addMilestone(createProject(save, "p", "Build"), "p", "s", "Ship"),
    "p",
    "s",
    "task",
    "Task",
  );
  save = addMilestone(completeMission(save, "task"), "p", "empty", "Later");
  assert.equal(
    galleryProgress(save).find((a) => a.id === "builder").earned,
    false,
  );
});
test("old v3 and v1/v2 worlds remain compatible; garden data survives export, restore and recovery", () => {
  const old = freshSave();
  assert.deepEqual(decodeSave(JSON.stringify(old)), old);
  const world = grown(),
    storage = store(JSON.stringify(old));
  assert.equal(restoreGame(storage, world, old), "");
  assert.deepEqual(loadGame(storage).save, world);
  assert.deepEqual(decodeSave(storage.values.get(BEFORE_RESTORE)), old);
  for (const version of [1, 2]) {
    const legacy = JSON.stringify({ ...old, version });
    const migrated = store(legacy);
    assert.equal(persistGame(migrated, loadGame(migrated).save), "");
    assert.equal(migrated.values.get(`${SAVE_KEY}-backup-v${version}`), legacy);
  }
});
test("invalid skill and milestone records preserve unreadable originals and block autosave/restore", () => {
  for (const bad of [
    {
      ...grown(1),
      missions: [{ id: "x", title: "X", done: true, skill: "unknown" }],
    },
    { ...grown(), growth: { earned: ["invented"] } },
    { ...grown(), growth: { earned: ["first-step", "first-step"] } },
    { ...grown(), growth: null },
  ]) {
    const raw = JSON.stringify(bad),
      storage = store(raw);
    assert.throws(() => decodeSave(raw));
    assert.ok(persistGame(storage, freshSave()));
    assert.equal(storage.values.get(SAVE_KEY), raw);
    assert.ok(restoreGame(storage, bad, freshSave()));
    assert.equal(storage.values.get(SAVE_KEY), raw);
  }
});
test("invalid/no-op assignment and planning do not change the world", () => {
  const save = grown(1);
  assert.equal(assignSkill(save, "missing", "craft"), save);
  assert.equal(assignSkill(save, "m0", "craft"), save);
  assert.equal(assignSkill(save, "m0", "bogus"), save);
  assert.equal(planGrowthMission(save, "m0", "Duplicate", "craft"), save);
  assert.equal(planGrowthMission(save, "new", " ", "craft"), save);
  assert.equal(planGrowthMission(save, "new", "No", "bogus"), save);
});
test("legacy earned milestones are remembered before moving credit or expanding a finished project", () => {
  let save = { ...grown(), growth: undefined };
  save = assignSkill(save, "m0", "curiosity");
  assert.ok(save.growth.earned.includes("in-bloom"));
  save = addProjectTask(
    addMilestone(createProject(freshSave(), "p", "Build"), "p", "s", "Ship"),
    "p",
    "s",
    "task",
    "Finish",
  );
  save = recordAchievements(completeMission(save, "task"));
  save = addProjectTask(save, "p", "s", "later", "Keep building");
  assert.ok(galleryProgress(save).find((a) => a.id === "builder").earned);
  assert.equal(totalXP(save), 25);
});
