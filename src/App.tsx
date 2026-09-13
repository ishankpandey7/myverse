import { useRef, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { IslandWorld } from "./world/IslandWorld";
import type { Place } from "./world/navigation";

type Entry = { id: string; title: string; done: boolean };
type Save = { version: 1; missions: Entry[]; ideas: Entry[] };
const key = "myverse-save-v1";
const initial: Save = { version: 1, missions: [], ideas: [] };

function readSave(): Save {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null");
    const valid = (items: unknown): items is Entry[] =>
      Array.isArray(items) &&
      items.every(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.done === "boolean",
      );
    if (raw?.version === 1 && valid(raw.missions) && valid(raw.ideas))
      return raw;
  } catch {
    /* A missing or unreadable save opens a fresh world. */
  }
  return initial;
}

function App() {
  const journalRef = useRef<HTMLElement>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [save, setSave] = useState<Save>(readSave);
  const [tab, setTab] = useState<"missions" | "ideas">("missions");
  const [drafts, setDrafts] = useState({ missions: "", ideas: "" });
  const draft = drafts[tab];
  function setDraft(value: string) {
    setDrafts((previous) => ({ ...previous, [tab]: value }));
  }
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState(false);
  const completed = save.missions.filter((item) => item.done).length;
  const xp = completed * 25;
  const level = Math.floor(xp / 100) + 1;

  function enterPlace(place: Place) {
    setTab(place === "home" ? "missions" : "ideas");
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
    const next = update(save);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
    setSave(next);
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

  function complete(id: string) {
    updateSave((previous) => ({
      ...previous,
      missions: previous.missions.map((item) =>
        item.id === id ? { ...item, done: true } : item,
      ),
    }));
    setNotice("Mission complete. +25 XP — your world is growing!");
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
        <div className="profile">
          <span className="avatar">✦</span>
          <div>
            World builder<small>Level {level} · Dreamer</small>
          </div>
        </div>
      </header>
      <main>
        <IslandWorld onVisit={enterPlace} />
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
              ? "Saving is unavailable. Keep this tab open to avoid losing changes."
              : "Saved in this browser · Cloud sync comes later"}
          </p>
        </aside>
      </main>
    </div>
  );
}
export default App;
