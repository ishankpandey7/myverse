import test from "node:test";
import assert from "node:assert/strict";
import {
  freshSave,
  decodeSave,
  loadGame,
  persistGame,
  SAVE_KEY,
  completeMission,
  promoteIdea,
  totalXP,
  unlockedRewards,
  placeReward,
  removeReward,
  PLOTS,
} from "../src/game.ts";
import { walkable } from "../src/world/navigation.ts";
test("promoting an idea moves it once without granting XP and survives reload", () => {
  const save = freshSave();
  save.ideas = [
    { id: "spark", title: "Build a moon garden", done: false },
    { id: "keep", title: "Another thought", done: false },
  ];
  const next = promoteIdea(save, "spark");
  assert.deepEqual(next.missions, [
    { id: "spark", title: "Build a moon garden", done: false },
  ]);
  assert.deepEqual(next.ideas, [save.ideas[1]]);
  assert.equal(save.ideas.length, 2);
  assert.equal(totalXP(next), 0);
  assert.equal(promoteIdea(next, "spark"), next);
  assert.equal(promoteIdea(next, "missing"), next);
  assert.deepEqual(decodeSave(JSON.stringify(next)), next);
  assert.equal(totalXP(completeMission(next, "spark")), 25);
});
test("an idea cannot overwrite a mission with the same id", () => {
  const save = freshSave();
  save.ideas = [{ id: "shared", title: "Keep this spark", done: false }];
  save.missions = [{ id: "shared", title: "Existing task", done: true }];
  assert.equal(promoteIdea(save, "shared"), save);
});
const old = {
  version: 1,
  missions: [{ id: "old-done", title: "My existing mission", done: true }],
  ideas: [{ id: "old-idea", title: "Keep this idea", done: false }],
};
const storage = (raw = null) => {
  const values = new Map(raw === null ? [] : [[SAVE_KEY, raw]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};
function withXP(count) {
  return {
    ...freshSave(),
    missions: Array.from({ length: count }, (_, i) => ({
      id: `mission-${i}`,
      title: `Mission ${i}`,
      done: true,
    })),
  };
}

test("old saves migrate without losing missions, ideas or earned XP", () => {
  const save = decodeSave(JSON.stringify(old));
  assert.equal(save.version, 2);
  assert.deepEqual(save.missions, old.missions);
  assert.deepEqual(save.ideas, old.ideas);
  assert.equal(totalXP(save), 25);
  assert.deepEqual(unlockedRewards(save), ["lantern"]);
});
test("first migrated write preserves an untouched backup of the original save", () => {
  const original = JSON.stringify(old),
    store = storage(original),
    save = loadGame(store).save;
  assert.equal(persistGame(store, save), "");
  assert.equal(store.getItem(`${SAVE_KEY}-backup-v1`), original);
  assert.equal(loadGame(store).save.version, 2);
  assert.equal(
    persistGame(store, { ...save, avatar: { ...save.avatar, name: "Ishank" } }),
    "",
  );
  assert.equal(store.getItem(`${SAVE_KEY}-backup-v1`), original);
});
test("invalid and future saves are never overwritten", () => {
  for (const original of [
    "broken JSON",
    JSON.stringify({ ...old, version: 99 }),
  ]) {
    const store = storage(original);
    assert.ok(loadGame(store).error);
    assert.ok(persistGame(store, freshSave()));
    assert.equal(store.getItem(SAVE_KEY), original);
  }
});
test("mission completion grants XP only once and unlocks at 25, 75 and 150 XP", () => {
  let save = {
    ...freshSave(),
    missions: [{ id: "one", title: "First step", done: false }],
  };
  assert.deepEqual(unlockedRewards(save), []);
  save = completeMission(save, "one");
  assert.equal(totalXP(save), 25);
  assert.equal(completeMission(save, "one"), save);
  assert.equal(completeMission(save, "missing"), save);
  assert.deepEqual(unlockedRewards(withXP(2)), ["lantern"]);
  assert.deepEqual(unlockedRewards(withXP(3)), ["lantern", "flowers"]);
  assert.deepEqual(unlockedRewards(withXP(6)), [
    "lantern",
    "flowers",
    "crystal",
  ]);
});
test("locked rewards and occupied plots cannot be placed", () => {
  const locked = freshSave();
  assert.equal(placeReward(locked, "lantern", "garden"), locked);
  const save = placeReward(withXP(6), "lantern", "garden");
  assert.equal(placeReward(save, "flowers", "garden"), save);
  assert.equal(placeReward(save, "flowers", "unknown"), save);
});
test("moving and returning a reward keep its one copy and never spend XP", () => {
  let save = placeReward(withXP(3), "lantern", "garden");
  save = placeReward(save, "lantern", "meadow");
  assert.deepEqual(save.decorations, { lantern: "meadow" });
  assert.equal(totalXP(save), 75);
  save = removeReward(save, "lantern");
  assert.deepEqual(save.decorations, {});
  assert.ok(unlockedRewards(save).includes("lantern"));
});
test("avatar and placed decorations survive a save/reload round trip", () => {
  const store = storage();
  const save = placeReward(
    {
      ...withXP(1),
      avatar: { name: "Ishank", outfit: "sage", skin: "deep", hat: "beanie" },
    },
    "lantern",
    "meadow",
  );
  assert.equal(persistGame(store, save), "");
  assert.deepEqual(loadGame(store).save, save);
});
test("decoration spots sit on usable land", () => {
  for (const plot of Object.values(PLOTS)) assert.ok(walkable(plot), plot.name);
});
test("a failed write reports an error instead of reporting a saved world", () => {
  const store = {
    getItem: () => null,
    setItem: () => {
      throw new Error("Storage full");
    },
  };
  assert.equal(persistGame(store, freshSave()), "Storage full");
});
