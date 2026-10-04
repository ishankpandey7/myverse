import { FRAGMENTS, FRAGMENT_IDS, canLightBeacon } from "../starfall";
import type { FragmentId } from "../starfall";
import type { Save } from "../game";

export function StarfallQuest({
  save,
  onApproach,
}: {
  save: Save;
  onApproach: (id: FragmentId | "beacon") => void;
}) {
  const found = save.starfall?.fragments ?? [],
    lit = save.starfall?.beaconLit;
  return (
    <section
      className={`starfall-quest ${lit ? "chapter-complete" : ""}`}
      aria-labelledby="starfall-title"
    >
      <div className="quest-intro">
        <span className="quest-emblem" aria-hidden="true">
          ✧
        </span>
        <div>
          <p className="eyebrow">ISLAND STORY / CHAPTER 01</p>
          <h2 id="starfall-title">
            {lit ? "A light of your own." : "The night the stars fell."}
          </h2>
          <p>
            {lit
              ? "You brought the fragments home. Moonhollow remembers."
              : "Three fallen stars. One small real-world victory. Bring the beacon to life."}
          </p>
        </div>
        <span className="quest-count">
          {lit ? "CHAPTER COMPLETE" : `${found.length} / 3 FOUND`}
        </span>
      </div>
      <div className="quest-stops">
        {FRAGMENT_IDS.map((id, i) => (
          <button
            key={id}
            onClick={() => onApproach(id)}
            className={found.includes(id) ? "discovered" : ""}
            title={FRAGMENTS[id].clue}
          >
            <span className="quest-stop-icon">
              {found.includes(id) ? "✓" : `0${i + 1}`}
            </span>
            <span>
              <b>{FRAGMENTS[id].name}</b>
              <small>
                {found.includes(id)
                  ? "Memory discovered"
                  : "Follow the fallen light ↗"}
              </small>
            </span>
          </button>
        ))}
        <button
          className="beacon-quest-button"
          onClick={() => onApproach("beacon")}
        >
          <span className="quest-stop-icon">✦</span>
          <span>
            <b>{lit ? "Visit your beacon" : "Awaken the beacon"}</b>
            <small>
              {lit
                ? "Your island's new guiding light"
                : canLightBeacon(save)
                  ? "Ready to light. Walk over ↗"
                  : found.length < 3
                    ? "Find all three fragments first"
                    : "Complete one real-life mission"}
            </small>
          </span>
        </button>
      </div>
    </section>
  );
}
