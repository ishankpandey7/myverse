import { useRef, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { IslandWorld } from "./world/IslandWorld";
import type { Place } from "./world/navigation";
import { Atelier } from "./Atelier";
import { HomeRoom } from "./HomeRoom";
import {
  freshSave,
  loadGame,
  persistGame,
  completeMission,
  placeReward,
  removeReward,
  unlockedRewards,
  totalXP,
  REWARDS,
  OUTFITS,
} from "./game";
import type { Save, RewardId, PlotId } from "./game";

function readCurrentGame() {
  try {
    return loadGame(localStorage);
  } catch {
    return {
      save: freshSave(),
      error: "Saving is unavailable in this browser. Keep this tab open.",
    };
  }
}

function App() {
  const journalRef = useRef<HTMLElement>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [homeOpen, setHomeOpen] = useState(false);
  const [loaded] = useState(readCurrentGame);
  const [save, setSave] = useState<Save>(loaded.save);
  const saveRef = useRef(save);
  const [atelier, setAtelier] = useState<"character" | "collection" | null>(
    null,
  );
  const [placing, setPlacing] = useState<RewardId | null>(null);
  const [newReward, setNewReward] = useState<RewardId | null>(null);
  const [tab, setTab] = useState<"missions" | "ideas">("missions");
  const [drafts, setDrafts] = useState({ missions: "", ideas: "" });
  const draft = drafts[tab];
  function setDraft(value: string) {
    setDrafts((previous) => ({ ...previous, [tab]: value }));
  }
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState(loaded.error);
  const completed = save.missions.filter((item) => item.done).length;
  const xp = totalXP(save);
  const level = Math.floor(xp / 100) + 1;

  function enterPlace(place: Place) {
    if (place === "home") {
      setHomeOpen(true);
      return;
    }
    setTab("ideas");
    setJournalOpen(true);
    requestAnimationFrame(() => {
      journalRef.current?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 760px)").matches)
        journalRef.current?.scrollIntoView({
          block: "start",
          behavior: "instant",
        });
    });
  }

  function updateSave(update: (previous: Save) => Save) {
    const next = update(saveRef.current);
    if (next === saveRef.current) return;
    saveRef.current = next;
    setSave(next);
    try {
      setSaveError(persistGame(localStorage, next));
    } catch {
      setSaveError(
        "Saving is unavailable. Keep this tab open to keep your changes.",
      );
    }
  }

  function beginPlacement(id: RewardId) {
    if (!unlockedRewards(saveRef.current).includes(id)) return;
    setAtelier(null);
    setPlacing(id);
    requestAnimationFrame(() => {
      const island = document.getElementById("island-explorer");
      island?.scrollIntoView({ block: "start" });
      island
        ?.querySelector<SVGElement>("[data-plot-choice]")
        ?.focus({ preventScroll: true });
    });
  }
  function focusIsland() {
    requestAnimationFrame(() =>
      document
        .getElementById("island-explorer")
        ?.querySelector("svg")
        ?.focus({ preventScroll: true }),
    );
  }
  function finishPlacement(plot: PlotId) {
    if (!placing) return;
    const next = placeReward(saveRef.current, placing, plot);
    if (next === saveRef.current) return;
    updateSave(() => next);
    setNotice(
      REWARDS[placing].name + " placed. A little more you, a little more home.",
    );
    setPlacing(null);
    focusIsland();
  }

  function add(event: FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    updateSave((previous) => ({
      ...previous,
      [tab]: [
        ...previous[tab],
        { id: crypto.randomUUID(), title, done: false },
      ],
    }));
    setDraft("");
    setNotice(
      tab === "ideas"
        ? "A little spark, saved for later."
        : "Your next adventure is ready.",
    );
  }

  function addRoomMission() {
    const title = drafts.missions.trim();
    if (!title) return;
    updateSave((previous) => ({
      ...previous,
      missions: [
        ...previous.missions,
        { id: crypto.randomUUID(), title, done: false },
      ],
    }));
    setDrafts((previous) => ({ ...previous, missions: "" }));
    setNotice("Your next adventure is ready.");
  }

  function complete(id: string) {
    const previous = saveRef.current,
      next = completeMission(previous, id);
    if (next === previous) return;
    const unlocked = unlockedRewards(next).find(
      (reward) => !unlockedRewards(previous).includes(reward),
    );
    updateSave(() => next);
    setNewReward(unlocked ?? null);
    const levelUp =
      Math.floor(totalXP(next) / 100) > Math.floor(totalXP(previous) / 100);
    setNotice(
      levelUp
        ? "Level " +
            (Math.floor(totalXP(next) / 100) + 1) +
            " reached! +25 XP — keep growing."
        : "Mission complete. +25 XP — your world is growing!",
    );
  }

  function makeMission(id: string) {
    updateSave((previous) => {
      const idea = previous.ideas.find((item) => item.id === id);
      if (!idea) return previous;
      return {
        ...previous,
        ideas: previous.ideas.filter((item) => item.id !== id),
        missions: [...previous.missions, idea],
      };
    });
    setTab("missions");
    setNotice("From a spark to a first step. Your idea is now a mission.");
  }

  return (
    <div className="app-shell">
      <header>
        <a className="brand" href="#">
          ✧{" "}
          <span>
            myverse<small>A LITTLE WORLD OF YOUR OWN</small>
          </span>
        </a>
        <div className="chapter">
          CHAPTER 01 <span>·</span> The beginning
        </div>
        <button
          className="profile profile-button"
          onClick={() => {
            setPlacing(null);
            setAtelier("character");
          }}
          aria-label="Customise your character"
        >
          <span
            className="avatar"
            style={{ background: OUTFITS[save.avatar.outfit].hat }}
          >
            ✦
          </span>
          <div>
            {save.avatar.name}
            <small>Level {level} · Dreamer</small>
          </div>
          <span className="edit-profile">✎</span>
        </button>
      </header>
      <main>
        <IslandWorld
          onVisit={enterPlace}
          avatar={save.avatar}
          decorations={save.decorations}
          placing={placing}
          paused={atelier !== null || homeOpen}
          onPlace={finishPlacement}
          onCancelPlacement={() => {
            setPlacing(null);
            focusIsland();
          }}
        />
        <aside className="journey-side">
          <div className="progress-card">
            <div className="row">
              <span className="eyebrow">YOUR JOURNEY</span>
              <span className="pill">LEVEL {level}</span>
            </div>
            <h2>A new beginning</h2>
            <p>Grow at your own pace.</p>
            <div className="xp-label">
              <span>{xp % 100} / 100 XP</span>
              <span>Next level ✧</span>
            </div>
            <progress
              value={xp % 100}
              max="100"
              aria-label="Progress to next level"
            />
            <div className="stats">
              <div>
                <b>{completed}</b>
                <span>Missions done</span>
              </div>
              <div>
                <b>{save.ideas.length}</b>
                <span>Ideas collected</span>
              </div>
              <div>
                <b>{xp}</b>
                <span>Total XP</span>
              </div>
            </div>
          </div>
          <button
            className="collection-shortcut"
            onClick={() => {
              setPlacing(null);
              setNewReward(null);
              setAtelier("collection");
            }}
          >
            <span>✧ Island collection</span>
            <small>{unlockedRewards(save).length}/3 unlocked ↗</small>
          </button>
          {newReward && (
            <div className="unlock-banner" role="status">
              <p className="eyebrow">A LITTLE WONDER, EARNED</p>
              <h3>{REWARDS[newReward].name} unlocked!</h3>
              <p>
                Your real-world progress just made room for something beautiful.
              </p>
              <button
                onClick={() => {
                  setNewReward(null);
                  setAtelier("collection");
                }}
              >
                Decorate my island →
              </button>
            </div>
          )}
          <section
            className={`journal ${journalOpen ? "is-open" : ""}`}
            ref={journalRef}
            tabIndex={-1}
            aria-label={
              tab === "missions"
                ? "Home Base mission journal"
                : "Idea Observatory journal"
            }
          >
            {journalOpen && (
              <button
                className="mobile-journal-close"
                onClick={() => {
                  setJournalOpen(false);
                  const map = document.getElementById("island-explorer");
                  map?.scrollIntoView({ block: "start" });
                  map?.querySelector("svg")?.focus({ preventScroll: true });
                }}
              >
                ↑ Back to island
              </button>
            )}
            <div className="tabs" aria-label="Journal sections">
              <button
                aria-pressed={tab === "missions"}
                onClick={() => {
                  setTab("missions");
                }}
              >
                ☷ &nbsp; Missions
              </button>
              <button
                aria-pressed={tab === "ideas"}
                onClick={() => {
                  setTab("ideas");
                }}
              >
                ✧ &nbsp; Ideas
              </button>
            </div>
            <div className="journal-body">
              <p className="journal-location">
                {tab === "missions" ? "⌂ HOME BASE" : "✧ IDEA OBSERVATORY"}
              </p>
              <div className="row">
                <h2>
                  {tab === "missions"
                    ? "One step at a time"
                    : "Catch a little spark"}
                </h2>
                <span className="count">{save[tab].length}</span>
              </div>
              <p>
                {tab === "missions"
                  ? "Choose something you want to do in the real world."
                  : "A wild idea today could be your next adventure."}
              </p>
              <form onSubmit={add}>
                <label className="sr-only" htmlFor="entry">
                  {tab === "missions" ? "New mission" : "New idea"}
                </label>
                <input
                  id="entry"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={160}
                  placeholder={
                    tab === "missions"
                      ? "What’s your next small step?"
                      : "What have you been dreaming about?"
                  }
                />
                <button
                  className="add"
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label={tab === "missions" ? "Add mission" : "Save idea"}
                >
                  +
                </button>
              </form>
              <ul className="entries">
                {save[tab].map((item) => (
                  <li key={item.id} className={item.done ? "done" : ""}>
                    <span>{item.title}</span>
                    {tab === "missions" ? (
                      <button
                        disabled={item.done}
                        onClick={() => complete(item.id)}
                        aria-label={
                          item.done
                            ? `${item.title} completed`
                            : `Complete ${item.title}`
                        }
                      >
                        {item.done ? "✓ Done" : "+25 XP"}
                      </button>
                    ) : (
                      <button
                        onClick={() => makeMission(item.id)}
                        aria-label={`Turn ${item.title} into a mission`}
                      >
                        Start →
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {!save[tab].length && (
                <div className="empty">
                  <span>✧</span>
                  <p>
                    {tab === "missions"
                      ? "Your story is still unwritten."
                      : "Leave a little room for possibility."}
                  </p>
                  <small>
                    {tab === "missions"
                      ? "Add your first mission above."
                      : "Save your first idea above."}
                  </small>
                </div>
              )}
            </div>
          </section>
          <p className="notice" role="status">
            {notice}
          </p>
          <p className="save-note" role={saveError ? "alert" : undefined}>
            {saveError
              ? saveError + " Changes in this tab are not saved yet."
              : "Saved in this browser · Cloud sync comes later"}
          </p>
        </aside>
      </main>
      {homeOpen && (
        <HomeRoom
          save={save}
          draft={drafts.missions}
          onDraft={(missions) =>
            setDrafts((previous) => ({ ...previous, missions }))
          }
          onAdd={addRoomMission}
          onComplete={complete}
          notice={notice}
          saveError={saveError}
          onExit={() => {
            setHomeOpen(false);
            focusIsland();
          }}
        />
      )}
      {atelier && (
        <Atelier
          save={save}
          initialTab={atelier}
          onClose={() => setAtelier(null)}
          onSaveAvatar={(avatar) =>
            updateSave((previous) => ({ ...previous, avatar }))
          }
          onPlace={beginPlacement}
          onRemove={(id) =>
            updateSave((previous) => removeReward(previous, id))
          }
        />
      )}
    </div>
  );
}
export default App;
