import { memo } from "react";
import { SKILLS, gardenProgress } from "./growth";
import type { SkillId } from "./growth";
import type { Save } from "./game";

export function PlantShape({
  skill,
  stage,
}: {
  skill: SkillId;
  stage: number;
}) {
  const color = SKILLS[skill].color,
    height = stage === 3 ? 123 : stage === 2 ? 91 : 48;
  return (
    <g>
      <ellipse cy="10" rx="42" ry="12" fill="#0a1724" opacity=".35" />
      <path
        d="M-30-3 0-15 30-3 23 20 0 30-23 20Z"
        fill="#435354"
        stroke="#b2bd9a"
        strokeWidth="1.5"
      />
      <ellipse cy="-3" rx="29" ry="11" fill="#263f3d" />
      {stage === 0 ? (
        <>
          <ellipse cy="-10" rx="10" ry="6" fill={color} />
          <path d="M-4-14q4-15 11-16-1 15-11 16" fill="#a4c8a9" />
        </>
      ) : (
        <>
          <path
            d={`M0-8Q-9-${height * 0.5} 0-${height}`}
            fill="none"
            stroke="#a0bfa0"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {Array.from({ length: stage === 1 ? 2 : 6 }, (_, i) => {
            const y = -20 - i * (stage === 1 ? 12 : 14),
              side = i % 2 ? 1 : -1;
            return (
              <path
                key={i}
                d={`M0 ${y}q${side * 34} -34 ${side * 38} -7Q${side * 20} ${y + 6} 0 ${y}`}
                fill={i % 3 === 0 ? color : "#7fab98"}
                stroke="#d0ddb1"
                strokeWidth=".8"
              />
            );
          })}
          {stage >= 2 && (
            <g transform={`translate(0 -${height})`}>
              {stage === 3 &&
                Array.from({ length: 8 }, (_, i) => (
                  <ellipse
                    key={i}
                    cy="-16"
                    rx={skill === "curiosity" ? 6 : 9}
                    ry="24"
                    fill={color}
                    transform={`rotate(${i * 45})`}
                    opacity=".85"
                  />
                ))}
              <path
                d="m0-15 11 15-11 15-11-15Z"
                fill={color}
                stroke="#f1e2ba"
                strokeWidth="2"
              />
              <circle r="4" fill="#fff0cb" />
            </g>
          )}
          {stage === 3 && (
            <g fill={color}>
              <circle cx="-47" cy="-115" r="2" />
              <circle cx="39" cy="-73" r="1.5" />
              <path d="m45-137 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" />
            </g>
          )}
        </>
      )}
    </g>
  );
}
export function PlantArt({ skill, stage }: { skill: SkillId; stage: number }) {
  return (
    <svg
      className="growth-plant"
      viewBox="-75 -174 150 214"
      role="img"
      aria-label={`${SKILLS[skill].plant}, growth stage ${stage + 1} of 4`}
    >
      <PlantShape skill={skill} stage={stage} />
    </svg>
  );
}
export function SkillBadge({ skill }: { skill?: SkillId }) {
  return skill ? (
    <small className="skill-badge" style={{ color: SKILLS[skill].color }}>
      {SKILLS[skill].symbol} {SKILLS[skill].name}
    </small>
  ) : null;
}
export const GardenArt = memo(function GardenArt({ save }: { save: Save }) {
  return (
    <g transform="translate(520 605)" aria-hidden="true">
      <ellipse cy="13" rx="91" ry="36" fill="#132c31" opacity=".4" />
      <path
        d="M-78-24 0-48 78-24v39L0 41-78 15Z"
        fill="#596c67"
        stroke="#a0ae92"
        strokeWidth="3"
      />
      <path d="M-78-24 0-48 78-24 0 4Z" fill="#839482" />
      <path
        d="M-73-7v-66q73-83 146 0v66"
        fill="none"
        stroke="#b9a579"
        strokeWidth="5"
      />
      <path
        d="M-73-7v-66q73-83 146 0v66"
        fill="none"
        stroke="#9bd9bf"
        strokeWidth="1"
      />
      {gardenProgress(save).map((p, i) => (
        <g
          key={p.id}
          transform={`translate(${(i - 1) * 47} -2) scale(.51)`}
          data-garden-stage={p.stage}
        >
          <PlantShape skill={p.id} stage={p.stage} />
        </g>
      ))}
      <path
        d="M-22 38 0 47 22 38"
        fill="none"
        stroke="#d3c197"
        strokeWidth="6"
      />
    </g>
  );
});
