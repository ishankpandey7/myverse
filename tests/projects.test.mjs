import test from "node:test";
import assert from "node:assert/strict";
import {
  freshSave,
  decodeSave,
  persistGame,
  SAVE_KEY,
  createProject,
  addMilestone,
  addProjectTask,
  completeMission,
  totalXP,
  projectProgress,
} from "../src/game.ts";
test("v2 upgrade preserves avatar, rewards, ideas and XP and keeps an original backup", () => {
  const old = {
    ...freshSave(),
    version: 2,
    missions: [{ id: "old", title: "Existing win", done: true }],
    ideas: [{ id: "idea", title: "Keep me", done: false }],
    decorations: { lantern: "garden" },
  };
  delete old.projects;
  const raw = JSON.stringify(old),
    values = new Map([[SAVE_KEY, raw]]);
  const store = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const save = decodeSave(raw);
  assert.equal(save.version, 3);
  assert.deepEqual(save.projects, []);
  assert.deepEqual(save.avatar, old.avatar);
  assert.deepEqual(save.decorations, old.decorations);
  assert.deepEqual(save.ideas, old.ideas);
  assert.equal(totalXP(save), 25);
  assert.equal(persistGame(store, save), "");
  assert.equal(values.get(`${SAVE_KEY}-backup-v2`), raw);
});
test("project model stages follow real tasks, empty milestones do not count and tasks award XP once", () => {
  let save = createProject(freshSave(), "p", "My game");
  const stats = () => projectProgress(save, save.projects[0]);
  assert.equal(stats().stage, 0);
  save = addMilestone(save, "p", "m", "Prototype");
  assert.equal(stats().complete, false);
  save = addProjectTask(save, "p", "m", "t1", "Create a character");
  save = addProjectTask(save, "p", "m", "t2", "Build a level");
  assert.equal(stats().stage, 1);
  save = completeMission(save, "t1");
  assert.equal(stats().stage, 2);
  assert.equal(stats().percent, 50);
  assert.equal(totalXP(save), 25);
  assert.equal(completeMission(save, "t1"), save);
  save = completeMission(save, "t2");
  assert.equal(stats().stage, 3);
  assert.equal(stats().complete, true);
  assert.equal(totalXP(save), 50);
  save = addMilestone(save, "p", "m2", "Release");
  assert.equal(stats().complete, false);
  assert.equal(stats().milestones, 1);
  assert.deepEqual(decodeSave(JSON.stringify(save)), save);
});
test("invalid project actions cannot create orphan tasks or change unrelated projects", () => {
  let save = createProject(freshSave(), "p", "First");
  save = createProject(save, "q", "Second");
  save = addMilestone(save, "p", "m", "Plan");
  assert.equal(addProjectTask(save, "q", "m", "t", "Wrong project"), save);
  assert.equal(addMilestone(save, "missing", "n", "Missing"), save);
  assert.equal(createProject(save, "other", "   "), save);
  const next = addProjectTask(save, "p", "m", "t", "Valid task");
  assert.equal(addProjectTask(next, "p", "m", "t", "Duplicate"), next);
  assert.deepEqual(next.projects[1], save.projects[1]);
});
test("broken project references and duplicate task membership are rejected", () => {
  let save = createProject(freshSave(), "p", "Project");
  save = addMilestone(save, "p", "m", "Milestone");
  save = addProjectTask(save, "p", "m", "t", "Task");
  const broken = structuredClone(save);
  broken.projects[0].milestones[0].taskIds.push("missing");
  assert.throws(() => decodeSave(JSON.stringify(broken)));
  const duplicate = structuredClone(save);
  duplicate.projects[0].milestones[0].taskIds.push("t");
  assert.throws(() => decodeSave(JSON.stringify(duplicate)));
});
