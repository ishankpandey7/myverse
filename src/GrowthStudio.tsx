import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Save } from "./game";
import { gardenProgress, galleryProgress, SKILL_IDS, SKILLS } from "./growth";
import type { SkillId } from "./growth";
import { PlantArt, SkillBadge } from "./GrowthArt";
import { EditableTitle } from "./EditableTitle";
import "./growth.css";

export function GrowthStudio({
  save,
  onClose,
  onAssign,
  onPlan,
  onComplete,
  onRename,
  saveError,
}: {
  save: Save;
  onClose: () => void;
  onAssign: (id: string, skill: SkillId | "") => void;
  onPlan: (title: string, skill: SkillId) => void;
  onComplete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  saveError: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    search = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"garden" | "gallery">("garden"),
    [path, setPath] = useState<SkillId>("craft"),
    [draft, setDraft] = useState("");
  const [query, setQuery] = useState(""),
    [view, setView] = useState<"active" | "done" | "all">("active"),
    [requestedPage, setPage] = useState(0);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  const paths = gardenProgress(save),
    selected = paths.find((p) => p.id === path)!;
  const badges = galleryProgress(save),
    earned = badges.filter((b) => b.earned).length;
  const filtered = save.missions.filter(
    (m) =>
      (view === "all" || m.done === (view === "done")) &&
      m.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 6)),
    page = Math.min(requestedPage, pages - 1),
    shown = filtered.slice(page * 6, (page + 1) * 6);
  return (
    <dialog
      ref={dialog}
      className="growth-studio"
      aria-labelledby="growth-title"
      onCancel={onClose}
      onClose={onClose}
    >
      <header className="growth-heading">
        <div>
          <p className="eyebrow">MOONHOLLOW / THE LIVING GARDEN</p>
          <h2 id="growth-title">
            Small steps.<em> Living proof.</em>
          </h2>
        </div>
        <button onClick={onClose} className="growth-back">
          ↗ Back to island
        </button>
      </header>
      <div
        className="growth-tabs"
        role="tablist"
        aria-label="Garden and achievements"
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
            return;
          e.preventDefault();
          const next =
            e.key === "Home"
              ? "garden"
              : e.key === "End"
                ? "gallery"
                : tab === "garden"
                  ? "gallery"
                  : "garden";
          setTab(next);
          document.getElementById(`growth-tab-${next}`)?.focus();
        }}
      >
        {(["garden", "gallery"] as const).map((t) => (
          <button
            key={t}
            id={`growth-tab-${t}`}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`growth-panel-${t}`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
          >
            {t === "garden"
              ? "❋ Skill Garden"
              : `◈ Achievement Gallery · ${earned}/${badges.length}`}
          </button>
        ))}
      </div>
      <section
        id={`growth-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`growth-tab-${tab}`}
        className="growth-content"
      >
        {tab === "garden" ? (
          <>
            <p className="growth-intro">
              Give your work a place to grow. Assign missions to a path;
              completed steps become living plants on your island.
            </p>
            <div className="growth-paths">
              {paths.map((p, i) => (
                <button
                  key={p.id}
                  className="growth-path"
                  aria-label={`Choose ${p.name} path`}
                  aria-pressed={path === p.id}
                  onClick={() => setPath(p.id)}
                  style={{ "--path-color": p.color } as CSSProperties}
                >
                  <span className="growth-path-number">
                    0{i + 1} / {p.stageName.toUpperCase()}
                  </span>
                  <PlantArt key={p.stage} skill={p.id} stage={p.stage} />
                  <span className="growth-path-name">{p.name}</span>
                  <span className="growth-path-plant">{p.plant}</span>
                  <span className="growth-path-count">
                    {p.done} completed · {p.total - p.done} waiting
                  </span>
                  <progress
                    value={p.done}
                    max={p.next?.at ?? Math.max(6, p.done)}
                    aria-label={`${p.name} growth`}
                  />
                </button>
              ))}
            </div>
            <div
              className="growth-plan"
              style={{ "--path-color": selected.color } as CSSProperties}
            >
              <div>
                <p className="eyebrow">
                  YOUR {selected.name.toUpperCase()} PATH
                </p>
                <h3>{selected.hint}</h3>
                <p>
                  {selected.next
                    ? `${selected.next.at - selected.done} more completed ${selected.next.at - selected.done === 1 ? "mission" : "missions"} until ${selected.next.name.toLowerCase()}.`
                    : "In bloom. You can keep growing at your own pace."}
                </p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  onPlan(draft, path);
                  setMessage(
                    `A new ${SKILLS[path].name} mission is ready. Its plant grows when the real work is completed.`,
                  );
                  setDraft("");
                  setQuery("");
                  setView("active");
                  setPage(0);
                  e.currentTarget.querySelector("input")?.focus();
                }}
              >
                <label htmlFor="growth-new-mission">
                  A small step for {selected.name}
                </label>
                <input
                  id="growth-new-mission"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={160}
                  placeholder={
                    path === "craft"
                      ? "Build a small feature…"
                      : path === "curiosity"
                        ? "Read something that interests you…"
                        : "Take a walk, make room for rest…"
                  }
                />
                <button type="submit" disabled={!draft.trim()}>
                  Plant a mission +
                </button>
              </form>
            </div>
            <section
              className="growth-missions"
              aria-labelledby="growth-missions-title"
            >
              <div className="growth-section-heading">
                <div>
                  <p className="eyebrow">YOUR REAL WORK</p>
                  <h3 id="growth-missions-title">
                    Choose what each step grows.
                  </h3>
                </div>
                <span>{save.missions.length} missions</span>
              </div>
              <p className="growth-note">
                Past completed work counts too. Each mission belongs to one
                path; changing paths moves its growth credit and keeps the same
                total XP.
              </p>
              <div className="growth-mission-controls">
                <div
                  className="growth-filters"
                  role="group"
                  aria-label="Mission status"
                >
                  {(["active", "done", "all"] as const).map((v) => (
                    <button
                      key={v}
                      aria-pressed={view === v}
                      onClick={() => {
                        setView(v);
                        setPage(0);
                      }}
                    >
                      {v === "done"
                        ? "Completed"
                        : v === "active"
                          ? "Active"
                          : "All"}
                    </button>
                  ))}
                </div>
                <label className="sr-only" htmlFor="growth-search">
                  Search garden missions
                </label>
                <input
                  ref={search}
                  id="growth-search"
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Find a mission…"
                  maxLength={160}
                />
              </div>
              <p className="growth-results" role="status">
                {filtered.length}{" "}
                {view === "active"
                  ? "active"
                  : view === "done"
                    ? "completed"
                    : "matching"}{" "}
                missions{query.trim() ? " match your search" : ""}
              </p>
              <ul className="growth-mission-list">
                {shown.map((m) => (
                  <li key={m.id}>
                    <div className="growth-mission-name">
                      <EditableTitle
                        title={m.title}
                        onSave={(title) => {
                          onRename(m.id, title);
                          setQuery("");
                        }}
                      />
                      <SkillBadge skill={m.skill} />
                    </div>
                    <div className="growth-mission-actions">
                      <select
                        aria-label={`Growth path for ${m.title}`}
                        value={m.skill ?? ""}
                        onChange={(e) => {
                          const skill = e.target.value as SkillId | "";
                          onAssign(m.id, skill);
                          setMessage(
                            skill
                              ? `Assigned to ${SKILLS[skill].name}. Your total XP stays the same.`
                              : "Growth path removed. Your mission and XP are kept.",
                          );
                        }}
                      >
                        <option value="">No growth path</option>
                        {SKILL_IDS.map((id) => (
                          <option key={id} value={id}>
                            {SKILLS[id].name}
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={m.done}
                        aria-label={
                          m.done
                            ? `${m.title} completed`
                            : `Complete ${m.title}`
                        }
                        onClick={() => {
                          onComplete(m.id);
                          setMessage(
                            "Mission complete. +25 XP, counted once across your world.",
                          );
                          search.current?.focus();
                        }}
                      >
                        {m.done ? "✓ Done" : "+25 XP"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {shown.length === 0 ? (
                <div className="growth-empty">
                  <span>❋</span>
                  <h4>
                    {query.trim()
                      ? "Nothing matches that search."
                      : view === "done"
                        ? "Your past wins will live here."
                        : "A little room for your next step."}
                  </h4>
                  <p>
                    {query.trim()
                      ? "Try another word or clear the search."
                      : "Plan a mission above, or visit Home Base. Your garden will be ready."}
                  </p>
                  {query ? (
                    <button
                      onClick={() => {
                        setQuery("");
                        setPage(0);
                        search.current?.focus();
                      }}
                    >
                      Clear search
                    </button>
                  ) : null}
                </div>
              ) : null}
              {pages > 1 ? (
                <nav
                  className="growth-pagination"
                  aria-label="Garden mission pages"
                >
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    ← Previous
                  </button>
                  <span>
                    Page {page + 1} of {pages}
                  </span>
                  <button
                    disabled={page === pages - 1}
                    onClick={() => setPage(page + 1)}
                  >
                    Next →
                  </button>
                </nav>
              ) : null}
            </section>
          </>
        ) : (
          <>
            <div className="growth-gallery-intro">
              <span className="growth-gallery-seal">◈</span>
              <div>
                <p className="eyebrow">SMALL WINS, REMEMBERED</p>
                <h3>A shelf for the things you did.</h3>
                <p>
                  {earned} of {badges.length} milestones earned. These are
                  keepsakes, with no extra XP. Once recorded, they stay earned
                  even if you change a mission’s growth path or expand a
                  finished project.
                </p>
              </div>
            </div>
            <div className="growth-gallery">
              {badges.map((b) => (
                <article
                  key={b.id}
                  className={`growth-achievement ${b.earned ? "earned" : "locked"}`}
                  data-achievement={b.id}
                  data-earned={b.earned}
                >
                  <div className="growth-medal" aria-hidden="true">
                    {b.symbol}
                  </div>
                  <p className="eyebrow">
                    {b.earned ? "✦ EARNED" : "A LITTLE FURTHER"}
                  </p>
                  <h4>{b.name}</h4>
                  <p>{b.description}</p>
                  {b.earned ? (
                    <span className="growth-earned-label">
                      A part of your story.
                    </span>
                  ) : (
                    <>
                      <progress
                        value={b.value}
                        max={b.target}
                        aria-label={`${b.name} progress`}
                      />
                      <span className="growth-earned-label">
                        {b.value} / {b.target}
                      </span>
                    </>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
        {saveError ? (
          <p className="growth-save-error" role="alert">
            {saveError} Changes in this tab are not saved yet.
          </p>
        ) : null}
        <p className="growth-results" role="status">
          {message}
        </p>
        <footer className="growth-footer">
          Three paths. Your pace. No streaks to lose, no penalty for a break.
          <br />
          Saved with your world and included in JSON backups. Cloud sync comes
          later.
        </footer>
      </section>
    </dialog>
  );
}
