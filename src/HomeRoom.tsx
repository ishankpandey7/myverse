import { useEffect, useRef, useState } from "react";
import { REWARDS, totalXP, unlockedRewards } from "./game";
import type { Save, RewardId } from "./game";
import { AvatarArt, DecorationArt } from "./world/PersonalArt";
import "./home-room.css";
import { EditableTitle } from "./EditableTitle";

type Station = "welcome" | "board" | "shelf";
const positions = { welcome: [420, 460], board: [265, 370], shelf: [570, 390] };

export function HomeRoom({
  save,
  onRename,
  draft,
  onDraft,
  onAdd,
  onComplete,
  onExit,
  notice,
  saveError,
}: {
  save: Save;
  onRename: (id: string, title: string) => void;
  draft: string;
  onDraft: (value: string) => void;
  onAdd: () => void;
  onComplete: (id: string) => void;
  onExit: () => void;
  notice: string;
  saveError: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLElement>(null);
  const [station, setStation] = useState<Station>("welcome");
  const [filter, setFilter] = useState<"active" | "done">("active");
  useEffect(() => {
    if (station === "welcome") return;
    panel.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 760px)").matches)
      panel.current?.scrollIntoView({ block: "start" });
  }, [station]);
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  const unlocked = unlockedRewards(save);
  const active = save.missions.filter((mission) => !mission.done);
  const completed = save.missions.filter((mission) => mission.done);
  const missions = filter === "active" ? active : completed;
  const point = positions[station];
  return (
    <dialog
      ref={dialog}
      className="home-room"
      aria-labelledby="home-title"
      onCancel={onExit}
      onClose={onExit}
    >
      <div className="room-heading">
        <div>
          <p className="eyebrow">MOONHOLLOW / HOME BASE</p>
          <h2 id="home-title">A place to begin again.</h2>
        </div>
        <button className="room-exit" onClick={onExit}>
          ↗ Back to island
        </button>
      </div>
      <div className="room-layout">
        <section className="room-scene" aria-label="Inside Home Base">
          <div className="room-scene-caption">
            <span>THE WANDERER’S COTTAGE</span>
            <span>✦ Level {Math.floor(totalXP(save) / 100) + 1}</span>
          </div>
          <svg
            viewBox="0 0 800 600"
            role="img"
            aria-label="A warm cottage with a mission board, a moonlit window, a rug and a shelf for your earned wonders."
          >
            <defs>
              <linearGradient id="room-floor" x2="0" y2="1">
                <stop stopColor="#81716d" />
                <stop offset="1" stopColor="#4c505f" />
              </linearGradient>
              <linearGradient id="room-wall" x2="0" y2="1">
                <stop stopColor="#565468" />
                <stop offset="1" stopColor="#343e50" />
              </linearGradient>
              <radialGradient id="room-glow">
                <stop stopColor="#edcd8d" stopOpacity=".3" />
                <stop offset="1" stopColor="#edcd8d" stopOpacity="0" />
              </radialGradient>
              <pattern
                id="room-planks"
                width="70"
                height="35"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(27)"
              >
                <path
                  d="M0 0H70V35"
                  fill="none"
                  stroke="#d3b8a5"
                  strokeOpacity=".1"
                />
              </pattern>
            </defs>
            <ellipse
              cx="402"
              cy="480"
              rx="335"
              ry="90"
              fill="#080f22"
              opacity=".4"
            />
            <path
              d="M65 328 395 175 735 330 405 530Z"
              fill="url(#room-floor)"
            />
            <path
              d="M65 328 395 175 735 330 405 530Z"
              fill="url(#room-planks)"
            />
            <path d="M65 328V143L395 25V175Z" fill="url(#room-wall)" />
            <path d="M395 25 735 160V330L395 175Z" fill="#44485c" />
            <path
              d="M65 143 395 25 735 160M395 25V175"
              stroke="#9c8590"
              strokeWidth="10"
              fill="none"
            />
            <path
              d="M65 328 405 530 735 330v18L405 550 65 346Z"
              fill="#353b4b"
            />
            <path
              d="M65 328 395 175 735 330"
              stroke="#b49682"
              strokeWidth="6"
              fill="none"
            />
            {/* Moonlit window and its falling light. */}
            <path
              d="M460 105 560 145V247L460 202Z"
              fill="#1e3048"
              stroke="#a99795"
              strokeWidth="8"
            />
            <path
              d="M511 126V225M463 155 558 196"
              stroke="#9c9196"
              strokeWidth="5"
            />
            <path d="M483 120q-13 19 8 25-26 5-23-16Z" fill="#e4d5ad" />
            <path d="m528 166 3 7 7 3-7 2-3 7-2-7-7-2 7-3Z" fill="#a8c3dc" />
            <path
              d="m460 204 100 44 63 167-146-65Z"
              fill="#b4bfd5"
              opacity=".07"
            />
            {/* Framed mission board, pinned notes. */}
            <path
              d="M142 162 300 103V241L142 312Z"
              fill="#9f8176"
              stroke="#cfac89"
              strokeWidth="8"
            />
            <path d="m161 173 51-20v58l-51 22Z" fill="#e4d3a9" />
            <path d="m229 148 48-18v54l-48 21Z" fill="#b8c8ba" />
            <path d="m190 235 70-30v40l-70 31Z" fill="#d6b6b9" />
            <g stroke="#8a7b79" strokeWidth="3">
              <path d="m170 189 31-12m-31 22 25-10m44-22 28-11m-66 84 46-20" />
            </g>
            <g fill="#e7bd7e">
              <circle cx="183" cy="171" r="4" />
              <circle cx="251" cy="148" r="4" />
              <circle cx="223" cy="228" r="4" />
            </g>
            {/* Low bookcase and earned keepsakes. */}
            <path
              d="m565 254 113 48v69l-113-51Z"
              fill="#695a60"
              stroke="#a48b7b"
              strokeWidth="4"
            />
            <path d="m552 250 27-12 115 48-16 17Z" fill="#b6a08a" />
            <path d="m573 286 95 41" stroke="#b99c85" strokeWidth="5" />
            <g strokeWidth="9">
              <path d="m582 295v26" stroke="#b8bfac" />
              <path d="m596 300v27" stroke="#b38d9e" />
              <path d="m610 307v25" stroke="#bea77b" />
              <path d="m634 318 9 28" stroke="#8296ab" />
            </g>
            {unlocked.map((id, index) => (
              <g
                key={id}
                data-testid={`room-reward-${id}`}
                transform={`translate(${584 + index * 35} ${248 + index * 15}) scale(.48)`}
              >
                <DecorationArt id={id} />
              </g>
            ))}
            {/* Woven rug, reading chair, warm standing lamp. */}
            <path
              d="m266 364 134-70 155 75-134 83Z"
              fill="#8f788e"
              stroke="#c2a292"
              strokeWidth="5"
            />
            <path
              d="m292 365 109-56 127 62-109 65Z"
              fill="none"
              stroke="#cfb69c"
              strokeWidth="2"
              strokeDasharray="6 5"
            />
            <path d="m381 365 21-13 23 13-21 14Z" fill="#cdb5a0" />
            <ellipse
              cx="153"
              cy="330"
              rx="110"
              ry="96"
              fill="url(#room-glow)"
            />
            <path d="M131 328V240" stroke="#b7a18c" strokeWidth="5" />
            <ellipse cx="131" cy="330" rx="21" ry="9" fill="#8c8590" />
            <path d="m113 225-12 40q30 16 60 0l-13-40Z" fill="#dcc49a" />
            <ellipse cx="131" cy="225" rx="18" ry="7" fill="#f1dcb3" />
            <path d="m177 351 49-24 38 21v52l-50 26-37-22Z" fill="#576e71" />
            <path d="m177 351 37 22 50-25v-32l-36-17-51 24Z" fill="#78918b" />
            <path d="m190 351 27 14 33-17-26-14Z" fill="#b9b5a1" />
            <path d="m181 399v18m72-22v17" stroke="#b29783" strokeWidth="6" />
            <path d="m362 497 43 25 49-30-43-23Z" fill="#cfb694" opacity=".7" />
            <g
              className="room-avatar"
              style={{ transform: `translate(${point[0]}px, ${point[1]}px)` }}
              data-testid="room-character"
              data-station={station}
            >
              <AvatarArt avatar={save.avatar} />
            </g>
          </svg>
          <button
            className="room-hotspot board-hotspot"
            aria-pressed={station === "board"}
            onClick={() => setStation("board")}
          >
            <span>☷</span> Mission board <small>{active.length} active</small>
          </button>
          <button
            className="room-hotspot shelf-hotspot"
            aria-pressed={station === "shelf"}
            onClick={() => setStation("shelf")}
          >
            <span>✧</span> Wonder shelf{" "}
            <small>{unlocked.length}/3 earned</small>
          </button>
          <button className="room-door" onClick={onExit}>
            ↓ Step outside
          </button>
          <p className="room-scene-help">
            Choose the board or shelf to explore your home.
          </p>
        </section>
        <section
          ref={panel}
          tabIndex={-1}
          className="room-panel"
          aria-label="Home activities"
        >
          {station === "welcome" ? (
            <div className="room-welcome">
              <span className="room-symbol">⌂</span>
              <p className="eyebrow">A LITTLE REST. A FRESH START.</p>
              <h3>
                Welcome home,
                <br />
                {save.avatar.name}.
              </h3>
              <p>
                The world can wait a moment. Pick a small adventure, or admire
                how far you’ve come.
              </p>
              <div className="room-tally">
                <b>
                  {active.length}
                  <small>adventures waiting</small>
                </b>
                <b>
                  {totalXP(save)}
                  <small>XP earned</small>
                </b>
              </div>
              <button
                className="primary-action"
                onClick={() => setStation("board")}
              >
                Visit mission board →
              </button>
              <button
                className="room-text-button"
                onClick={() => setStation("shelf")}
              >
                Take a look at your wonders ✧
              </button>
            </div>
          ) : station === "board" ? (
            <>
              <p className="eyebrow">ONE SMALL STEP AT A TIME</p>
              <h3>Your mission board.</h3>
              <p>
                Do something in your world. Bring a little magic back to this
                one.
              </p>
              <form
                className="room-mission-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  onAdd();
                  setFilter("active");
                  e.currentTarget.querySelector("input")?.focus();
                }}
              >
                <label htmlFor="room-mission">Your next adventure</label>
                <input
                  id="room-mission"
                  value={draft}
                  onChange={(e) => onDraft(e.target.value)}
                  maxLength={160}
                  placeholder="A small step you can take today…"
                />
                <button className="primary-action" disabled={!draft.trim()}>
                  Pin mission +
                </button>
              </form>
              <div className="room-filters">
                <button
                  aria-pressed={filter === "active"}
                  onClick={() => setFilter("active")}
                >
                  Active ({active.length})
                </button>
                <button
                  aria-pressed={filter === "done"}
                  onClick={() => setFilter("done")}
                >
                  Completed ({completed.length})
                </button>
              </div>
              <ul className="room-missions">
                {missions.map((mission) => (
                  <li key={mission.id}>
                    <EditableTitle
                      title={mission.title}
                      onSave={(title) => onRename(mission.id, title)}
                    />
                    <button
                      disabled={mission.done}
                      onClick={() => {
                        onComplete(mission.id);
                        panel.current?.focus({ preventScroll: true });
                      }}
                      aria-label={
                        mission.done
                          ? `${mission.title} completed`
                          : `Complete ${mission.title}`
                      }
                    >
                      {mission.done ? "✓ Done" : "+25 XP"}
                    </button>
                  </li>
                ))}
              </ul>
              {!missions.length && (
                <p className="room-empty">
                  {filter === "active"
                    ? "A clear board, a little breathing room. Pin a new adventure whenever you’re ready."
                    : "Your finished adventures will live here. Every small step counts."}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">SMALL WINS, MADE VISIBLE</p>
              <h3>Your wonder shelf.</h3>
              <p>
                Every keepsake tells a story. Earn them through missions; their
                island decorations stay wherever you placed them.
              </p>
              <div className="room-keepsakes">
                {(Object.keys(REWARDS) as RewardId[]).map((id) => (
                  <article
                    className={unlocked.includes(id) ? "earned" : "unearned"}
                    key={id}
                  >
                    <svg
                      viewBox="-45 -90 90 110"
                      role="img"
                      aria-label={REWARDS[id].name}
                    >
                      <DecorationArt id={id} />
                    </svg>
                    <div>
                      <h4>{REWARDS[id].name}</h4>
                      <p>
                        {unlocked.includes(id)
                          ? "✦ Earned — a little part of your story"
                          : `${REWARDS[id].xp - totalXP(save)} XP until this finds a home`}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <button
                className="primary-action"
                onClick={() => setStation("board")}
              >
                Find your next adventure →
              </button>
            </>
          )}
          <p className="room-feedback" role="status">
            {notice}
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
