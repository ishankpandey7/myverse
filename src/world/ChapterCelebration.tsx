import { useEffect, useRef } from "react";

export function ChapterCelebration({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="chapter-celebration"
      aria-labelledby="chapter-celebration-title"
      onCancel={onClose}
      onClose={onClose}
    >
      <p className="eyebrow">STARFALL / CHAPTER COMPLETE</p>
      <div className="celebration-sigil" aria-hidden="true">
        <svg viewBox="0 0 280 220">
          <defs>
            <radialGradient id="sigil-light">
              <stop stopColor="#b7edce" stopOpacity=".3" />
              <stop offset="1" stopColor="#b7edce" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse
            cx="140"
            cy="110"
            rx="115"
            ry="105"
            fill="url(#sigil-light)"
          />
          <g fill="none" stroke="#b9d6bd">
            <circle cx="140" cy="110" r="66" opacity=".3" />
            <circle
              cx="140"
              cy="110"
              r="80"
              strokeDasharray="2 13"
              opacity=".6"
            />
            <path d="m140 32 68 117H72Z" opacity=".3" />
          </g>
          <g className="sigil-star" fill="#eee0b2">
            <path d="m140 71 10 28 28 11-28 10-10 29-10-29-28-10 28-11Z" />
            <circle cx="140" cy="110" r="8" fill="#f6ffea" />
          </g>
          <g fill="#c6e9d6">
            <circle cx="140" cy="32" r="5" />
            <circle cx="72" cy="149" r="5" />
            <circle cx="208" cy="149" r="5" />
          </g>
          <path
            d="m30 70 4 8 8 4-8 4-4 8-4-8-8-4 8-4Zm210 71 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"
            fill="#b8c6dc"
          />
        </svg>
      </div>
      <h2 id="chapter-celebration-title">You gave this world a light.</h2>
      <p>
        Three little discoveries. A real-life victory. The beacon carries your
        light into Moonhollow’s sky.
      </p>
      <div className="celebration-reward">
        <span>✦</span>
        <div>
          <b>Origin constellation awakened</b>
          <small>A permanent part of your island.</small>
        </div>
      </div>
      <button className="primary-action" autoFocus onClick={onClose}>
        See my brighter island →
      </button>
    </dialog>
  );
}
