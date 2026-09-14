export type Camera = {
  zoom: number;
  center: { x: number; y: number };
  baseWidth: number;
  aspect: number;
};
type Bounds = { left: number; top: number; width: number; height: number };
type WheelInput = Pick<
  WheelEvent,
  "clientX" | "clientY" | "deltaY" | "deltaMode" | "ctrlKey"
>;

export function zoomFromWheel(
  camera: Camera,
  bounds: Bounds,
  event: WheelInput,
): Camera {
  const pixels =
    event.deltaY *
    (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1);
  const exponent = Math.max(
    -1,
    Math.min(1, -pixels * (event.ctrlKey ? 0.01 : 0.0025)),
  );
  const zoom = Math.max(0.5, Math.min(2, camera.zoom * Math.exp(exponent)));
  const oldWidth = camera.baseWidth / camera.zoom,
    newWidth = camera.baseWidth / zoom;
  // Keep the world point beneath the cursor stationary as the scale changes.
  return {
    ...camera,
    zoom,
    center: {
      x:
        camera.center.x +
        ((event.clientX - bounds.left) / bounds.width - 0.5) *
          (oldWidth - newWidth),
      y:
        camera.center.y +
        (((event.clientY - bounds.top) / bounds.height - 0.5) *
          (oldWidth - newWidth)) /
          camera.aspect,
    },
  };
}

export function bindWheelZoom(
  target: EventTarget,
  readCamera: () => Camera,
  readBounds: () => Bounds,
  apply: (camera: Camera) => void,
) {
  const wheel = (raw: Event) => {
    const event = raw as WheelEvent;
    const bounds = readBounds();
    if (
      !Number.isFinite(event.deltaY) ||
      !event.deltaY ||
      bounds.width <= 0 ||
      bounds.height <= 0
    )
      return;
    // Trackpad pinch arrives as ctrl+wheel in Chromium. React's passive wheel
    // listener cannot stop browser zoom, so listen natively only over the map.
    event.preventDefault();
    apply(zoomFromWheel(readCamera(), bounds, event));
  };
  target.addEventListener("wheel", wheel, { passive: false });
  return () => target.removeEventListener("wheel", wheel);
}
