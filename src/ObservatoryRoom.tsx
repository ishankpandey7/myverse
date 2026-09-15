import { useEffect, useRef, useState } from "react";
import type { Save } from "./game";
import { AvatarArt } from "./world/PersonalArt";
import "./home-room.css";
import "./observatory.css";
import { EditableTitle } from "./EditableTitle";

const stars = [
  [25, 32],
  [40, 23],
  [56, 30],
  [72, 23],
  [65, 43],
  [42, 43],
];
export function ObservatoryRoom({
  save,
  onRename,
  draft,
  onDraft,
  onAdd,
  onConvert,
  onProject,
  onExit,
  saveError,
}: {
  save: Save;
  onRename: (id: string, title: string) => void;
  draft: string;
  onDraft: (value: string) => void;
  onAdd: () => void;
  onConvert: (id: string) => void;
  onProject: (id: string) => void;
  onExit: () => void;
  saveError: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    panel = useRef<HTMLElement>(null);
  const [station, setStation] = useState<"desk" | "sky">("desk");
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  const matches = save.ideas.filter((idea) =>
    idea.title.toLowerCase().includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(matches.length / 6)),
    currentPage = Math.min(page, pages - 1);
  const visible = matches.slice(currentPage * 6, currentPage * 6 + 6);
  const idea = save.ideas.find((item) => item.id === selected);
  function focusPanel() {
    requestAnimationFrame(() => {
      panel.current?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width:760px)").matches)
        panel.current?.scrollIntoView({ block: "start" });
    });
  }
  function visit(next: "desk" | "sky") {
    setStation(next);
    focusPanel();
  }
  function openIdea(id: string) {
    setSelected(id);
    setStation("sky");
    focusPanel();
  }
  return (
    <dialog
      ref={dialog}
      className="home-room observatory-room"
      aria-labelledby="observatory-title"
      onCancel={onExit}
      onClose={onExit}
    >
      <div className="room-heading">
        <div>
          <p className="eyebrow">MOONHOLLOW / IDEA OBSERVATORY</p>
          <h2 id="observatory-title">Give your thoughts a sky.</h2>
        </div>
        <button className="room-exit" onClick={onExit}>
          ↗ Back to island
        </button>
      </div>
      <div className="room-layout">
        <section
          className="observatory-scene"
          aria-label="Inside the Idea Observatory"
        >
          <div className="room-scene-caption">
            <span>THE SKY IS ONLY THE BEGINNING</span>
            <span>✧ {save.ideas.length} ideas</span>
          </div>
          <svg
            className="observatory-art"
            viewBox="0 0 800 650"
            role="img"
            aria-label="A domed observatory, brass telescope and writing desk beneath a constellation of your ideas."
          >
            <defs>
              <radialGradient id="observatory-night">
                <stop stopColor="#3c456f" />
                <stop offset="1" stopColor="#171f38" />
              </radialGradient>
              <linearGradient id="observatory-floor" x2="0" y2="1">
                <stop stopColor="#5c647b" />
                <stop offset="1" stopColor="#303c52" />
              </linearGradient>
            </defs>
            <ellipse
              cx="400"
              cy="548"
              rx="320"
              ry="72"
              fill="#080f20"
              opacity=".5"
            />
            <path
              d="M90 408V270a310 230 0 0 1 620 0v138Z"
              fill="url(#observatory-night)"
              stroke="#777d9d"
              strokeWidth="7"
            />
            <path
              d="M90 270h620M400 40v325M400 40Q165 100 180 385M400 40q235 60 220 345"
              fill="none"
              stroke="#9394ae"
              strokeOpacity=".2"
              strokeWidth="3"
            />
            <ellipse
              cx="400"
              cy="427"
              rx="310"
              ry="139"
              fill="url(#observatory-floor)"
              stroke="#9692ac"
              strokeWidth="7"
            />
            <ellipse
              cx="400"
              cy="427"
              rx="265"
              ry="113"
              fill="none"
              stroke="#b1a5bd"
              strokeOpacity=".3"
            />
            <path
              d="m400 322 130 102-130 99-128-99Z"
              fill="none"
              stroke="#b8a98c"
              strokeOpacity=".4"
            />
            <path
              d="M400 322v201M272 424h258"
              stroke="#c8b993"
              strokeOpacity=".2"
            />
            <g fill="#c4c5df" opacity=".6">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                <circle
                  key={i}
                  cx={145 + ((i * 83) % 520)}
                  cy={110 + ((i * 37) % 170)}
                  r={i % 3 === 0 ? 2 : 1}
                />
              ))}
            </g>
            <path d="M628 121q-33 26 3 52-54-9-35-44Z" fill="#ded9bb" />
            {/* Brass telescope on a tripod. */}
            <ellipse
              cx="535"
              cy="451"
              rx="87"
              ry="24"
              fill="#18283e"
              opacity=".6"
            />
            <path
              d="m529 351-58 105m58-105 62 105m-62-105 3 122"
              stroke="#a1a2b1"
              strokeWidth="8"
            />
            <circle cx="529" cy="352" r="17" fill="#b39b77" />
            <path
              d="m475 317 115-91 28 34-114 89Z"
              fill="#b99f76"
              stroke="#e2cda5"
              strokeWidth="4"
            />
            <path d="m586 225 12-10 34 41-13 12Z" fill="#7e879c" />
            <path d="m601 224 20 25" stroke="#b2d4dc" strokeWidth="10" />
            <path d="m475 317-20 16 14 18 20-16" fill="#a8acba" />
            {/* Open notebook and ink on the idea desk. */}
            <path
              d="M172 432v70m140-48v69m-51-112v64"
              stroke="#857d8c"
              strokeWidth="9"
            />
            <path
              d="m140 417 110-52 96 62-109 56Z"
              fill="#ac99a1"
              stroke="#6b687f"
              strokeWidth="5"
            />
            <path
              d="m191 414 43-21 26 17-43 21Zm26 17 43-21 28 16-45 23Z"
              fill="#ded4bd"
            />
            <path
              d="m217 431 26-20m-44 6 25-12m6 29 25-12"
              stroke="#9d939c"
              strokeWidth="2"
            />
            <path d="m285 417 2-17 15 1 2 17Z" fill="#586481" />
            <path d="m294 402 16-35" stroke="#d7c9b4" strokeWidth="3" />
            <path d="m377 538 22-9 25 9-23 11Z" fill="#d0b995" />
            <g
              className="room-avatar"
              style={{
                transform:
                  station === "desk"
                    ? "translate(316px, 475px)"
                    : "translate(463px, 442px)",
              }}
            >
              <AvatarArt avatar={save.avatar} />
            </g>
          </svg>
          <div className="idea-star-field" aria-label="Idea constellation">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polyline
                points={visible.map((_, i) => stars[i].join(",")).join(" ")}
                fill="none"
                stroke="#bbc7f0"
                strokeOpacity=".35"
                strokeWidth=".25"
              />
            </svg>
            {visible.map((item, i) => (
              <button
                key={item.id}
                className="idea-star"
                style={{ left: `${stars[i][0]}%`, top: `${stars[i][1]}%` }}
                onClick={() => openIdea(item.id)}
                aria-label={`Open idea: ${item.title}`}
                aria-pressed={selected === item.id}
              >
                <span>✦</span>
                <small>{currentPage * 6 + i + 1}</small>
              </button>
            ))}
          </div>
          <button
            className="room-hotspot idea-desk"
            aria-pressed={station === "desk"}
            onClick={() => visit("desk")}
          >
            ✎ Idea desk
          </button>
          <button
            className="room-hotspot sky-telescope"
            aria-pressed={station === "sky"}
            onClick={() => visit("sky")}
          >
            ✧ View constellation
          </button>
          <button className="room-door" onClick={onExit}>
            ↓ Step outside
          </button>
          <p className="observatory-hint">
            {visible.length
              ? "Every numbered star is one of your ideas. Select one to open it."
              : search
                ? "No stars match your search yet."
                : "Your next idea will be the first light in this sky."}
          </p>
        </section>
        <section
          ref={panel}
          tabIndex={-1}
          className="room-panel"
          aria-label="Observatory activities"
        >
          <p className="eyebrow">
            {station === "desk"
              ? "CATCH A LITTLE SPARK"
              : "A UNIVERSE OF POSSIBILITIES"}
          </p>
          <h3>
            {station === "desk" ? "Your idea desk." : "Your constellation."}
          </h3>
          {station === "desk" ? (
            <>
              <p>
                A curious thought. A project you might build. Give it a place to
                live.
              </p>
              <form
                className="room-mission-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  onAdd();
                  setSearch("");
                  setPage(Math.floor(save.ideas.length / 6));
                  setMessage(
                    "A new star in your sky. Your idea is ready to explore.",
                  );
                  e.currentTarget.querySelector("input")?.focus();
                }}
              >
                <label htmlFor="observatory-idea">
                  What have you been dreaming about?
                </label>
                <input
                  id="observatory-idea"
                  value={draft}
                  maxLength={160}
                  onChange={(e) => onDraft(e.target.value)}
                  placeholder="An idea worth keeping…"
                />
                <button className="primary-action" disabled={!draft.trim()}>
                  Add to my sky ✧
                </button>
              </form>
            </>
          ) : (
            <p>
              Select a star or an idea below. When you’re ready, turn that spark
              into a first step.
            </p>
          )}
          {idea && (
            <article className="selected-idea" aria-label="Selected idea">
              <p className="eyebrow">A SPARK, READY TO GROW</p>
              <h4>
                <EditableTitle
                  title={idea.title}
                  onSave={(title) => onRename(idea.id, title)}
                />
              </h4>
              <p>
                One small step? Make it a mission. A bigger dream? Move it to
                the Workshop as a project and break it into milestones.
              </p>
              <button
                className="primary-action"
                onClick={() => {
                  onConvert(idea.id);
                  setSelected(null);
                  setMessage(
                    "Moved to Home Base. Your idea is now an active mission.",
                  );
                  panel.current?.focus({ preventScroll: true });
                }}
              >
                Turn into a mission →
              </button>
              <button className="room-text-button" onClick={() => onProject(idea.id)}>
                Build as a project ↗
              </button>
            </article>
          )}
          <label className="idea-search-label" htmlFor="idea-search">
            Find an idea
          </label>
          <input
            id="idea-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search your sky…"
          />
          <ul className="observatory-ideas">
            {visible.map((item, i) => (
              <li key={item.id}>
                <button
                  onClick={() => openIdea(item.id)}
                  aria-pressed={selected === item.id}
                >
                  <span>{currentPage * 6 + i + 1}</span>
                  <span>{item.title}</span>
                  <span>↗</span>
                </button>
              </li>
            ))}
          </ul>
          {!matches.length && (
            <p className="room-empty">
              {search
                ? "No stars match that search. Try another word."
                : "An unwritten sky. Save your first idea at the desk."}
            </p>
          )}
          {pages > 1 && (
            <nav
              className="constellation-pages"
              aria-label="Constellation pages"
            >
              <button
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                ← Previous
              </button>
              <span>
                {currentPage + 1} / {pages}
              </span>
              <button
                disabled={currentPage === pages - 1}
                onClick={() => setPage(currentPage + 1)}
              >
                Next →
              </button>
            </nav>
          )}
          {station === "sky" && (
            <button className="room-text-button" onClick={() => visit("desk")}>
              ✎ Back to idea desk
            </button>
          )}
          <p className="room-feedback" role="status">
            {message}
          </p>
          {saveError && (
            <p className="room-save-error" role="alert">
              {saveError} Changes in this tab are not saved yet.
            </p>
          )}
        </section>
      </div>
    </dialog>
  );
}
