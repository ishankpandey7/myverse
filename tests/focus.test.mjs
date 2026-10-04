import test from "node:test";
import assert from "node:assert/strict";
import {
  FOCUS_KEY,
  startFocus,
  remainingFocus,
  advanceFocus,
  pauseFocus,
  resumeFocus,
  readFocus,
  storeFocus,
  formatFocus,
} from "../src/focus.ts";
import {
  freshSave,
  createProject,
  addMilestone,
  addProjectTask,
  completeMission,
  projectProgress,
  totalXP,
  SAVE_KEY,
} from "../src/game.ts";

function storage() {
  const values = new Map([[SAVE_KEY, "original-world"]]);
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
test("focus uses a deadline and catches up after a background tab or late tick", () => {
  const timer = startFocus(25, "mission", 1000),
    before = JSON.stringify(timer);
  assert.equal(remainingFocus(timer, 61_000), 24 * 60_000);
  assert.equal(advanceFocus(timer, 61_000), timer);
  const finished = advanceFocus(timer, 1_700_000);
  assert.equal(finished.status, "finished");
  assert.equal(finished.remainingMs, 0);
  assert.equal(advanceFocus(finished, 1_800_000), finished);
  assert.equal(JSON.stringify(timer), before);
  assert.equal(remainingFocus(timer, -10_000), timer.durationMs);
});
test("pause and resume retain partial seconds and exclude time on a break", () => {
  const timer = pauseFocus(startFocus(1, "mission", 1000), 2499);
  assert.equal(timer.remainingMs, 58_501);
  assert.equal(remainingFocus(timer, 5_000_000), 58_501);
  const resumed = resumeFocus(timer, 10_000);
  assert.equal(resumed.deadline, 68_501);
  assert.equal(pauseFocus(resumed, 68_501).status, "finished");
  assert.equal(resumeFocus(resumed, 20_000), resumed);
});
test("reload restores running, paused and expired sessions without touching world data", () => {
  const store = storage(),
    timer = startFocus(10, "mission", 1000);
  assert.equal(storeFocus(store, timer), "");
  assert.equal(readFocus(store, 61_000).session.status, "running");
  assert.equal(
    remainingFocus(readFocus(store, 61_000).session, 61_000),
    540_000,
  );
  assert.equal(readFocus(store, 700_000).session.status, "finished");
  const paused = pauseFocus(timer, 61_000);
  storeFocus(store, paused);
  assert.deepEqual(readFocus(store, 700_000).session, paused);
  storeFocus(store, null);
  assert.equal(readFocus(store, 700_000).session, null);
  assert.equal(store.values.get(SAVE_KEY), "original-world");
});
test("corrupt or newer focus records are ignored and left intact", () => {
  const store = storage(),
    valid = startFocus(10, "mission", 1000);
  for (const raw of [
    "unreadable",
    "null",
    JSON.stringify({ ...valid, version: 2 }),
    JSON.stringify({ ...valid, remainingMs: -1 }),
    JSON.stringify({ ...valid, deadline: null }),
    JSON.stringify({ ...valid, deadline: 99_000_000 }),
    JSON.stringify({
      ...valid,
      status: "finished",
      remainingMs: 42,
      deadline: null,
    }),
  ]) {
    store.values.set(FOCUS_KEY, raw);
    const loaded = readFocus(store, 1000);
    assert.equal(loaded.session, null);
    assert.ok(loaded.error);
    assert.equal(store.values.get(FOCUS_KEY), raw);
  }
});
test("duration boundaries and storage failures cannot create a broken timer", () => {
  for (const duration of [0, -1, 121, 0.5, NaN, Infinity])
    assert.equal(startFocus(duration, "", 1000), null);
  assert.ok(startFocus(1, "", 1000));
  assert.ok(startFocus(120, "", 1000));
  const broken = {
    getItem: () => {
      throw new Error();
    },
    setItem: () => {
      throw new Error();
    },
    removeItem: () => {
      throw new Error();
    },
  };
  assert.ok(readFocus(broken, 1000).error);
  assert.ok(storeFocus(broken, startFocus(1, "", 1000)));
  assert.ok(storeFocus(broken, null));
  assert.equal(formatFocus(58_501), "00:59");
  assert.equal(formatFocus(0), "00:00");
  assert.equal(formatFocus(120 * 60_000), "120:00");
});
test("finishing focus grants no XP; explicit shared task completion grants it once", () => {
  let save = addProjectTask(
    addMilestone(createProject(freshSave(), "p", "Build"), "p", "m", "Ship"),
    "p",
    "m",
    "task",
    "Real work",
  );
  const before = JSON.stringify(save),
    timer = advanceFocus(startFocus(1, "task", 0), 60_000);
  assert.equal(timer.status, "finished");
  assert.equal(JSON.stringify(save), before);
  assert.equal(totalXP(save), 0);
  save = completeMission(save, timer.missionId);
  assert.equal(totalXP(completeMission(save, timer.missionId)), 25);
  assert.equal(projectProgress(save, save.projects[0]).complete, true);
});
