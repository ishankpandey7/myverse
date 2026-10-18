import test from "node:test";
import assert from "node:assert/strict";
import {
  freshSave,
  createProject,
  addMilestone,
  addProjectTask,
  completeMission,
  archiveProject,
  totalXP,
} from "../src/game.ts";
import { renameItem } from "../src/polish.ts";
import { workshopAppearance } from "../src/world/three/workshop-appearance.ts";
import {
  makeWorkshop,
  updateWorkshopModel,
  disposeObject,
} from "../src/world/three/models.ts";

function world(tasks = 3) {
  let save = freshSave();
  for (const id of ["a", "b"]) {
    save = createProject(save, id, `Build ${id}`);
    save = addMilestone(save, id, `${id}-m`, "Milestone");
    for (let i = 0; i < tasks; i++)
      save = addProjectTask(save, id, `${id}-m`, `${id}-${i}`, `Task ${i}`);
  }
  return save;
}

test("appearance resolves the selected active build, archived fallback and an empty shelf without mutating data", () => {
  let save = world(),
    before = JSON.stringify(save);
  assert.deepEqual(workshopAppearance(save, "b"), { projectId: "b", stage: 1 });
  assert.equal(JSON.stringify(save), before);
  save = archiveProject(save, "b", true);
  assert.deepEqual(workshopAppearance(save, "b"), { projectId: "a", stage: 1 });
  assert.deepEqual(workshopAppearance(save, "missing"), {
    projectId: "a",
    stage: 1,
  });
  save = archiveProject(save, "a", true);
  assert.deepEqual(workshopAppearance(save, "a"), { projectId: "", stage: 0 });
});

test("unrelated edits and title changes keep exact Workshop meshes, materials and geometry alive", () => {
  let save = world();
  const model = makeWorkshop(workshopAppearance(save, "a")),
    objects = [];
  let disposed = 0;
  model.traverse((object) => {
    if (object.geometry) {
      objects.push([object, object.geometry, object.material]);
      object.geometry.addEventListener("dispose", () => disposed++);
    }
  });
  for (let i = 0; i < 40; i++) {
    save = renameItem(save, "projects", "b", `Other title ${i}`);
    save = renameItem(save, "projects", "a", `Selected title ${i}`);
    save = renameItem(save, "milestones", "a-m", `Planning ${i}`);
    save = completeMission(save, `b-${i % 3}`);
    const before = JSON.stringify(save);
    assert.equal(
      updateWorkshopModel(model, workshopAppearance(save, "a")),
      model,
    );
    assert.equal(JSON.stringify(save), before);
  }
  assert.equal(disposed, 0);
  for (const [object, geometry, material] of objects) {
    assert.equal(object.geometry, geometry);
    assert.equal(object.material, material);
  }
  disposeObject(model);
});

test("switching equal-stage projects reuses the object but updates identity for later progress", () => {
  let save = world();
  const first = makeWorkshop(workshopAppearance(save, "a"));
  const switched = updateWorkshopModel(first, workshopAppearance(save, "b"));
  assert.equal(switched, first);
  assert.equal(switched.userData.projectId, "b");
  save = completeMission(save, "a-0");
  assert.equal(
    updateWorkshopModel(switched, workshopAppearance(save, "b")),
    first,
  );
  save = completeMission(save, "b-0");
  const advanced = updateWorkshopModel(switched, workshopAppearance(save, "b"));
  assert.notEqual(advanced, first);
  assert.equal(advanced.userData.projectId, "b");
  assert.equal(advanced.userData.stage, 2);
  disposeObject(first);
  disposeObject(advanced);
});

test("selected progress changes geometry once at each stage boundary and retains same-stage progress", () => {
  let save = world(0),
    model = makeWorkshop(workshopAppearance(save, "a"));
  const replace = () => {
    const previous = model;
    model = updateWorkshopModel(model, workshopAppearance(save, "a"));
    if (model !== previous) disposeObject(previous);
    return model !== previous;
  };
  for (let i = 0; i < 3; i++)
    save = addProjectTask(save, "a", "a-m", `step-${i}`, `Step ${i}`);
  assert.equal(replace(), true);
  assert.equal(model.userData.stage, 1);
  save = completeMission(save, "step-0");
  assert.equal(replace(), true);
  assert.equal(model.userData.stage, 2);
  save = completeMission(save, "step-1");
  assert.equal(replace(), false);
  save = completeMission(save, "step-2");
  assert.equal(replace(), true);
  assert.equal(model.userData.stage, 3);
  assert.equal(!!model.getObjectByName("pitched-roof"), true);
  assert.equal(replace(), false);
  assert.equal(totalXP(save), 75);
  save = addProjectTask(save, "a", "a-m", "expanded", "Another real task");
  assert.equal(replace(), true);
  assert.equal(model.userData.stage, 2);
  assert.equal(totalXP(save), 75);
  disposeObject(model);
});

test("archiving a selected build updates same-stage fallback identity, then clears the final model stage", () => {
  let save = world(),
    model = makeWorkshop(workshopAppearance(save, "b"));
  save = archiveProject(save, "b", true);
  assert.equal(
    updateWorkshopModel(model, workshopAppearance(save, "b")),
    model,
  );
  assert.equal(model.userData.projectId, "a");
  save = archiveProject(save, "a", true);
  const empty = updateWorkshopModel(model, workshopAppearance(save, "a"));
  assert.notEqual(empty, model);
  assert.equal(empty.userData.projectId, "");
  assert.equal(empty.userData.stage, 0);
  disposeObject(model);
  disposeObject(empty);
});
