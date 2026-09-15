import { useEffect, useRef, useState } from "react";
import { BEFORE_RESTORE, GUIDE_KEY } from "./polish";
import { decodeSave, totalXP } from "./game";
import type { Save } from "./game";
import "./polish.css";
export function WorldTools({
  mode,
  save,
  onRestore,
  onClose,
}: {
  mode: "guide" | "backup";
  save: Save;
  onRestore: (save: Save) => string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    file = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0),
    [backupText, setBackupText] = useState(""),
    [pending, setPending] = useState<Save | null>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  function close() {
    if (mode === "guide")
      try {
        localStorage.setItem(GUIDE_KEY, "yes");
      } catch {
        /* Guide can be reopened without saving a preference. */
      }
    onClose();
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(save, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `myverse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      "Backup download requested. Keep the file somewhere you can find it.",
    );
  }
  const slides = [
    {
      symbol: "⌂",
      title: "Your real life grows this world.",
      body: "Walk to Home Base and pin one small mission. Complete it in your day, then mark it done for 25 XP. Rewards unlock as you grow.",
      tip: "Click to walk · Drag to pan · Pinch or scroll over the island to zoom.",
    },
    {
      symbol: "✧",
      title: "Give your ideas a home.",
      body: "Visit the Observatory to capture a thought. Each idea becomes a star. Open one and turn it into a mission when you’re ready.",
      tip: "Use WASD or arrow keys on the map. Press E near a building to enter.",
    },
    {
      symbol: "⚒",
      title: "Build something bigger.",
      body: "The Workshop turns projects into milestones and small tasks. Finish them to watch your model grow. Rename titles with the pencil whenever plans change.",
      tip: "Progress saves in this browser. Download backups regularly; cloud sync comes later.",
    },
  ];
  const slide = slides[step];
  return (
    <dialog
      ref={dialog}
      className="world-tools"
      aria-labelledby="tools-title"
      onCancel={close}
      onClose={close}
    >
      <div className="tools-heading">
        <p className="eyebrow">
          {mode === "guide"
            ? "WELCOME TO YOUR LITTLE WORLD"
            : "KEEP YOUR WORLD CLOSE"}
        </p>
        <button aria-label="Close world tools" onClick={close}>
          ✕
        </button>
      </div>
      {mode === "guide" ? (
        <>
          <div className="guide-symbol" aria-hidden="true">
            {slide.symbol}
          </div>
          <p className="guide-step">
            {step + 1} / {slides.length}
          </p>
          <h2 id="tools-title">{slide.title}</h2>
          <p>{slide.body}</p>
          <p className="guide-tip">{slide.tip}</p>
          <div className="tools-actions">
            <button className="tools-secondary" onClick={close}>
              Skip guide
            </button>
            {step > 0 && (
              <button
                className="tools-secondary"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            <button
              className="primary-action"
              onClick={() => (step === 2 ? close() : setStep(step + 1))}
            >
              {step === 2 ? "Explore my island →" : "Next →"}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 id="tools-title">A little peace of mind.</h2>
          <p>
            Your backup includes missions, ideas, projects, character and
            decorations. It stays on your device.
          </p>
          <div className="backup-summary">
            <b>
              {save.missions.length}
              <small>missions</small>
            </b>
            <b>
              {save.ideas.length}
              <small>ideas</small>
            </b>
            <b>
              {save.projects.length}
              <small>projects</small>
            </b>
            <b>
              {totalXP(save)}
              <small>XP</small>
            </b>
          </div>
          <button className="primary-action" onClick={download}>
            Download world backup ↓
          </button>
          <div className="restore-section">
            <h3>Bring a world back.</h3>
            <p>
              Choose a MyVerse JSON backup. You’ll review it before replacing
              this world.
            </p>
            <input
              ref={file}
              type="file"
              accept=".json,application/json"
              aria-label="Choose MyVerse backup"
              onChange={async (e) => {
                const chosen = e.target.files?.[0];
                setPending(null);
                setMessage("");
                if (!chosen) return;
                try {
                  if (chosen.size > 10 * 1024 * 1024) throw new Error();
                  setPending(decodeSave(await chosen.text()));
                } catch {
                  setMessage(
                    "This file is not a supported MyVerse backup (maximum 10 MB). Your world has not changed.",
                  );
                }
                e.target.value = "";
              }}
            />
            <details className="paste-backup">
              <summary>Have backup text instead?</summary>
              <label htmlFor="backup-text">Paste MyVerse backup text</label>
              <textarea
                id="backup-text"
                value={backupText}
                onChange={(event) => setBackupText(event.target.value)}
                maxLength={10 * 1024 * 1024}
              />
              <button
                className="tools-secondary"
                disabled={!backupText.trim()}
                onClick={() => {
                  try {
                    setPending(decodeSave(backupText));
                    setMessage("");
                  } catch {
                    setPending(null);
                    setMessage(
                      "This is not a supported MyVerse backup. Your world has not changed.",
                    );
                  }
                }}
              >
                Preview pasted backup
              </button>
            </details>
            <button
              className="tools-secondary"
              onClick={() => {
                try {
                  const raw = localStorage.getItem(BEFORE_RESTORE);
                  if (!raw) {
                    setMessage("No previous restore to recover yet.");
                    return;
                  }
                  setPending(decodeSave(raw));
                  setMessage("");
                } catch {
                  setMessage("The previous world could not be read.");
                }
              }}
            >
              Recover world from before last restore
            </button>
          </div>
          {pending && (
            <div className="restore-preview">
              <h3>Review incoming world</h3>
              <p>
                <strong>{pending.avatar.name}</strong> ·{" "}
                {pending.missions.length} missions · {pending.ideas.length}{" "}
                ideas · {pending.projects.length} projects · {totalXP(pending)}{" "}
                XP
              </p>
              <p>
                This replaces your current progress. A recovery copy of your
                current world is saved first. Unsubmitted form drafts will be
                cleared.
              </p>
              <div className="tools-actions">
                <button
                  className="tools-secondary"
                  onClick={() => setPending(null)}
                >
                  Cancel
                </button>
                <button
                  className="primary-action"
                  onClick={() => {
                    const error = onRestore(pending);
                    setMessage(
                      error ||
                        "World restored. Your previous world is available using recovery above.",
                    );
                    if (!error) setPending(null);
                  }}
                >
                  Replace world with this backup
                </button>
              </div>
            </div>
          )}
          <p className="tools-message" role="status">
            {message}
          </p>
        </>
      )}
    </dialog>
  );
}
