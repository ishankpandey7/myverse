import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import type { IslandWorld } from "./IslandWorld";
import { createExperience } from "./three/experience";
import { PLACES } from "./navigation";
import type { Place } from "./navigation";
import { PLOTS, REWARDS, totalXP, projectProgress } from "../game";
import type { PlotId } from "../game";
import { canLightBeacon, FRAGMENTS, FRAGMENT_IDS } from "../starfall";
import type { FragmentId } from "../starfall";
import { ChapterCelebration } from "./ChapterCelebration";
import { createSoundscape } from "./soundscape";
type Props = ComponentProps<typeof IslandWorld> & {
  onClassic: () => void;
  onUnavailable: (message: string) => void;
};
export default function ThreeIsland(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    root = useRef<HTMLElement>(null),
    engine = useRef<ReturnType<typeof createExperience> | null>(null),
    live = useRef(props),
    selectedProject = useRef(""),
    audio = useRef<ReturnType<typeof createSoundscape> | null>(null);
  const [ready, setReady] = useState(false),
    [day, setDay] = useState(false),
    [follow, setFollow] = useState(false),
    [tour, setTour] = useState(false),
    [eco, setEco] = useState(false),
    [sound, setSound] = useState(false),
    [expanded, setExpanded] = useState(false),
    [celebrating, setCelebrating] = useState(false),
    [storyOpen, setStoryOpen] = useState(false);
  const [nearby, setNearby] = useState<Place | null>(null),
    [hint, setHint] = useState(
      "A new dimension. The same little world of your own.",
    ),
    [message, setMessage] = useState("");
  const [projectId, setProjectId] = useState(
    props.save.projects.find((p) => !p.archived)?.id ?? "",
  );
  const project =
      props.save.projects.find((p) => p.id === projectId && !p.archived) ??
      props.save.projects.find((p) => !p.archived),
    progress = project ? projectProgress(props.save, project) : null;
  useLayoutEffect(() => {
    live.current = props;
    selectedProject.current = project?.id ?? "";
    engine.current?.update(props.save);
  }, [props, project?.id]);
  useEffect(() => {
    const initialise = requestAnimationFrame(() => {
      if (!host.current) return;
      try {
        engine.current = createExperience(host.current, live.current.save, {
          visit: (place) =>
            live.current.onVisit(
              place,
              place === "workshop" ? selectedProject.current : undefined,
            ),
          discover: (id) => {
            const current = live.current;
            if (id === "beacon") {
              if (current.save.starfall?.beaconLit)
                setMessage(
                  "A light you brought into this world. Yours to keep.",
                );
              else if (canLightBeacon(current.save)) {
                current.onLightBeacon();
                audio.current?.chime();
                setCelebrating(true);
                setMessage("");
              } else
                setMessage(
                  current.save.starfall?.fragments.length === 3
                    ? "Complete one real-world mission, then return to awaken your beacon."
                    : "Find the three fallen fragments. Each one has a memory waiting for you.",
                );
            } else {
              if (!current.save.starfall?.fragments.includes(id)) {
                current.onDiscover(id);
                audio.current?.chime();
              }
              setMessage(FRAGMENTS[id].memory);
            }
          },
          hint: setHint,
          nearby: setNearby,
          manualCamera: () => {
            setTour(false);
            setFollow(false);
          },
          error: (message) => live.current.onUnavailable(message),
        });
        engine.current.pause(!!live.current.placing || live.current.paused);
        setReady(true);
      } catch {
        live.current.onUnavailable(
          "3D is unavailable in this browser. Your world is ready in Classic view.",
        );
      }
    });
    const fullscreen = () =>
        setExpanded(document.fullscreenElement === root.current),
      visibility = () => audio.current?.pause(document.hidden);
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(initialise);
      engine.current?.dispose();
      engine.current = null;
      audio.current?.close();
      audio.current = null;
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    engine.current?.pause(props.paused || !!props.placing || celebrating);
  }, [props.paused, props.placing, celebrating, ready]);
  useEffect(() => {
    engine.current?.setProject(project?.id ?? "");
  }, [project?.id, ready]);
  function discover(id: FragmentId | "beacon") {
    setStoryOpen(false);
    setMessage("");
    engine.current?.discover(id);
  }
  const xp = totalXP(props.save),
    found = props.save.starfall?.fragments ?? [];
  return (
    <section
      ref={root}
      id="island-explorer"
      className={`three-island ${day ? "is-dawn" : "is-night"}`}
      aria-label="3D Moonhollow island"
    >
      <div className="three-scene-frame">
        <div className="three-canvas-host" ref={host} />
        {!ready && (
          <div className="three-preparing" role="status">
            ✧ Shaping your world…
          </div>
        )}
        <div className="three-scene-shade" aria-hidden="true" />
        <div className="three-world-heading">
          <p className="eyebrow">
            <i /> YOUR PERSONAL UNIVERSE
          </p>
          <h1>
            Moonhollow.
            <br />
            <em>Your beginning.</em>
          </h1>
          <p>
            A home for your dreams.
            <br />A world built by your small victories.
          </p>
          <div className="world-coordinate">01 / THE STARFALL ISLES</div>
        </div>
        <div className="three-top-right">
          <div className="three-level">
            <span>✧</span>
            <div>
              <b>{props.avatar.name}</b>
              <small>
                Level {Math.floor(xp / 100) + 1} · {xp} XP
              </small>
            </div>
          </div>
          <div
            className="three-sky-switch"
            role="group"
            aria-label="World lighting"
          >
            <button
              aria-pressed={!day}
              onClick={() => {
                setDay(false);
                engine.current?.sky(false);
              }}
            >
              ☾ Twilight
            </button>
            <button
              aria-pressed={day}
              onClick={() => {
                setDay(true);
                engine.current?.sky(true);
              }}
            >
              ☀ Daybreak
            </button>
          </div>
        </div>
        <div className="three-camera-controls" aria-label="3D camera controls">
          <button aria-label="Zoom in" onClick={() => engine.current?.zoom(1)}>
            +
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => engine.current?.zoom(-1)}
          >
            −
          </button>
          <button
            aria-label="Follow character"
            aria-pressed={follow}
            onClick={() => {
              setFollow(!follow);
              engine.current?.follow(!follow);
            }}
          >
            ⌖
          </button>
          <button
            aria-label="Reset camera"
            onClick={() => {
              engine.current?.reset();
              setFollow(false);
              setTour(false);
            }}
          >
            ⟲
          </button>
        </div>
        <div className="three-story-hud">
          <button
            className="story-launch"
            aria-expanded={storyOpen}
            onClick={() => setStoryOpen(!storyOpen)}
          >
            <span>✦</span>
            <div>
              <small>YOUR ISLAND STORY</small>
              <b>
                {props.save.starfall?.beaconLit
                  ? "The beacon remembers."
                  : "The night the stars fell."}
              </b>
            </div>
            <span className="three-fragment-count">
              {props.save.starfall?.beaconLit ? "✓" : `${found.length}/3`}
            </span>
          </button>
          {storyOpen && (
            <div className="three-story-panel">
              <p>
                Follow three fallen lights. Bring a real-life victory back to
                the beacon.
              </p>
              {FRAGMENT_IDS.map((id, i) => (
                <button key={id} onClick={() => discover(id)}>
                  <span>{found.includes(id) ? "✓" : `0${i + 1}`}</span>
                  {FRAGMENTS[id].name}
                  <span>↗</span>
                </button>
              ))}
              <button onClick={() => discover("beacon")}>
                <span>✧</span>
                {props.save.starfall?.beaconLit
                  ? "Visit your beacon"
                  : "Awaken the beacon"}
                <span>↗</span>
              </button>
            </div>
          )}
        </div>
        {project && (
          <div className="three-project-model">
            <label htmlFor="three-project">ON YOUR WORKBENCH</label>
            <select
              id="three-project"
              value={project.id}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {props.save.projects
                .filter((p) => !p.archived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
            </select>
            {progress && (
              <p>
                {progress.done}/{progress.total} tasks · {progress.percent}%
                built
              </p>
            )}
          </div>
        )}
        {message && (
          <div className="three-memory" role="status">
            <span>✧</span>
            <p>{message}</p>
            <button
              aria-label="Dismiss discovery message"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}
        {props.placing && (
          <div className="three-placement">
            <h2>A little more you.</h2>
            <p>
              Choose a garden for your{" "}
              {REWARDS[props.placing].name.toLowerCase()}.
            </p>
            {(Object.keys(PLOTS) as PlotId[]).map((plot) => (
              <button
                key={plot}
                data-plot-choice={plot}
                disabled={Object.entries(props.decorations).some(
                  ([id, spot]) => id !== props.placing && spot === plot,
                )}
                onClick={() => props.onPlace(plot)}
              >
                {PLOTS[plot].name} ↗
              </button>
            ))}
            <button onClick={props.onCancelPlacement}>Cancel</button>
          </div>
        )}
        <div className="three-bottom-bar">
          <div className="three-input-tip">
            <span>CLICK TO WANDER · DRAG TO ORBIT</span>
            <small>WASD / arrows · scroll or pinch to zoom</small>
          </div>
          <nav
            className="three-destination-dock"
            aria-label="Island destinations"
          >
            {(["home", "workshop", "observatory"] as Place[]).map((place) => (
              <button
                key={place}
                disabled={!ready || !!props.placing}
                onClick={() => engine.current?.travel(place)}
              >
                <span>
                  {place === "home" ? "⌂" : place === "workshop" ? "⚒" : "✧"}
                </span>
                <div>
                  <b>
                    {place === "home"
                      ? "Home Base"
                      : place === "workshop"
                        ? "Workshop"
                        : "Observatory"}
                  </b>
                  <small>
                    {place === "home"
                      ? "Your missions"
                      : place === "workshop"
                        ? "Your big ideas"
                        : "Your little sparks"}
                  </small>
                </div>
              </button>
            ))}
          </nav>
        </div>
        {nearby && !props.placing && (
          <button
            className="three-enter"
            onClick={() => {
              engine.current?.stop();
              props.onVisit(
                nearby,
                nearby === "workshop" ? project?.id : undefined,
              );
            }}
          >
            Enter {PLACES[nearby].name} <kbd>E</kbd>
          </button>
        )}
        <div className="three-experience-tools">
          <button
            aria-pressed={tour}
            onClick={() => {
              setTour(!tour);
              engine.current?.tour(!tour);
            }}
          >
            ◎ {tour ? "End orbit" : "Cinematic orbit"}
          </button>
          <button
            aria-pressed={eco}
            onClick={() => {
              setEco(!eco);
              engine.current?.eco(!eco);
            }}
          >
            {eco ? "◈ Eco" : "◈ Quality"}
          </button>
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
                  setHint("Sound is unavailable in this browser.");
                }
            }}
          >
            ♫ Sound {sound ? "on" : "off"}
          </button>
          <button
            aria-label={
              expanded ? "Leave immersive mode" : "Enter immersive mode"
            }
            onClick={async () => {
              try {
                if (expanded) await document.exitFullscreen();
                else await root.current?.requestFullscreen();
              } catch {
                setHint(
                  "Fullscreen is unavailable here. Your 3D world remains playable.",
                );
              }
            }}
          >
            ⛶ {expanded ? "Return" : "Immerse"}
          </button>
          <button onClick={props.onClassic}>Classic view</button>
        </div>
      </div>
      <p className="three-world-hint" role="status">
        {hint}
      </p>
      {celebrating && (
        <ChapterCelebration
          onClose={() => {
            setCelebrating(false);
            host.current
              ?.querySelector("canvas")
              ?.focus({ preventScroll: true });
          }}
        />
      )}
    </section>
  );
}
