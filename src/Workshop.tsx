import { useEffect, useRef, useState } from "react";
import {
  createProject,
  addMilestone,
  addProjectTask,
  projectProgress,
} from "./game";
import type { Save } from "./game";
import { AvatarArt } from "./world/PersonalArt";
import "./home-room.css";
import "./workshop.css";
import { EditableTitle } from "./EditableTitle";
import type { EditableKind } from "./polish";

const stages = [
  "The blueprint",
  "Foundations laid",
  "Taking shape",
  "Built with care",
];
export function Workshop({
  save,
  onRename,
  onUpdate,
  onComplete,
  onExit,
  saveError,
}: {
  save: Save;
  onRename: (kind: EditableKind, id: string, title: string) => void;
  onUpdate: (fn: (save: Save) => Save) => void;
  onComplete: (id: string) => void;
  onExit: () => void;
  saveError: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(save.projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [milestone, setMilestone] = useState("");
  const [message, setMessage] = useState("");
  const project = save.projects.find((p) => p.id === selected);
  const progress = project
    ? projectProgress(save, project)
    : {
        total: 0,
        done: 0,
        percent: 0,
        stage: 0,
        milestones: 0,
        complete: false,
      };
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="home-room workshop-room"
      aria-labelledby="workshop-title"
      onCancel={onExit}
      onClose={onExit}
    >
      <div className="room-heading">
        <div>
          <p className="eyebrow">MOONHOLLOW / PROJECT WORKSHOP</p>
          <h2 id="workshop-title">Big dreams. Little by little.</h2>
        </div>
        <button className="room-exit" onClick={onExit}>
          ↗ Back to island
        </button>
      </div>
      <div className="room-layout">
        <section className="workshop-scene" aria-label="Project build model">
          <p className="eyebrow">ON THE WORKBENCH</p>
          <h3>{project?.title ?? "Your next big thing"}</h3>
          <svg
            viewBox="0 0 760 500"
            role="img"
            aria-label={`Project model: ${stages[progress.stage]}`}
            data-testid="project-model"
            data-stage={progress.stage}
          >
            <defs>
              <radialGradient id="workshop-light">
                <stop stopColor="#b3b287" stopOpacity=".2" />
                <stop offset="1" stopColor="#637785" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse
              cx="380"
              cy="245"
              rx="320"
              ry="230"
              fill="url(#workshop-light)"
            />
            <path d="M105 324v54l265 101 278-107v-54" fill="#504c59" />
            <path
              d="m105 317 267-102 276 103-277 115Z"
              fill="#9c8f83"
              stroke="#d2b99a"
              strokeWidth="5"
            />
            <path
              d="m175 315 195-75 203 77-202 81Z"
              fill="#425f74"
              stroke="#aac1c1"
              strokeWidth="3"
            />
            <g stroke="#aec6c6" fill="none" opacity=".4">
              <path d="m215 303 199 76m-155-93 199 76m-155-93 199 76m-75-86-198 78m243-61-198 78" />
              <path d="m275 312 94-40 93 40-92 39Z" strokeDasharray="6 5" />
            </g>
            {progress.stage >= 1 && (
              <g>
                <path
                  d="m275 307 95-38 95 38v22l-95 41-95-41Z"
                  fill="#c0b59c"
                />
                <path d="m370 269v101l95-41v-22Z" fill="#8a9c94" />
                <path
                  d="M278 307V201m92 68V157m92 150V201"
                  stroke="#d4b999"
                  strokeWidth="10"
                />
                <path
                  d="m278 201 92-44 92 44m-92-44v-57"
                  fill="none"
                  stroke="#d4b999"
                  strokeWidth="8"
                />
              </g>
            )}
            {progress.stage >= 2 && (
              <g>
                <path d="M280 205 370 246V355L280 316Z" fill="#b6b09e" />
                <path d="m370 246 90-41v111l-90 39Z" fill="#799797" />
                <path
                  d="m265 205 105-108 107 108-107 41Z"
                  fill="#5a8787"
                  stroke="#b0c2ad"
                  strokeWidth="5"
                />
                <path d="m307 253 28 12v34l-28-12Z" fill="#f2d6a4" />
                <path d="m395 272 32-14v59l-32 14Z" fill="#495f73" />
              </g>
            )}
            {progress.stage === 3 && (
              <g>
                <path
                  d="M371 100V45l60 17-60 20"
                  fill="#dfbd7f"
                  stroke="#d7c6a6"
                  strokeWidth="4"
                />
                <path d="m395 273 32-14v58l-32 14Z" fill="#ebca91" />
                <g fill="#abc1a6">
                  <circle cx="261" cy="321" r="20" />
                  <circle cx="479" cy="321" r="22" />
                </g>
                <g fill="#e8c69e">
                  <circle cx="254" cy="316" r="5" />
                  <circle cx="480" cy="311" r="5" />
                </g>
                <path
                  d="m201 164 4 12 12 4-12 4-4 12-4-12-12-4 12-4Zm341 35 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z"
                  fill="#e2cf9f"
                />
              </g>
            )}
            <g transform="translate(557 405)">
              <AvatarArt avatar={save.avatar} />
            </g>
            <path d="m152 330 35-14 30 12-35 15Z" fill="#d5c5a7" />
            <path d="m183 361 35-14" stroke="#576978" strokeWidth="7" />
          </svg>
          <div className="build-stage">
            <span>0{progress.stage + 1} / 04</span>
            <h4>{stages[progress.stage]}</h4>
            <p>
              {
                [
                  "Name a project and sketch its milestones.",
                  "Your tasks are ready. Complete the first small step.",
                  "Each finished task brings your model closer to life.",
                  "Every milestone is complete. Take a moment to enjoy it.",
                ][progress.stage]
              }
            </p>
          </div>
          <div className="build-stats">
            <b>
              {progress.done}
              <small>tasks finished</small>
            </b>
            <b>
              {progress.milestones}
              <small>milestones finished</small>
            </b>
            <b>
              {progress.percent}%<small>tasks complete</small>
            </b>
          </div>
          <p className="workshop-note">
            This model celebrates the selected project’s progress.
          </p>
        </section>
        <section
          className="room-panel workshop-panel"
          aria-label="Project planning"
        >
          <label htmlFor="project-picker">On your workbench</label>
          <select
            id="project-picker"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setMilestone("");
              setMessage("");
            }}
          >
            <option value="">Start a new project</option>
            {save.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          {!project ? (
            <>
              <p className="eyebrow">MAKE ROOM FOR SOMETHING BIG</p>
              <h3>What will you build?</h3>
              <p>
                A project holds milestones. Each milestone holds small tasks you
                can actually finish.
              </p>
              <form
                className="room-mission-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!title.trim()) return;
                  const id = crypto.randomUUID();
                  onUpdate((s) => createProject(s, id, title));
                  setSelected(id);
                  setTitle("");
                  setMessage("Project created. Add your first milestone.");
                  requestAnimationFrame(() =>
                    dialog.current
                      ?.querySelector<HTMLInputElement>("#milestone-title")
                      ?.focus(),
                  );
                }}
              >
                <label htmlFor="project-title">Project name</label>
                <input
                  id="project-title"
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Build my first game…"
                />
                <button className="primary-action" disabled={!title.trim()}>
                  Create project →
                </button>
              </form>
            </>
          ) : (
            <>
              <h3>
                <EditableTitle
                  title={project.title}
                  onSave={(title) => onRename("projects", project.id, title)}
                />
              </h3>
              <p>
                {progress.complete
                  ? "Project complete. You brought this one to life."
                  : `${progress.done} of ${progress.total} tasks complete · ${progress.milestones} of ${project.milestones.length} milestones finished`}
              </p>
              <progress
                aria-label="Project task progress"
                value={progress.done}
                max={Math.max(1, progress.total)}
              />
              <p className="workshop-note">
                Each task also appears in Home Base. Complete it in either place
                for +25 XP, once.
              </p>
              <form
                className="room-mission-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!milestone.trim()) return;
                  const id = crypto.randomUUID();
                  onUpdate((s) => addMilestone(s, project.id, id, milestone));
                  setMilestone("");
                  setMessage("Milestone added. Give it a small first task.");
                  e.currentTarget.querySelector("input")?.focus();
                }}
              >
                <label htmlFor="milestone-title">Next milestone</label>
                <input
                  id="milestone-title"
                  value={milestone}
                  maxLength={160}
                  onChange={(e) => setMilestone(e.target.value)}
                  placeholder="Make a playable prototype…"
                />
                <button className="primary-action" disabled={!milestone.trim()}>
                  Add milestone +
                </button>
              </form>
              <div className="project-milestones">
                {project.milestones.map((m, i) => (
                  <Milestone
                    onRename={onRename}
                    key={m.id}
                    milestone={m}
                    index={i}
                    save={save}
                    onAdd={(title) =>
                      onUpdate((s) =>
                        addProjectTask(
                          s,
                          project.id,
                          m.id,
                          crypto.randomUUID(),
                          title,
                        ),
                      )
                    }
                    onComplete={(id) => {
                      onComplete(id);
                      setMessage(
                        "Task complete. +25 XP — your build is growing.",
                      );
                    }}
                  />
                ))}
              </div>
              {!project.milestones.length && (
                <p className="room-empty">
                  Start with one milestone: a clear result you want to reach.
                </p>
              )}
            </>
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
function Milestone({
  onRename,
  milestone,
  index,
  save,
  onAdd,
  onComplete,
}: {
  onRename: (kind: EditableKind, id: string, title: string) => void;
  milestone: Save["projects"][number]["milestones"][number];
  index: number;
  save: Save;
  onAdd: (title: string) => void;
  onComplete: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const tasks = milestone.taskIds.map((id) =>
    save.missions.find((t) => t.id === id)!,
  );
  const done = tasks.filter((t) => t.done).length;
  return (
    <article className="project-milestone" tabIndex={-1}>
      <div className="milestone-heading">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <h4>
          <EditableTitle
            title={milestone.title}
            onSave={(title) => onRename("milestones", milestone.id, title)}
          />
        </h4>
        <small>
          {tasks.length && done === tasks.length
            ? "✓ Done"
            : `${done}/${tasks.length}`}
        </small>
      </div>
      <ul className="room-missions">
        {tasks.map((task) => (
          <li key={task.id}>
            <EditableTitle
              title={task.title}
              onSave={(title) => onRename("missions", task.id, title)}
            />
            <button
              disabled={task.done}
              aria-label={
                task.done ? `${task.title} completed` : `Complete ${task.title}`
              }
              onClick={(event) => {
                onComplete(task.id);
                event.currentTarget
                  .closest("article")
                  ?.focus({ preventScroll: true });
              }}
            >
              {task.done ? "✓ Done" : "+25 XP"}
            </button>
          </li>
        ))}
      </ul>
      {!tasks.length && (
        <p className="workshop-note">Add a task to begin this milestone.</p>
      )}
      <form
        className="milestone-task-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onAdd(draft);
          setDraft("");
          e.currentTarget.querySelector("input")?.focus();
        }}
      >
        <label className="sr-only" htmlFor={`task-${milestone.id}`}>
          New task for {milestone.title}
        </label>
        <input
          id={`task-${milestone.id}`}
          maxLength={160}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="One small, doable task…"
        />
        <button
          disabled={!draft.trim()}
          aria-label={`Add task to ${milestone.title}`}
        >
          +
        </button>
      </form>
    </article>
  );
}
