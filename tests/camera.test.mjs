import test from "node:test";
import assert from "node:assert/strict";
import { bindWheelZoom, zoomFromWheel } from "../src/world/camera.ts";
const bounds = { left: 80, top: 160, width: 1000, height: 600 };
const camera = {
  zoom: 1,
  center: { x: 700, y: 490 },
  baseWidth: 1400,
  aspect: 1000 / 600,
};
const input = {
  clientX: 830,
  clientY: 340,
  deltaY: -30,
  deltaMode: 0,
  ctrlKey: true,
};
function worldAt(c, e = input) {
  const width = c.baseWidth / c.zoom;
  return {
    x: c.center.x + ((e.clientX - bounds.left) / bounds.width - 0.5) * width,
    y:
      c.center.y +
      (((e.clientY - bounds.top) / bounds.height - 0.5) * width) / c.aspect,
  };
}
function wheel(overrides = {}) {
  const event = new Event("wheel", { cancelable: true });
  Object.assign(event, input, overrides);
  return event;
}
test("pinch zooms around the cursor without shifting its world point", () => {
  const next = zoomFromWheel(camera, bounds, input);
  assert.ok(next.zoom > camera.zoom);
  const before = worldAt(camera),
    after = worldAt(next);
  assert.ok(Math.abs(before.x - after.x) < 1e-9);
  assert.ok(Math.abs(before.y - after.y) < 1e-9);
});
test("pinch and ordinary wheel input zoom in both directions within limits", () => {
  for (const ctrlKey of [true, false]) {
    assert.ok(
      zoomFromWheel(camera, bounds, { ...input, ctrlKey, deltaY: 30 }).zoom < 1,
    );
    assert.ok(
      zoomFromWheel(camera, bounds, { ...input, ctrlKey, deltaY: -30 }).zoom >
        1,
    );
    assert.equal(
      zoomFromWheel({ ...camera, zoom: 2 }, bounds, {
        ...input,
        ctrlKey,
        deltaY: -10000,
      }).zoom,
      2,
    );
    assert.equal(
      zoomFromWheel({ ...camera, zoom: 0.5 }, bounds, {
        ...input,
        ctrlKey,
        deltaY: 10000,
      }).zoom,
      0.5,
    );
  }
});
test("line and page wheel units are normalized to pixel units", () => {
  const from = (deltaY, deltaMode) =>
    zoomFromWheel(camera, bounds, {
      ...input,
      ctrlKey: false,
      deltaY,
      deltaMode,
    }).zoom;
  assert.equal(from(2, 1), from(32, 0));
  assert.equal(from(0.1, 2), from(60, 0));
});
test("native map listener cancels browser zoom and accumulates rapid gestures", () => {
  const target = new EventTarget();
  let current = camera;
  const cleanup = bindWheelZoom(
    target,
    () => current,
    () => bounds,
    (next) => {
      current = next;
    },
  );
  for (let i = 0; i < 5; i++) {
    const event = wheel({ deltaY: -3 });
    target.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
  }
  assert.ok(Math.abs(current.zoom - Math.exp(0.15)) < 1e-9);
  cleanup();
  const last = current,
    event = wheel();
  target.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(current, last);
});
test("scrolling outside the map is untouched", () => {
  const map = new EventTarget(),
    outside = new EventTarget();
  let calls = 0;
  const cleanup = bindWheelZoom(
    map,
    () => camera,
    () => bounds,
    () => calls++,
  );
  const event = wheel();
  outside.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(calls, 0);
  cleanup();
});
