import test from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { configureFreeCamera } from "../src/world/three/camera-controls.ts";

function cameraFixture() {
  const document = new EventTarget();
  const element = Object.assign(new EventTarget(), {
    style: {},
    ownerDocument: document,
    clientWidth: 1400,
    clientHeight: 900,
    getRootNode: () => document,
  });
  const camera = new PerspectiveCamera(40, 1400 / 900, 0.1, 160);
  camera.position.set(18, 22, 29);
  const controls = new OrbitControls(camera, element);
  controls.target.set(0, -0.8, 0);
  configureFreeCamera(controls);
  controls.update();
  return { camera, controls };
}

test("free camera completes repeated full orbits and reaches top and underside views", () => {
  const { camera, controls } = cameraFixture(),
    start = camera.position.clone();
  const distance = controls.getDistance(),
    positions = [];
  for (let turn = 0; turn < 8; turn++) {
    controls.rotateLeft(Math.PI / 2);
    controls.update();
    positions.push(camera.position.clone());
    assert.ok(Math.abs(controls.getDistance() - distance) < 1e-8);
  }
  assert.ok(positions[0].distanceTo(positions[1]) > 20);
  assert.ok(
    camera.position.distanceTo(start) < 1e-8,
    "two full turns return to the same view",
  );
  controls.rotateUp(controls.getPolarAngle() - 2.4);
  controls.update();
  assert.ok(
    camera.position.y < controls.target.y,
    "the camera can look from below",
  );
  controls.rotateUp(Math.PI);
  controls.update();
  assert.ok(camera.position.y > 35, "the camera can look straight down");
  assert.ok(
    Number.isFinite(camera.position.x + camera.position.y + camera.position.z),
  );
  controls.dispose();
});

test("free pan moves vertically and past the old focus boundary while preserving view direction", () => {
  const { camera, controls } = cameraFixture();
  const direction = camera.getWorldDirection(new Vector3());
  const distance = controls.getDistance();
  controls.pan(1000, 800);
  controls.update();
  assert.ok(controls.target.length() > 16);
  assert.ok(
    Math.abs(controls.target.y + 0.8) > 1,
    "vertical screen-space pan works",
  );
  assert.ok(
    camera.getWorldDirection(new Vector3()).distanceTo(direction) < 1e-8,
  );
  assert.ok(Math.abs(controls.getDistance() - distance) < 1e-8);
  controls.dispose();
});
