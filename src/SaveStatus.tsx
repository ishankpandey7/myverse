import { useEffect, useRef, useState } from "react";
import { totalXP } from "./game";
import type { Save } from "./game";
import type { SaveSession, WorldPreview } from "./saveRepository";
import { downloadWorld } from "./worldBackup";
import "./save-status.css";

function WorldSummary({ save, title }: { save: Save; title: string }) {
  return (
    <section className="save-world-summary" aria-label={title}>
      <h3>{title}</h3>
      <p>
        <strong>{save.avatar.name}</strong>
        <br />
        {save.missions.length} missions · {save.ideas.length} ideas ·{" "}
        {save.projects.length} projects · {totalXP(save)} XP
      </p>
      <ul>
        {save.missions.slice(-3).map((mission) => (
          <li key={mission.id}>
            {mission.done ? "✓" : "○"} {mission.title}
          </li>
        ))}
      </ul>
      {!save.missions.length && <p>No missions yet.</p>}
      {save.missions.length > 3 && (
        <small>Showing the last 3 missions in the list.</small>
      )}
    </section>
  );
}
export function SaveStatus({
  session,
  onReview,
}: {
  session: SaveSession;
  onReview: (open: boolean) => void;
}) {
  const state = session.getSnapshot();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [preview, setPreview] = useState<WorldPreview | null>(null),
    [message, setMessage] = useState(""),
    [working, setWorking] = useState(false);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  const problem = state.status !== "saved" && state.status !== "saving";
  function showReview(value: boolean) {
    setOpen(value);
    onReview(value);
  }
  async function review() {
    setWorking(true);
    try {
      setPreview(await session.preview("saved"));
      setMessage("");
    } catch {
      setPreview(null);
      setMessage(
        "The saved world could not be read. Keep this session and download a backup.",
      );
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className={`save-status ${problem ? "has-problem" : ""}`}>
      <p role={problem ? "alert" : "status"}>
        {problem
          ? state.message
          : state.status === "saving"
            ? "Saving your world…"
            : "Saved in this browser · Cloud sync comes later"}
        {problem && state.dirty
          ? " Changes in this tab are not saved yet."
          : ""}
      </p>
      {problem && (
        <div className="save-status-actions">
          <button
            onClick={() => {
              downloadWorld(state.save);
            }}
          >
            Download this session ↓
          </button>
          <button
            onClick={() => {
              showReview(true);
              void review();
            }}
          >
            Review saved world
          </button>
          <button disabled={state.busy} onClick={() => session.retry()}>
            Retry saving
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="save-review"
        aria-labelledby="save-review-title"
        onCancel={() => showReview(false)}
        onClose={() => showReview(false)}
      >
        <button
          className="save-review-close"
          aria-label="Close saved world review"
          disabled={working || state.busy}
          onClick={() => showReview(false)}
        >
          ×
        </button>
        <p className="eyebrow">YOUR WORLD, KEPT SAFE</p>
        <h2 id="save-review-title">Choose where to continue.</h2>
        <div className="save-comparison">
          <WorldSummary save={state.save} title="This tab" />
          {preview && <WorldSummary save={preview.save} title="Saved world" />}
        </div>
        {preview && (
          <>
            <p>
              Loading replaces this tab's progress and clears form drafts and
              its Focus timer. Unsaved progress is kept in browser recovery
              before loading. Download it too if you want a separate copy.
            </p>
          </>
        )}
        <div className="save-status-actions">
          <button
            onClick={() => {
              downloadWorld(state.save);
              setMessage(
                "Backup download requested. Keep this file before leaving the tab.",
              );
            }}
          >
            Download this session ↓
          </button>
          <button
            disabled={working || state.busy}
            onClick={() => void review()}
          >
            Refresh saved preview
          </button>
          {preview && (
            <button
              className="primary-action"
              disabled={working || state.busy}
              onClick={async () => {
                setWorking(true);
                const result = await session.loadSaved(preview);
                if (result.ok) {
                  showReview(false);
                  setPreview(null);
                } else {
                  setMessage(result.message);
                  if (result.stale) setPreview(null);
                }
                setWorking(false);
              }}
            >
              Load reviewed saved world
            </button>
          )}
          <button
            disabled={working || state.busy}
            onClick={() => showReview(false)}
          >
            Keep this tab's world
          </button>
        </div>
        <p role="status">{message}</p>
      </dialog>
    </div>
  );
}
