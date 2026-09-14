import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Terrain, WorldEntities } from "./WorldArt";
import { distance, findPath, moveBy, PLACES, SPAWN } from "./navigation";
import type { Place, Point } from "./navigation";
import { bindWheelZoom } from "./camera";
import type { Camera } from "./camera";
import "./world.css";

const directions: Record<string, Point> = {
  w: { x: 0, y: -1 },
  arrowup: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  arrowdown: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  arrowleft: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  arrowright: { x: 1, y: 0 },
};
type Drag = { id: number; x: number; y: number; center: Point; moved: boolean };
const HOME_CAMERA = { x: 700, y: 490 };
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export function IslandWorld({ onVisit }: { onVisit: (place: Place) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Point>(SPAWN);
  const positionRef = useRef<Point>(SPAWN);
  const route = useRef<Point[]>([]);
  const [routePreview, setRoutePreview] = useState<Point[]>([]);
  const pending = useRef<Place | null>(null);
  const keys = useRef(new Set<string>());
  const visit = useRef(onVisit);
  const [moving, setMoving] = useState(false);
  const [destination, setDestination] = useState<Point | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<Point>(HOME_CAMERA);
  const [aspect, setAspect] = useState(1.5);
  const [following, setFollowing] = useState(false);
  const [hint, setHint] = useState(
    "Welcome to Moonhollow. Pick a path and make it yours.",
  );
  const drag = useRef<Drag | null>(null);
  const liveCamera = useRef<Camera>({
    zoom: 1,
    center: HOME_CAMERA,
    baseWidth: 1400,
    aspect: 1.5,
  });
  const baseWidth = aspect < 1 ? 950 : 1400;
  const width = baseWidth / zoom;
  const height = width / aspect;
  const camera = following ? { x: position.x, y: position.y - 110 } : center;
  const nearest = (Object.keys(PLACES) as Place[]).find(
    (place) => distance(position, PLACES[place].entrance) < 85,
  );

  useLayoutEffect(() => {
    liveCamera.current = {
      zoom,
      center: { x: camera.x, y: camera.y },
      baseWidth,
      aspect,
    };
  }, [zoom, camera.x, camera.y, baseWidth, aspect]);
  useEffect(() => {
    const target = frame.current,
      map = svg.current;
    if (!target || !map) return;
    return bindWheelZoom(
      target,
      () => liveCamera.current,
      () => map.getBoundingClientRect(),
      (next) => {
        // Accumulate high-frequency wheel events before React's next render.
        liveCamera.current = next;
        drag.current = null;
        setFollowing(false);
        setZoom(next.zoom);
        setCenter(next.center);
      },
    );
  }, []);

  useEffect(() => {
    visit.current = onVisit;
  }, [onVisit]);
  useEffect(() => {
    const target = frame.current;
    if (!target) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0)
        setAspect(entry.contentRect.width / entry.contentRect.height);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let request = 0,
      last = 0;
    const clearKeys = () => {
      keys.current.clear();
    };
    const hidden = () => {
      if (document.hidden) {
        clearKeys();
        last = 0;
      }
    };
    const tick = (time: number) => {
      const dt = last ? Math.min((time - last) / 1000, 0.25) : 0;
      last = time;
      const before = positionRef.current;
      let next = before;
      const movement = { x: 0, y: 0 };
      keys.current.forEach((key) => {
        const d = directions[key];
        if (d) {
          movement.x += d.x;
          movement.y += d.y;
        }
      });
      const length = Math.hypot(movement.x, movement.y);
      if (length) {
        next = moveBy(
          before,
          (movement.x / length) * 170 * dt,
          (movement.y / length) * 170 * dt,
        );
      } else if (route.current.length) {
        let budget = 185 * dt;
        while (budget > 0 && route.current.length) {
          const target = route.current[0],
            remaining = distance(next, target);
          if (remaining <= budget) {
            next = target;
            route.current.shift();
            setRoutePreview([...route.current]);
            budget -= remaining;
          } else {
            next = {
              x: next.x + ((target.x - next.x) / remaining) * budget,
              y: next.y + ((target.y - next.y) / remaining) * budget,
            };
            budget = 0;
          }
        }
        if (!route.current.length) {
          setDestination(null);
          const place = pending.current;
          pending.current = null;
          if (place) {
            setHint(`You've arrived at ${PLACES[place].name}.`);
            visit.current(place);
          }
        }
      }
      const changed = distance(before, next) > 0.001;
      if (changed) {
        positionRef.current = next;
        setPosition(next);
      }
      setMoving((current) => (current === changed ? current : changed));
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    window.addEventListener("blur", clearKeys);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancelAnimationFrame(request);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  function travel(target: Point, place: Place | null = null) {
    const path = findPath(positionRef.current, target);
    if (!path.length) {
      setHint("Stay on the island — choose a spot on the grass or a path.");
      return;
    }
    keys.current.clear();
    route.current = path;
    setRoutePreview([...path]);
    pending.current = place;
    setDestination(path[path.length - 1]);
    setHint(
      place
        ? `Walking to ${PLACES[place].name}…`
        : "On your way. Drag the map to look around.",
    );
    svg.current?.focus({ preventScroll: true });
  }
  function stop() {
    route.current = [];
    pending.current = null;
    keys.current.clear();
    setDestination(null);
    setHint("Taking a little pause.");
  }
  function keyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (directions[key]) {
      event.preventDefault();
      if (!event.repeat) {
        const direction = directions[key];
        const next = moveBy(
          positionRef.current,
          direction.x * 9,
          direction.y * 9,
        );
        positionRef.current = next;
        setPosition(next);
      }
      keys.current.add(key);
      route.current = [];
      pending.current = null;
      setDestination(null);
    } else if (key === "escape") {
      event.preventDefault();
      stop();
    } else if ((key === "e" || key === "enter") && nearest) {
      event.preventDefault();
      stop();
      visit.current(nearest);
    }
  }
  function pointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest("[data-place]")) return;
    svg.current?.focus({ preventScroll: true });
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      center: camera,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x,
      dy = event.clientY - current.y;
    if (Math.hypot(dx, dy) > 6) current.moved = true;
    if (current.moved) {
      setFollowing(false);
      const rect = event.currentTarget.getBoundingClientRect(),
        scale = width / rect.width;
      setCenter({
        x: clamp(current.center.x - dx * scale, 180, 1220),
        y: clamp(current.center.y - dy * scale, 180, 820),
      });
    }
  }
  function pointerUp(event: PointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (current.moved) return;
    const matrix = svg.current?.getScreenCTM();
    if (matrix) {
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      );
      travel({ x: p.x, y: p.y });
    }
  }

  return (
    <section
      id="island-explorer"
      className="explorer"
      aria-label="Moonhollow island"
    >
      <div className="explorer-heading">
        <div>
          <p className="eyebrow">YOUR LITTLE CORNER OF THE COSMOS</p>
          <h1>
            Moonhollow <em>Island</em>
          </h1>
        </div>
        <span className="world-badge">
          <i /> FREE TO EXPLORE
        </span>
      </div>
      <div className="world-frame" ref={frame}>
        <div className="map-topline">
          <span>✧ &nbsp; THE FIRST CHAPTER</span>
          <span>Home is a place you grow.</span>
        </div>
        <svg
          ref={svg}
          className="world-map"
          viewBox={`${camera.x - width / 2} ${camera.y - height / 2} ${width} ${height}`}
          tabIndex={0}
          role="group"
          aria-label="Island exploration. Click to walk, drag to pan, pinch or scroll to zoom, or use WASD and arrow keys. Press E near a building to enter."
          onKeyDown={keyDown}
          onKeyUp={(e) => keys.current.delete(e.key.toLowerCase())}
          onBlur={() => keys.current.clear()}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <Terrain />
          <g className="path-indicator" aria-hidden="true">
            {destination && (
              <>
                <path
                  d={`M${position.x} ${position.y} ${routePreview.map((p) => `L${p.x} ${p.y}`).join(" ")}`}
                  fill="none"
                  stroke="#f0d4a0"
                  strokeWidth="2"
                  strokeDasharray="3 8"
                  opacity=".5"
                />
                <ellipse
                  cx={destination.x}
                  cy={destination.y}
                  rx="12"
                  ry="6"
                  fill="none"
                  stroke="#f1d7a3"
                  strokeWidth="2"
                />
              </>
            )}
          </g>
          <g pointerEvents="none">
            <WorldEntities position={position} moving={moving} />
          </g>
          {(Object.keys(PLACES) as Place[]).map((place) => {
            const home = place === "home",
              x = home ? 480 : 975,
              y = home ? 445 : 430;
            return (
              <g
                key={place}
                className={`building-portal ${nearest === place ? "nearby" : ""}`}
                data-place={place}
                role="button"
                tabIndex={0}
                aria-label={`Walk to ${PLACES[place].name}`}
                onClick={() => travel(PLACES[place].entrance, place)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    travel(PLACES[place].entrance, place);
                  }
                }}
              >
                <rect
                  className="building-hit"
                  x={x - 92}
                  y={y - 260}
                  width="192"
                  height="285"
                  rx="30"
                  fill="transparent"
                />
                <g transform={`translate(${x} ${y + 18})`}>
                  <rect
                    x="-83"
                    y="-15"
                    width="166"
                    height="39"
                    rx="9"
                    fill="#182534"
                    stroke="#d5c39a66"
                  />
                  <text
                    textAnchor="middle"
                    y="1"
                    fill="#f1ddbb"
                    fontSize="12"
                    fontFamily="DM Sans, sans-serif"
                  >
                    {PLACES[place].name} ↗
                  </text>
                  <text
                    textAnchor="middle"
                    y="15"
                    fill="#9faab9"
                    fontSize="8"
                    letterSpacing="1"
                  >
                    {home
                      ? "MISSIONS & DAILY ADVENTURES"
                      : "A HOME FOR YOUR IDEAS"}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
        <div className="camera-tools" aria-label="Camera controls">
          <button
            aria-label="Zoom in"
            disabled={zoom >= 2}
            onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))}
          >
            +
          </button>
          <output aria-label="Map zoom">{Math.round(zoom * 100)}%</output>
          <button
            aria-label="Zoom out"
            disabled={zoom <= 0.5}
            onClick={() =>
              setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))
            }
          >
            −
          </button>
          <span />
          <button
            aria-label="Follow character"
            aria-pressed={following}
            onClick={() => {
              if (following) setCenter(camera);
              setFollowing(!following);
            }}
          >
            ⌖
          </button>
          <button
            aria-label="Show whole island"
            onClick={() => {
              setZoom(Math.min(1, baseWidth / Math.max(1400, 900 * aspect)));
              setCenter(HOME_CAMERA);
              setFollowing(false);
            }}
          >
            ⛶
          </button>
        </div>
        <div className="explore-tip">
          <span className="compass">
            N<br />✧
          </span>
          <span>
            Click to walk · Drag to explore · Pinch/scroll to zoom
            <br />
            <kbd>W A S D</kbd> or arrow keys
          </span>
        </div>
        <div className="location-action">
          {nearest && (
            <button
              onClick={() => {
                stop();
                visit.current(nearest);
              }}
            >
              Enter {PLACES[nearest].name} <kbd>E</kbd>
            </button>
          )}
          {destination && (
            <button className="stop-walking" onClick={stop}>
              Stop walking
            </button>
          )}
        </div>
      </div>
      <div className="explorer-footer">
        <p role="status">{hint}</p>
        <nav aria-label="Island destinations">
          <button onClick={() => travel(PLACES.home.entrance, "home")}>
            ⌂ &nbsp; Home Base
          </button>
          <button
            onClick={() => travel(PLACES.observatory.entrance, "observatory")}
          >
            ✧ &nbsp; Observatory
          </button>
        </nav>
      </div>
    </section>
  );
}
