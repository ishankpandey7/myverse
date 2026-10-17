import test from "node:test";
import assert from "node:assert/strict";
import {
  freshSave,
  decodeSave,
  SAVE_KEY,
  completeMission,
  totalXP,
  createProject,
  addMilestone,
  addProjectTask,
} from "../src/game.ts";
import { createSaveSession } from "../src/saveRepository.ts";
import { BEFORE_RESTORE, RAW_BEFORE_RESTORE } from "../src/polish.ts";

function setup(raw = JSON.stringify(freshSave())) {
  const values = new Map(raw === null ? [] : [[SAVE_KEY, raw]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  let tail = Promise.resolve();
  const exclusive = (work) => {
    const result = tail.then(work);
    tail = result.catch(() => {});
    return result;
  };
  return {
    values,
    storage,
    exclusive,
    session: (extras = {}) =>
      createSaveSession({ storage: () => storage, exclusive, ...extras }),
  };
}
const add = (id) => (save) => ({
  ...save,
  missions: [...save.missions, { id, title: id, done: false }],
});

test("stale and simultaneous tabs protect newer progress and retain local unsaved work", async () => {
  for (const simultaneous of [false, true]) {
    const env = setup(),
      a = env.session(),
      b = env.session();
    a.update(add("a"));
    if (!simultaneous) await a.idle();
    b.update(add("b"));
    await Promise.all([a.idle(), b.idle()]);
    assert.deepEqual(
      decodeSave(env.values.get(SAVE_KEY)).missions.map((m) => m.id),
      ["a"],
    );
    assert.equal(b.getSnapshot().status, "conflict");
    assert.equal(b.getSnapshot().dirty, true);
    assert.equal(b.getSnapshot().save.missions[0].id, "b");
    b.update(add("still-local"));
    await b.idle();
    assert.equal(b.getSnapshot().save.missions.length, 2);
    assert.equal(decodeSave(env.values.get(SAVE_KEY)).missions.length, 1);
  }
});

test("same-tab commands queue and shared project completion grants XP once", async () => {
  let world = createProject(freshSave(), "p", "Project");
  world = addMilestone(world, "p", "m", "Milestone");
  world = addProjectTask(world, "p", "m", "task", "Shared mission");
  const env = setup(JSON.stringify(world)),
    session = env.session();
  session.update((s) => completeMission(s, "task"));
  session.update((s) => completeMission(s, "task"));
  session.update(add("extra"));
  await session.idle();
  const saved = decodeSave(env.values.get(SAVE_KEY));
  assert.equal(totalXP(saved), 25);
  assert.deepEqual(saved.projects[0].milestones[0].taskIds, ["task"]);
  assert.equal(saved.missions.length, 2);
  assert.equal(session.getSnapshot().status, "saved");
  assert.equal(session.getSnapshot().dirty, false);
});

test("clean tabs accept external changes and deletion; dirty tabs keep their world", async () => {
  const env = setup(),
    a = env.session(),
    b = env.session();
  a.update(add("new"));
  await a.idle();
  await b.checkExternal();
  assert.equal(b.getSnapshot().save.missions[0].id, "new");
  env.values.delete(SAVE_KEY);
  await b.checkExternal();
  assert.equal(b.getSnapshot().save.missions.length, 0);
  a.update(add("local"));
  await a.idle();
  assert.equal(a.getSnapshot().status, "conflict");
  assert.equal(env.values.has(SAVE_KEY), false);
});

test("unreadable/newer originals stay protected; restore keeps raw original and local session", async () => {
  for (const raw of [
    "corrupt",
    JSON.stringify({ ...freshSave(), version: 99 }),
  ]) {
    const env = setup(raw),
      session = env.session();
    session.update(add("local"));
    await session.idle();
    assert.equal(session.getSnapshot().status, "protected");
    assert.equal(env.values.get(SAVE_KEY), raw);
    assert.equal(
      (await session.restore(await session.preview(freshSave()))).ok,
      true,
    );
    assert.equal(env.values.get(RAW_BEFORE_RESTORE), raw);
    assert.equal(
      decodeSave(env.values.get(BEFORE_RESTORE)).missions[0].id,
      "local",
    );
  }
});

test("v1/v2 coordinated migration writes keep original backups and XP", async () => {
  for (const version of [1, 2]) {
    const raw = JSON.stringify({
      ...freshSave(),
      version,
      missions: [{ id: "old", title: "Old win", done: true }],
    });
    const env = setup(raw),
      session = env.session();
    session.update(add("new"));
    await session.idle();
    assert.equal(env.values.get(`${SAVE_KEY}-backup-v${version}`), raw);
    assert.equal(decodeSave(env.values.get(SAVE_KEY)).version, 3);
    assert.equal(totalXP(session.getSnapshot().save), 25);
  }
});

test("absent/rejected locks and inaccessible storage fail closed while editing/export remains possible", async () => {
  for (const extras of [
    { exclusive: undefined },
    {
      exclusive: async () => {
        throw new Error("lock denied");
      },
    },
    {
      storage: () => {
        throw new Error("storage denied");
      },
    },
  ]) {
    const env = setup(),
      raw = env.values.get(SAVE_KEY),
      session = env.session(extras);
    session.update(add("local"));
    await session.idle();
    assert.equal(session.getSnapshot().status, "unavailable");
    assert.equal(session.getSnapshot().save.missions.length, 1);
    assert.equal(env.values.get(SAVE_KEY), raw);
    assert.equal(
      (await session.restore({ save: freshSave(), raw, serial: 1, epoch: 0 }))
        .ok,
      false,
    );
    assert.equal(env.values.has(BEFORE_RESTORE), false);
  }
});

test("quota failure retains changes and retry only persists against its original base", async () => {
  const env = setup(),
    originalSet = env.storage.setItem;
  env.storage.setItem = () => {
    throw new Error("quota");
  };
  const session = env.session();
  session.update(add("local"));
  await session.idle();
  assert.equal(session.getSnapshot().dirty, true);
  assert.equal(session.getSnapshot().status, "unavailable");
  env.storage.setItem = originalSet;
  session.retry();
  await session.idle();
  assert.equal(session.getSnapshot().status, "saved");
  assert.equal(decodeSave(env.values.get(SAVE_KEY)).missions[0].id, "local");
});

test("a stale restore preview never replaces another tab or its recovery copies", async () => {
  const env = setup(),
    a = env.session(),
    b = env.session();
  const preview = await a.preview(freshSave());
  b.update(add("other"));
  await b.idle();
  assert.equal((await a.restore(preview)).stale, true);
  assert.equal(decodeSave(env.values.get(SAVE_KEY)).missions[0].id, "other");
  assert.equal(env.values.has(BEFORE_RESTORE), false);
  assert.equal(a.getSnapshot().busy, false);
});

test("edits after a preview invalidate replacement and skipped queued writes resume", async () => {
  const env = setup(),
    session = env.session();
  const preview = await session.preview(freshSave());
  session.update(add("keep"));
  assert.equal((await session.restore(preview)).stale, true);
  await session.idle();
  assert.equal(session.getSnapshot().save.missions[0].id, "keep");
  assert.equal(decodeSave(env.values.get(SAVE_KEY)).missions[0].id, "keep");
});

test("restore blocks commands while awaiting lock and resets dependencies before publishing the new world", async () => {
  const env = setup();
  let gate,
    block = false,
    called = 0;
  const session = env.session({
    exclusive: (work) =>
      block
        ? new Promise((resolve) => {
            gate = () => resolve(work());
          })
        : env.exclusive(work),
    onReplace: () => {
      called++;
    },
  });
  const preview = await session.preview({
    ...freshSave(),
    avatar: { ...freshSave().avatar, name: "Restored" },
  });
  block = true;
  const restored = session.restore(preview);
  await Promise.resolve();
  assert.equal(session.update(add("wrong-world")), false);
  gate();
  assert.equal((await restored).ok, true);
  assert.equal(called, 1);
  assert.equal(session.getSnapshot().epoch, 1);
  assert.equal(session.getSnapshot().save.avatar.name, "Restored");
  assert.equal(session.getSnapshot().save.missions.length, 0);
});

test("loading saved progress keeps the conflicted session recoverable and recovery remains one level", async () => {
  const env = setup(),
    a = env.session(),
    b = env.session();
  a.update(add("saved"));
  await a.idle();
  b.update(add("local"));
  await b.idle();
  assert.equal((await b.loadSaved(await b.preview("saved"))).ok, true);
  assert.equal(b.getSnapshot().save.missions[0].id, "saved");
  assert.equal(
    decodeSave(env.values.get(BEFORE_RESTORE)).missions[0].id,
    "local",
  );
  assert.equal((await b.restore(await b.preview("recovery"))).ok, true);
  assert.equal(decodeSave(env.values.get(SAVE_KEY)).missions[0].id, "local");
  assert.equal(
    decodeSave(env.values.get(BEFORE_RESTORE)).missions[0].id,
    "saved",
  );
});

test("changed recovery data invalidates the preview even if the main save is unchanged", async () => {
  const env = setup(),
    session = env.session();
  env.values.set(BEFORE_RESTORE, JSON.stringify(freshSave()));
  const preview = await session.preview("recovery");
  env.values.set(BEFORE_RESTORE, JSON.stringify(add("changed")(freshSave())));
  assert.equal((await session.restore(preview)).stale, true);
  assert.equal(decodeSave(env.values.get(SAVE_KEY)).missions.length, 0);
});

test("failed recovery writes never replace stored progress or discard the local world", async () => {
  for (const failure of [RAW_BEFORE_RESTORE, BEFORE_RESTORE, SAVE_KEY]) {
    const env = setup(),
      session = env.session(),
      originalSet = env.storage.setItem;
    const preview = await session.preview(add("incoming")(freshSave()));
    env.storage.setItem = (key, value) => {
      if (key === failure) throw new Error("quota");
      originalSet(key, value);
    };
    const original = env.values.get(SAVE_KEY);
    assert.equal((await session.restore(preview)).ok, false);
    assert.equal(env.values.get(SAVE_KEY), original);
    assert.equal(session.getSnapshot().epoch, 0);
  }
});

test("invalid external data preserves a readable session; repaired data can be accepted", async () => {
  const env = setup(),
    session = env.session();
  env.values.set(SAVE_KEY, "unreadable");
  await session.checkExternal();
  assert.equal(session.getSnapshot().status, "protected");
  assert.equal(session.getSnapshot().save.missions.length, 0);
  env.values.set(SAVE_KEY, JSON.stringify(add("fixed")(freshSave())));
  await session.checkExternal();
  assert.equal(session.getSnapshot().status, "saved");
  assert.equal(session.getSnapshot().save.missions[0].id, "fixed");
});

test("ordinary writes racing restore serialize and preserve the losing session in either order", async () => {
  for (const restoreFirst of [false, true]) {
    const env = setup(),
      a = env.session(),
      b = env.session();
    const preview = await b.preview(add("restored")(freshSave()));
    let restored;
    if (restoreFirst) restored = b.restore(preview);
    a.update(add("ordinary"));
    if (!restoreFirst) restored = b.restore(preview);
    const result = await restored;
    await Promise.all([a.idle(), b.idle()]);
    const stored = decodeSave(env.values.get(SAVE_KEY));
    if (restoreFirst) {
      assert.equal(result.ok, true);
      assert.equal(a.getSnapshot().status, "conflict");
      assert.equal(a.getSnapshot().save.missions[0].id, "ordinary");
      assert.equal(stored.missions[0].id, "restored");
    } else {
      assert.equal(result.stale, true);
      assert.equal(stored.missions[0].id, "ordinary");
      assert.equal(env.values.has(BEFORE_RESTORE), false);
    }
  }
});

test("loading a stale saved-world review never discards the local session", async () => {
  const env = setup(),
    a = env.session(),
    b = env.session();
  const preview = await a.preview("saved");
  b.update(add("changed"));
  await b.idle();
  assert.equal((await a.loadSaved(preview)).stale, true);
  assert.equal(a.getSnapshot().epoch, 0);
  assert.equal(env.values.has(BEFORE_RESTORE), false);
});

test("a clean session recovers after temporary storage failure with an unchanged save", async () => {
  const env = setup();
  let available = true;
  const session = env.session({
    storage: () => {
      if (!available) throw new Error("denied");
      return env.storage;
    },
  });
  available = false;
  await session.checkExternal();
  assert.equal(session.getSnapshot().status, "unavailable");
  available = true;
  session.retry();
  await session.idle();
  assert.equal(session.getSnapshot().status, "saved");
  assert.equal(session.getSnapshot().dirty, false);
});
