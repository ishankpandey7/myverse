import { memo } from "react";
import { BEACON, FRAGMENTS, FRAGMENT_IDS } from "../starfall";
import type { FragmentId, Starfall } from "../starfall";

export const Atmosphere = memo(function Atmosphere({ lit }: { lit: boolean }) {
  return (
    <g pointerEvents="none" aria-hidden="true" className="cosmic-atmosphere">
      <defs>
        <linearGradient id="aurora-ribbon" x2="0" y2="1">
          <stop stopColor="#a8f1d5" stopOpacity="0" />
          <stop offset=".6" stopColor="#a8f1d5" stopOpacity=".22" />
          <stop offset="1" stopColor="#bd99ec" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="beacon-glow">
          <stop stopColor="#c5f4df" stopOpacity=".6" />
          <stop offset="1" stopColor="#a5c9f9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="beacon-beam" x2="0" y2="1">
          <stop stopColor="#ccfce9" stopOpacity="0" />
          <stop offset="1" stopColor="#ccfce9" stopOpacity=".4" />
        </linearGradient>
        <radialGradient id="warm-lamplight">
          <stop stopColor="#ffdfa0" stopOpacity=".24" />
          <stop offset="1" stopColor="#ffdfa0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        className="aurora-ribbon"
        d="M-180 170Q180-110 520 100T1450 35L1450 195Q930 405 515 240T-180 330Z"
        fill="url(#aurora-ribbon)"
      />
      <path
        className="aurora-ribbon second"
        d="M-100 30Q360 280 700 85T1530 110L1510 290Q1120 210 705 245T-100 180Z"
        fill="url(#aurora-ribbon)"
      />
      {[...Array(22)].map((_, i) => (
        <circle
          className="cosmic-mote"
          key={i}
          cx={270 + ((i * 73) % 850)}
          cy={345 + ((i * 53) % 360)}
          r={i % 3 ? 1.6 : 2.8}
          fill={i % 2 ? "#f2d7af" : "#baecd8"}
          style={{ animationDelay: `${-i * 0.7}s` }}
        />
      ))}
      {[
        [430, 509],
        [603, 537],
        [720, 510],
        [891, 479],
        [760, 676],
      ].map(([x, y]) => (
        <ellipse
          key={x}
          cx={x}
          cy={y}
          rx="52"
          ry="23"
          fill="url(#warm-lamplight)"
        />
      ))}
      <g className="shooting-star">
        <path d="m1040 80-130 55" stroke="#d9eee9" strokeWidth="2" />
        <circle cx="1040" cy="80" r="3" fill="#fff4df" />
      </g>
      {lit && (
        <>
          <ellipse
            cx={BEACON.x}
            cy={BEACON.y}
            rx="235"
            ry="135"
            fill="url(#beacon-glow)"
          />
          <path
            d={`M${BEACON.x - 11} ${BEACON.y - 43}L${BEACON.x - 72} -120H${BEACON.x + 72}L${BEACON.x + 11} ${BEACON.y - 43}Z`}
            fill="url(#beacon-beam)"
          />
          <g className="origin-constellation" stroke="#c1ecd8" fill="#eaf3e0">
            <path
              d="m360 123 178-58 182 55 170-65 150 90"
              fill="none"
              strokeWidth="1"
              opacity=".5"
            />
            {[
              [360, 123],
              [538, 65],
              [720, 120],
              [890, 55],
              [1040, 145],
            ].map(([x, y], i) => (
              <g key={x}>
                <circle cx={x} cy={y} r={i % 2 ? 3 : 5} />
                <circle cx={x} cy={y} r="12" fill="none" opacity=".28" />
              </g>
            ))}
          </g>
        </>
      )}
    </g>
  );
});

export function StarfallArt({
  journey,
  onApproach,
  disabled,
}: {
  journey?: Starfall;
  onApproach: (id: FragmentId | "beacon") => void;
  disabled: boolean;
}) {
  return (
    <>
      {FRAGMENT_IDS.map((id) => {
        const spot = FRAGMENTS[id],
          found = journey?.fragments.includes(id);
        return (
          <g
            key={id}
            transform={`translate(${spot.x} ${spot.y})`}
            data-discovery={id}
            className={`star-fragment ${found ? "found" : ""}`}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            aria-label={
              found
                ? `${spot.name} fragment discovered`
                : `Find ${spot.name} fragment`
            }
            onClick={() => !disabled && onApproach(id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                if (!disabled) onApproach(id);
              }
            }}
          >
            <ellipse rx="24" ry="12" fill={spot.color} opacity=".1" />
            <ellipse
              className="fragment-ring"
              rx="20"
              ry="10"
              fill="none"
              stroke={spot.color}
              strokeWidth="1.5"
              opacity=".55"
            />
            <g className="fragment-float">
              <path
                d="M0-42 5-29 18-24 5-19 0-6-5-19-18-24-5-29Z"
                fill={spot.color}
              />
              <circle cy="-24" r="5" fill="#fff7e6" />
            </g>
            <circle cy="-20" r="32" fill="transparent" />
            {found && (
              <text y="5" textAnchor="middle" fill={spot.color} fontSize="10">
                ✓
              </text>
            )}
          </g>
        );
      })}
      <g
        transform={`translate(${BEACON.x} ${BEACON.y})`}
        className={`star-beacon ${journey?.beaconLit ? "lit" : ""}`}
        data-discovery="beacon"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={
          journey?.beaconLit
            ? "Visit the lit Starfall beacon"
            : "Visit the Starfall beacon"
        }
        onClick={() => !disabled && onApproach("beacon")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) onApproach("beacon");
          }
        }}
      >
        <ellipse
          cy="1"
          rx="43"
          ry="16"
          fill="none"
          stroke={journey?.beaconLit ? "#d3f9df" : "#adb6d9"}
          strokeWidth="2"
        />
        <path
          d="m0-63 13 20L0-23-13-43Z"
          fill={journey?.beaconLit ? "#c9f8df" : "#99a2d0"}
          stroke="#f0dfb6"
          strokeWidth="2"
        />
        <path d="M0-63v40m-13-20h26" stroke="#f9efe0" opacity=".6" />
        <circle cy="-35" r="38" fill="transparent" />
      </g>
    </>
  );
}
