import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Terrain, WorldEntities } from "./WorldArt";
import { distance, findPath, moveBy, PLACES, SPAWN } from "./navigation";
import type { Place, Point } from "./navigation";
import { bindWheelZoom } from "./camera";
import type { Camera } from "./camera";
import { PLOTS, REWARDS } from "../game";
import type { Avatar, Save, RewardId, PlotId } from "../game";
import "./world.css";
import "./starfall.css";
import { Atmosphere, StarfallArt } from "./StarfallArt";
import { StarfallQuest } from "./StarfallQuest";
import { BEACON, FRAGMENTS, canLightBeacon } from "../starfall";
import type { FragmentId } from "../starfall";
import { createSoundscape } from "./soundscape";
import { ChapterCelebration } from "./ChapterCelebration";

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

export function IslandWorld({
  save,
  onDiscover,
  onLightBeacon,
  onVisit,
  avatar,
  decorations,
  placing,
  paused,
  onPlace,
  onCancelPlacement,
}: {
  save: Save;
  onDiscover: (id: FragmentId) => void;
  onLightBeacon: () => void;
  onVisit: (place: Place) => void;
  avatar: Avatar;
  decorations: Save["decorations"];
  placing: RewardId | null;
  paused: boolean;
  onPlace: (plot: PlotId) => void;
  onCancelPlacement: () => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Point>(SPAWN);
  const positionRef = useRef<Point>(SPAWN);
  const route = useRef<Point[]>([]);
  const [routePreview, setRoutePreview] = useState<Point[]>([]);
  const pending = useRef<Place | null>(null);
  const pendingDiscovery = useRef<FragmentId | "beacon" | null>(null);
  const [sky, setSky] = useState<"moonlight" | "dawn">("moonlight");
  const [expanded, setExpanded] = useState(false);
  const [sound, setSound] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const audio = useRef<ReturnType<typeof createSoundscape> | null>(null);
  const [discoveryMessage, setDiscoveryMessage] = useState("");
  const discoveryHandler = useRef<(id: FragmentId | "beacon") => void>(
    () => {},
  );
  const placementMode = useRef(Boolean(placing || paused));
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
    discoveryHandler.current = (id) => {
      if (id === "beacon") {
        if (save.starfall?.beaconLit) {
          setDiscoveryMessage(
            "A light made from your small victories. This one is yours.",
          );
        } else if (canLightBeacon(save)) {
          onLightBeacon();
          audio.current?.chime();
          setCelebrating(true);
          setDiscoveryMessage(
            "The beacon is awake. Look up—your island has a new sky.",
          );
        } else {
          setDiscoveryMessage(
            save.starfall?.fragments.length === 3
              ? "One real-world victory will awaken it. Complete a mission in Home Base, then return."
              : "Three fallen fragments belong here. Find them around the island, then return.",
          );
        }
      } else if (!save.starfall?.fragments.includes(id)) {
        onDiscover(id);
        audio.current?.chime();
        setDiscoveryMessage(`${FRAGMENTS[id].name}: ${FRAGMENTS[id].memory}`);
      } else {
        setDiscoveryMessage(FRAGMENTS[id].memory);
      }
    };
  }, [save, onDiscover, onLightBeacon]);
  useEffect(() => {
    let resizeFrame = 0;
    const fullscreen = () => {
      const active = document.fullscreenElement === svg.current?.closest("section");
      setExpanded(active);
      cancelAnimationFrame(resizeFrame);
      if (active) resizeFrame = requestAnimationFrame(() => {
        const target = frame.current;
        if (!target || document.fullscreenElement !== target.closest("section")) return;
        const bounds = target.getBoundingClientRect();
        if (!bounds.height) return;
        const nextAspect = bounds.width / bounds.height;
        const nextWidth = nextAspect < 1 ? 950 : 1400;
        setZoom(Math.max(0.5, Math.min(1, nextWidth / Math.max(1400, 900 * nextAspect))));
        setCenter(HOME_CAMERA);
        setFollowing(false);
      });
    };
    document.addEventListener("fullscreenchange", fullscreen);
    const visibility = () => audio.current?.pause(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(resizeFrame);
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("visibilitychange", visibility);
      audio.current?.close();
      audio.current = null;
    };
  }, []);

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
    placementMode.current = Boolean(placing || paused || celebrating);
    if (placing || paused || celebrating) {
      route.current = [];
      pending.current = null;
      pendingDiscovery.current = null;
      keys.current.clear();
    }
  }, [placing, paused, celebrating]);
  useEffect(() => {
    const target = frame.current;
    if (!target) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) {
        const nextAspect = entry.contentRect.width / entry.contentRect.height;
        setAspect(nextAspect);
      }
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
      if (placementMode.current) {
        setMoving(false);
        setDestination(null);
        request = requestAnimationFrame(tick);
        return;
      }
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
          const discovery = pendingDiscovery.current;
          pendingDiscovery.current = null;
          if (discovery) discoveryHandler.current(discovery);
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
    if (placing || paused) return;
    pendingDiscovery.current = null;
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
    pendingDiscovery.current = null;
    keys.current.clear();
    setDestination(null);
    setHint("Taking a little pause.");
  }
  function approachDiscovery(id: FragmentId | "beacon") {
    if (placing || paused) return;
    const point = id === "beacon" ? BEACON : FRAGMENTS[id];
    if (distance(positionRef.current, point) < 48) {
      stop();
      discoveryHandler.current(id);
    } else {
      travel(point);
      if (route.current.length) {
        pendingDiscovery.current = id;
        setHint(
          id === "beacon"
            ? "Following the path to the Starfall beacon…"
            : FRAGMENTS[id].clue,
        );
      }
    }
  }
  function keyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (placing) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelPlacement();
      }
      return;
    }
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
      pendingDiscovery.current = null;
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
    if (target.closest("[data-place], [data-plot-choice], [data-discovery]"))
      return;
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
    if (current.moved || placing) return;
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
      className={`explorer sky-${sky} ${save.starfall?.beaconLit ? "beacon-awake" : ""}`}
      aria-label="Moonhollow island"
    >
      <div className="explorer-heading">
        <div>
          <p className="eyebrow">A WORLD THAT GROWS WITH YOU</p>
          <h1>
            Moonhollow <em>Island</em>
          </h1>
        </div>
        <span className="world-badge">
          <i />{" "}
          {save.starfall?.beaconLit ? "BEACON AWAKENED" : "STARFALL CHAPTER"}
        </span>
      </div>
      <div className="island-experience-bar">
        <div
          className="sky-controls"
          role="group"
          aria-label="Island atmosphere"
        >
          <button
            aria-pressed={sky === "moonlight"}
            onClick={() => setSky("moonlight")}
          >
            ☾ Moonlight
          </button>
          <button aria-pressed={sky === "dawn"} onClick={() => setSky("dawn")}>
            ☀ Dawn
          </button>
        </div>
        <div className="experience-controls">
          <button
            aria-pressed={sound}
            onClick={() => {
              if (audio.current) {
                audio.current.close();
                audio.current = null;
                setSound(false);
              } else
                try {
                  audio.current = createSoundscape();
                  setSound(true);
                } catch {
                  setHint(
                    "Audio is unavailable in this browser. You can keep exploring.",
                  );
                }
            }}
          >
            {sound ? "♫ Sound on" : "♫ Sound off"}
          </button>
          <button
            onClick={async () => {
              try {
                if (expanded) await document.exitFullscreen();
                else await svg.current?.closest("section")?.requestFullscreen();
              } catch {
                setHint(
                  "Fullscreen is unavailable here. You can still zoom and explore.",
                );
              }
            }}
            aria-label={
              expanded ? "Leave immersive mode" : "Enter immersive mode"
            }
          >
            {expanded ? "↙ Return" : "⛶ Immerse"}
          </button>
        </div>
      </div>
      <div
        className={`world-frame ${placing ? "placement-mode" : ""}`}
        ref={frame}
      >
        <div className="map-topline">
          <span>
            ✧ &nbsp; MOONHOLLOW /{" "}
            {sky === "moonlight" ? "AFTER HOURS" : "FIRST LIGHT"}
          </span>
          <span>
            {save.starfall?.beaconLit
              ? "Every little victory leaves a light."
              : "Something fell from the sky tonight."}
          </span>
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
          <Atmosphere lit={!!save.starfall?.beaconLit} />
          <g className="path-indicator" aria-hidden="true">
            {destination && !placing && (
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
            <WorldEntities
              position={position}
              moving={moving}
              avatar={avatar}
              decorations={decorations}
            />
          </g>
          {(Object.keys(PLACES) as Place[]).map((place) => {
            const home = place === "home",
              x = home ? 480 : place === "workshop" ? 720 : 975,
              y = home ? 445 : 430;
            return (
              <g
                key={place}
                className={`building-portal ${nearest === place ? "nearby" : ""}`}
                data-place={place}
                role="button"
                tabIndex={placing ? -1 : 0}
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
                      : place === "workshop"
                        ? "SMALL STEPS, BIG BUILDS"
                        : "A HOME FOR YOUR IDEAS"}
                  </text>
                </g>
              </g>
            );
          })}
          <StarfallArt
            journey={save.starfall}
            onApproach={approachDiscovery}
            disabled={!!placing || paused}
          />
          {placing &&
            (Object.keys(PLOTS) as PlotId[]).map((plot, index) => {
              const occupied = Object.entries(decorations).some(
                ([id, slot]) => id !== placing && slot === plot,
              );
              if (occupied) return null;
              const spot = PLOTS[plot];
              return (
                <g
                  key={plot}
                  className="plot-marker"
                  data-plot-choice={plot}
                  transform={`translate(${spot.x} ${spot.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Place ${REWARDS[placing].name} at ${spot.name}`}
                  onClick={() => onPlace(plot)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onPlace(plot);
                    }
                  }}
                >
                  <ellipse
                    rx="34"
                    ry="18"
                    fill="#edd5a533"
                    stroke="#edcf9a"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                  <text textAnchor="middle" y="5" fontSize="17" fill="#fff0cb">
                    {index + 1}
                  </text>
                </g>
              );
            })}
        </svg>
        <div className="island-vignette" aria-hidden="true" />
        {discoveryMessage && (
          <div className="discovery-toast" role="status">
            <span aria-hidden="true">✧</span>
            <p>{discoveryMessage}</p>
            <button
              aria-label="Dismiss discovery message"
              onClick={() => setDiscoveryMessage("")}
            >
              ×
            </button>
          </div>
        )}
        {placing && (
          <div className="placement-panel">
            <div className="placement-title">
              <h3>Place your {REWARDS[placing].name.toLowerCase()}</h3>
              <button
                onClick={onCancelPlacement}
                aria-label="Cancel decoration placement"
              >
                ✕
              </button>
            </div>
            <p>
              Pick a glowing garden spot, or choose one below. You can move it
              later.
            </p>
            <div className="plot-options">
              {(Object.keys(PLOTS) as PlotId[]).map((plot, index) => (
                <button
                  key={plot}
                  disabled={Object.entries(decorations).some(
                    ([id, slot]) => id !== placing && slot === plot,
                  )}
                  onClick={() => onPlace(plot)}
                >
                  {index + 1}. {PLOTS[plot].name}
                </button>
              ))}
            </div>
          </div>
        )}
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
          {nearest && !placing && (
            <button
              onClick={() => {
                stop();
                visit.current(nearest);
              }}
            >
              Enter {PLACES[nearest].name} <kbd>E</kbd>
            </button>
          )}
          {destination && !placing && (
            <button className="stop-walking" onClick={stop}>
              Stop walking
            </button>
          )}
        </div>
      </div>
      <StarfallQuest save={save} onApproach={approachDiscovery} />
      {celebrating && (
        <ChapterCelebration
          onClose={() => {
            setCelebrating(false);
            requestAnimationFrame(() =>
              svg.current?.focus({ preventScroll: true }),
            );
          }}
        />
      )}
      <div className="explorer-footer">
        <p role="status">{hint}</p>
        <nav aria-label="Island destinations">
          <button onClick={() => travel(PLACES.workshop.entrance, "workshop")}>
            ⚒ Workshop
          </button>
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
