import { MOUSE, TOUCH } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function configureFreeCamera(controls: OrbitControls) {
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.screenSpacePanning = true;
  controls.maxTargetRadius = Infinity;
  controls.mouseButtons.RIGHT = MOUSE.PAN;
  controls.touches.TWO = TOUCH.DOLLY_PAN;
  setCameraPan(controls, false);
}

export function setCameraPan(controls: OrbitControls, pan: boolean) {
  controls.mouseButtons.LEFT = pan ? MOUSE.PAN : MOUSE.ROTATE;
  controls.touches.ONE = pan ? TOUCH.PAN : TOUCH.ROTATE;
}
