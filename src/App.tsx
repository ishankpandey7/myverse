import { useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

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

function Island() {
  return (
    <svg
      viewBox="0 0 800 530"
      className="island"
      role="img"
      aria-label="A floating island with a little home, an observatory and a garden beneath the stars"
    >
      <defs>
        <linearGradient id="rock" x2="0" y2="1">
          <stop stopColor="#526075" />
          <stop offset="1" stopColor="#20283f" />
        </linearGradient>
        <linearGradient id="grass" x2="0" y2="1">
          <stop stopColor="#9bcab1" />
          <stop offset="1" stopColor="#528e8f" />
        </linearGradient>
        <radialGradient id="halo">
          <stop stopColor="#b1b5ec" stopOpacity=".25" />
          <stop offset="1" stopColor="#b1b5ec" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="405" cy="306" rx="360" ry="195" fill="url(#halo)" />
      <g className="floating">
        <path
          d="M137 303 253 425 404 489 549 435 669 298 415 350Z"
          fill="url(#rock)"
        />
        <path
          d="m253 330 0 95 151 64-52-148m151-6 46 100 40-118"
          fill="#677587"
          opacity=".3"
        />
        <path
          d="M137 291Q138 241 233 218L405 179 562 210Q672 242 669 290L572 358 398 386 224 350Z"
          fill="#385768"
        />
        <path
          d="M137 279Q138 231 233 208L405 169 562 200Q672 232 669 278L572 343 398 372 224 336Z"
          fill="url(#grass)"
        />
        <path
          d="m286 253 98 70 154-58"
          fill="none"
          stroke="#d3c4a0"
          strokeWidth="25"
          strokeLinecap="round"
        />
        <path d="m384 323 11 35" stroke="#d3c4a0" strokeWidth="25" />
        <ellipse
          cx="414"
          cy="350"
          rx="45"
          ry="12"
          fill="#456f76"
          opacity=".4"
        />
        <g transform="translate(222 171)">
          <path d="M0 58 64 27 116 58 52 92Z" fill="#bd906d" />
          <path d="M0 58V0L52 25V92Z" fill="#dfc4a3" />
          <path d="M52 25 116 0V58L52 92Z" fill="#ae907b" />
          <path d="M-13 2 44-53 131-6 53 36Z" fill="#5d668f" />
          <path d="m-13 2 57-55 4 40-26 29Z" fill="#8992b5" />
          <path d="m76 53 18-8v29l-18 9Z" fill="#ffe0a3" />
          <path d="m17 31 17 9v18l-17-8Z" fill="#ffe0a3" />
          <path d="m76-32 0-32 15 7v33" fill="#c4b5ad" />
        </g>
        <g transform="translate(487 142)">
          <path d="M-32 100V24H55V100Q14 132-32 100" fill="#9b9cc0" />
          <ellipse cx="12" cy="24" rx="44" ry="20" fill="#bebddb" />
          <path d="M-32 24C-32-42 56-42 56 24Q13 46-32 24" fill="#6a73a4" />
          <path
            d="M12-20Q-3 8 12 41"
            fill="none"
            stroke="#a6aed5"
            strokeWidth="5"
          />
          <path d="m29 2 42-34 13 17L41 20Z" fill="#e8ce9d" />
          <path d="M3 80a10 10 0 0 1 20 0v30H3Z" fill="#ffe0a3" />
        </g>
        {[
          { x: 184, y: 273, s: 1 },
          { x: 584, y: 294, s: 1.1 },
          { x: 415, y: 204, s: 0.7 },
          { x: 225, y: 318, s: 0.6 },
        ].map(({ x, y, s }) => (
          <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
            <path d="M0 0V-58" stroke="#706b66" strokeWidth="9" />
            <path d="m-28-22 28-66 28 66Z" fill="#3b7779" />
            <path d="m-23-43 23-52 23 52Z" fill="#67a298" />
          </g>
        ))}
        <g transform="translate(392 303)">
          <ellipse cy="24" rx="16" ry="5" fill="#45616c" />
          <path d="m-11 19 4-24h14l4 24Z" fill="#dfb2ae" />
          <circle cy="-14" r="11" fill="#edcfb2" />
          <path d="M-14-16 0-41 14-16Z" fill="#6d649a" />
          <path
            d="M-19-16h38"
            stroke="#8f81bd"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
        <g fill="#ffe5a6">
          <circle cx="330" cy="304" r="3" />
          <circle cx="469" cy="307" r="3" />
          <circle cx="542" cy="284" r="3" />
        </g>
      </g>
      <g fill="#bec2df" opacity=".7">
        <path d="m108 380 21 5-10 31Z" />
        <path d="m638 388 35 0-25 34Z" />
        <path d="m501 475 15 8-9 19Z" />
      </g>
    </svg>
  );
}

function App() {
  const [save, setSave] = useState<Save>(readSave);
  const [tab, setTab] = useState<"missions" | "ideas">("missions");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState(false);
  const completed = save.missions.filter((item) => item.done).length;
  const xp = completed * 25;
  const level = Math.floor(xp / 100) + 1;

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
        <section className="world">
          <div className="world-heading">
            <p className="eyebrow">YOUR ADVENTURE STARTS HERE</p>
            <h1>
              Small steps.
              <br />
              <em>A world of possibilities.</em>
            </h1>
            <p>A home for your ideas. A little magic for your everyday.</p>
          </div>
          <div className="scene">
            <div className="moon" />
            <Island />
            <span className="map-label home">HOME BASE</span>
            <span className="map-label observatory">IDEA OBSERVATORY</span>
            <div className="world-caption">
              <span className="live-dot" /> YOUR FIRST ISLAND <span>✧</span>{" "}
              Make yourself at home
            </div>
          </div>
          <div className="world-footer">
            <span>
              ✧ &nbsp; Every great adventure begins with one small step.
            </span>
            <span>EARLY WORLD · v0.1</span>
          </div>
        </section>
        <aside>
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
          <section className="journal">
            <div className="tabs" aria-label="Journal sections">
              <button
                aria-pressed={tab === "missions"}
                onClick={() => {
                  setTab("missions");
                  setDraft("");
                }}
              >
                ☷ &nbsp; Missions
              </button>
              <button
                aria-pressed={tab === "ideas"}
                onClick={() => {
                  setTab("ideas");
                  setDraft("");
                }}
              >
                ✧ &nbsp; Ideas
              </button>
            </div>
            <div className="journal-body">
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
