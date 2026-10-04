import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Save } from "./game";
import {
  advanceFocus,
  formatFocus,
  pauseFocus,
  readFocus,
  remainingFocus,
  resumeFocus,
  startFocus,
  storeFocus,
} from "./focus";
import type { FocusSession } from "./focus";
import "./focus.css";

function initialFocus() {
  try {
    return readFocus(sessionStorage, Date.now());
  } catch {
    return {
      session: null,
      error: "Timer recovery is unavailable in this browser.",
    };
  }
}
export function FocusStudio({
  open,
  onOpen,
  onClose,
  save,
  onComplete,
  saveError,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  save: Save;
  onComplete: (id: string) => void;
  saveError: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    originalTitle = useRef(
      document.title.endsWith(" · Focus · MyVerse")
        ? "MyVerse — Your little world"
        : document.title,
    );
  const [loaded] = useState(initialFocus),
    [session, setSession] = useState<FocusSession | null>(loaded.session);
  const sessionRef = useRef(session);
  const [now, setNow] = useState(Date.now),
    [minutes, setMinutes] = useState("25"),
    [missionId, setMissionId] = useState("");
  const [storageError, setStorageError] = useState(loaded.error);
  const active = save.missions.filter((m) => !m.done),
    selected = active.some((m) => m.id === missionId) ? missionId : "";
  const mission = session
    ? save.missions.find((m) => m.id === session.missionId)
    : undefined;
  const remaining = session
    ? remainingFocus(session, now)
    : Math.min(120, Math.max(0, Number(minutes) || 0)) * 60_000;
  const clock = formatFocus(remaining),
    progress = session ? 1 - remaining / session.durationMs : 0;
  const status = session?.status;
  function change(next: FocusSession | null) {
    sessionRef.current = next;
    setNow(Date.now());
    setSession(next);
    try {
      setStorageError(storeFocus(sessionStorage, next));
    } catch {
      setStorageError("Timer recovery is unavailable. Keep this page open.");
    }
  }
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    else if (!open && element?.open) element.close();
  }, [open]);
  useEffect(() => {
    const element = dialog.current;
    if (open && element?.open && !element.contains(document.activeElement)) {
      element
        .querySelector<HTMLButtonElement>(".focus-primary, .focus-secondary")
        ?.focus();
    }
  }, [open, status, mission?.done]);
  useEffect(() => {
    if (status !== "running") return;
    const refresh = () => {
      const time = Date.now();
      setNow(time);
      const current = sessionRef.current;
      if (current) {
        const next = advanceFocus(current, time);
        if (next !== current) {
          sessionRef.current = next;
          setSession(next);
          try {
            setStorageError(storeFocus(sessionStorage, next));
          } catch {
            setStorageError(
              "Timer recovery is unavailable. Keep this page open.",
            );
          }
        }
      }
    };
    const interval = window.setInterval(refresh, 1000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [status]);
  useEffect(() => {
    document.title = session
      ? `${status === "finished" ? "Session complete" : `${clock}${status === "paused" ? " · Paused" : ""}`} · Focus · MyVerse`
      : originalTitle.current;
  }, [clock, status, session]);
  useEffect(
    () => () => {
      document.title = originalTitle.current;
    },
    [],
  );
  function start(event: FormEvent) {
    event.preventDefault();
    const next = startFocus(Number(minutes), selected, Date.now());
    if (next) change(next);
  }
  const message =
    status === "finished"
      ? "Your focus session is complete. Take a breath."
      : status === "paused"
        ? "Paused. Take the time you need."
        : status === "running"
          ? "One thing at a time. You have this."
          : "Choose a small step. Give it a little space.";
  return (
    <>
      <button
        className={`focus-shortcut ${session ? "has-session" : ""}`}
        onClick={onOpen}
        aria-label={
          session
            ? `Open focus session, ${status === "finished" ? "complete" : `${clock} ${status === "paused" ? "paused" : "remaining"}`}`
            : "Open focus mode"
        }
      >
        <span aria-hidden="true">◴</span>{" "}
        {session
          ? status === "finished"
            ? "Focus complete ✓"
            : `Focus ${clock}${status === "paused" ? " · paused" : ""}`
          : "Focus mode"}
      </button>
      <dialog
        ref={dialog}
        className="focus-studio"
        aria-labelledby="focus-title"
        onCancel={onClose}
        onClose={onClose}
      >
        <div className="focus-heading">
          <p className="eyebrow">A LITTLE SPACE FOR YOURSELF</p>
          <button
            type="button"
            aria-label="Minimise focus mode"
            onClick={onClose}
          >
            ↗
          </button>
        </div>
        <h2 id="focus-title">
          Let one small thing
          <br />
          <em>have your attention.</em>
        </h2>
        <div
          className={`focus-orbit ${status === "running" ? "is-running" : ""} ${status === "finished" ? "is-finished" : ""}`}
          style={
            { "--focus-progress": `${progress * 360}deg` } as CSSProperties
          }
        >
          <div className="focus-clock">
            <span className="eyebrow">
              {status === "finished"
                ? "A MOMENT WELL SPENT"
                : status === "paused"
                  ? "TAKE A BREATH"
                  : "YOUR QUIET MOMENT"}
            </span>
            <time
              role="timer"
              aria-live="off"
              aria-label="Time remaining"
              data-testid="focus-clock"
            >
              {clock}
            </time>
            <span>
              {session
                ? `${session.durationMs / 60_000} minute session`
                : "Move at your own pace"}
            </span>
          </div>
        </div>
        <p className="focus-status" role="status">
          {message}
        </p>
        {!session ? (
          <form onSubmit={start} className="focus-setup">
            <label htmlFor="focus-mission">
              What would you like to work on?
            </label>
            <select
              id="focus-mission"
              value={selected}
              onChange={(event) => setMissionId(event.target.value)}
            >
              <option value="">Just focus — no mission attached</option>
              {active.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            {active.length === 0 ? (
              <p className="focus-note">
                You can focus freely, or add a mission at Home Base.
              </p>
            ) : null}
            <fieldset>
              <legend>Make a little room</legend>
              <div className="focus-durations">
                {[10, 25, 45].map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={minutes === String(value)}
                    onClick={() => setMinutes(String(value))}
                  >
                    {value} min
                  </button>
                ))}
                <label className="focus-custom" htmlFor="focus-minutes">
                  <span>Custom minutes</span>
                  <input
                    id="focus-minutes"
                    type="number"
                    min="1"
                    max="120"
                    step="1"
                    required
                    value={minutes}
                    onChange={(event) => setMinutes(event.target.value)}
                  />
                </label>
              </div>
            </fieldset>
            <button type="submit" className="focus-primary">
              Begin focus ✦
            </button>
          </form>
        ) : (
          <div className="focus-session">
            <p className="focus-mission-title">
              {mission?.title ??
                (session.missionId
                  ? "This mission is no longer in this world."
                  : "A quiet moment for whatever matters to you.")}
            </p>
            {status === "finished" ? (
              <>
                {mission && !mission.done ? (
                  <>
                    <p className="focus-note">
                      Did you finish the real-world task? Mark it done when
                      you’re ready.
                    </p>
                    <button
                      className="focus-primary"
                      onClick={() => onComplete(mission.id)}
                    >
                      Mark mission complete · +25 XP
                    </button>
                  </>
                ) : (
                  <p className="focus-note">
                    {mission?.done
                      ? "Mission already complete. Its XP is counted once."
                      : "Time spent focusing is enough. There’s no XP for running a timer."}
                  </p>
                )}
                <button
                  className="focus-secondary"
                  onClick={() => change(null)}
                >
                  Start another session
                </button>
              </>
            ) : (
              <>
                <div className="focus-session-actions">
                  <button
                    className="focus-primary"
                    onClick={() =>
                      change(
                        status === "running"
                          ? pauseFocus(session, Date.now())
                          : resumeFocus(session, Date.now()),
                      )
                    }
                  >
                    {status === "running" ? "Pause" : "Resume"}
                  </button>
                  <button className="focus-secondary" onClick={onClose}>
                    Keep going on the island ↗
                  </button>
                </div>
                <button className="focus-reset" onClick={() => change(null)}>
                  Reset timer
                </button>
                <p className="focus-note">
                  Closing this panel keeps your timer. Reload recovery is for
                  this browser tab; the timer is separate from world backups.
                </p>
              </>
            )}
          </div>
        )}
        {storageError ? (
          <p className="focus-note" role="alert">
            {storageError}
          </p>
        ) : null}
        {saveError ? (
          <p className="focus-save-error" role="alert">
            {saveError}
          </p>
        ) : null}
      </dialog>
    </>
  );
}
