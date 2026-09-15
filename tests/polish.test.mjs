import test from "node:test";
import assert from "node:assert/strict";
import {
  freshSave,
  createProject,
  addMilestone,
  addProjectTask,
  completeMission,
  totalXP,
  projectProgress,
  SAVE_KEY,
  decodeSave,
} from "../src/game.ts";
import {
  renameItem,
  restoreGame,
  BEFORE_RESTORE,
  RAW_BEFORE_RESTORE,
} from "../src/polish.ts";
test("renaming shared tasks, projects and milestones preserves identity, completion and XP", () => {
  let save = createProject(freshSave(), "p", "Old project");
  save = addMilestone(save, "p", "m", "Old milestone");
  save = addProjectTask(save, "p", "m", "t", "Old task");
  save = completeMission(save, "t");
  save = renameItem(save, "missions", "t", " New task ");
  save = renameItem(save, "projects", "p", "New project");
  save = renameItem(save, "milestones", "m", "New milestone");
  assert.equal(save.missions[0].title, "New task");
  assert.equal(save.projects[0].title, "New project");
  assert.equal(save.projects[0].milestones[0].title, "New milestone");
  assert.deepEqual(save.projects[0].milestones[0].taskIds, ["t"]);
  assert.equal(totalXP(save), 25);
  assert.equal(projectProgress(save, save.projects[0]).complete, true);
  assert.deepEqual(decodeSave(JSON.stringify(save)), save);
  assert.equal(renameItem(save, "missions", "t", "  "), save);
  assert.equal(renameItem(save, "projects", "p", "x".repeat(161)), save);
  assert.equal(renameItem(save, "ideas", "missing", "Title"), save);
});
test("idea rename keeps its id and the rest of the world unchanged", () => {
  const save = freshSave();
  save.ideas = [{ id: "i", title: "Old", done: false }];
  const next = renameItem(save, "ideas", "i", "New");
  assert.deepEqual(next.ideas, [{ id: "i", title: "New", done: false }]);
  assert.equal(next.projects, save.projects);
});
test("restore saves a recoverable session and preserves unreadable original data", () => {
  const values = new Map([[SAVE_KEY, "unreadable-original"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const current = createProject(freshSave(), "p", "Unsaved session"),
    incoming = freshSave();
  incoming.avatar.name = "Restored";
  assert.equal(restoreGame(storage, incoming, current), "");
  assert.equal(values.get(RAW_BEFORE_RESTORE), "unreadable-original");
  assert.deepEqual(decodeSave(values.get(BEFORE_RESTORE)), current);
  assert.deepEqual(decodeSave(values.get(SAVE_KEY)), incoming);
  const recovery = decodeSave(values.get(BEFORE_RESTORE));
  assert.equal(restoreGame(storage, recovery, incoming), "");
  assert.deepEqual(decodeSave(values.get(SAVE_KEY)), current);
});
test("invalid backups and failed writes never replace the current save", () => {
  for (const failKey of [BEFORE_RESTORE, RAW_BEFORE_RESTORE, SAVE_KEY]) {
    const raw = JSON.stringify(freshSave()),
      values = new Map([[SAVE_KEY, raw]]);
    const storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        if (key === failKey) throw new Error("quota");
        values.set(key, value);
      },
    };
    assert.notEqual(restoreGame(storage, freshSave(), freshSave()), "");
    assert.equal(values.get(SAVE_KEY), raw);
  }
  const values = new Map([[SAVE_KEY, "original"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.notEqual(restoreGame(storage, { version: 99 }, freshSave()), "");
  assert.equal(values.get(SAVE_KEY), "original");
  assert.equal(values.has(BEFORE_RESTORE), false);
});
