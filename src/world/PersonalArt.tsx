import { OUTFITS, SKINS } from "../game";
import type { Avatar, RewardId } from "../game";

export function AvatarArt({
  avatar,
  moving = false,
}: {
  avatar: Avatar;
  moving?: boolean;
}) {
  const outfit = OUTFITS[avatar.outfit],
    skin = SKINS[avatar.skin];
  return (
    <g data-outfit={avatar.outfit} data-hat={avatar.hat}>
      <ellipse cy="1" rx="14" ry="6" fill="#273a4e" opacity=".6" />
      <g className={moving ? "wanderer walking" : "wanderer"}>
        <path
          d="m-6-7-1 8m13-8 1 8"
          stroke="#403e5c"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path d="m-11-7 4-24h15l5 24Q0 0-11-7" fill={outfit.coat} />
        <path
          d="m-7-28-9 14m24-14 8 12"
          stroke={skin}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cy="-38" r="10" fill={skin} />
        {avatar.hat === "wizard" && (
          <>
            <path d="M-13-42 0-68 14-42Z" fill={outfit.hat} />
            <path d="m0-68 5 14-11 5" fill={outfit.trim} />
            <path
              d="M-19-40q19-8 38 0"
              fill="none"
              stroke={outfit.trim}
              strokeWidth="6"
              strokeLinecap="round"
            />
          </>
        )}
        {avatar.hat === "beanie" && (
          <>
            <path d="M-12-39v-5a12 12 0 0 1 24 0v5Z" fill={outfit.hat} />
            <path
              d="M-12-39H12"
              stroke={outfit.trim}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cy="-59" r="4" fill={outfit.trim} />
          </>
        )}
        {avatar.hat === "none" && (
          <path d="M-11-38v-8q6-12 19-3l4 9-10-5-13 7Z" fill="#50404c" />
        )}
        <path d="m-7-27 16 0-4 8" fill="#e8c98f" />
      </g>
    </g>
  );
}

export function DecorationArt({ id }: { id: RewardId }) {
  if (id === "lantern")
    return (
      <g>
        <ellipse rx="32" ry="14" fill="#ffe2a8" opacity=".15" />
        <ellipse rx="17" ry="7" fill="#ffe2a8" opacity=".2" />
        <path
          d="M0 0V-58q0-12 12-12h12"
          stroke="#8a7b82"
          strokeWidth="5"
          fill="none"
        />
        <path d="M22-69v8" stroke="#e5c797" strokeWidth="2" />
        <path d="m10-58 12-9 12 9v23l-12 8-12-8Z" fill="#edd39b" />
        <path d="m10-58 12 6 12-6m-12 6v25" stroke="#b38b6a" strokeWidth="2" />
        <path d="m7-59 15-11 15 11Z" fill="#9991aa" />
        <path d="m-8 0 8-4 8 4v5H-8Z" fill="#adb3a4" />
      </g>
    );
  if (id === "flowers")
    return (
      <g>
        <ellipse rx="31" ry="14" fill="#3f6b70" />
        {[-22, -11, 0, 12, 23].map((x, i) => (
          <g key={x} transform={`translate(${x} ${i % 2 ? -8 : 0})`}>
            <path
              d={`M0 3V${-19 - (i % 3) * 6}`}
              stroke="#90b69e"
              strokeWidth="3"
            />
            <path d="M0-4q-14-13-12-3Z" fill="#98b99d" />
            <g
              transform={`translate(0 ${-19 - (i % 3) * 6})`}
              fill={i % 2 ? "#e6b9d4" : "#cbbbe7"}
            >
              <circle cx="-5" r="6" />
              <circle cx="5" r="6" />
              <circle cy="-5" r="6" />
              <circle cy="4" r="6" />
              <circle r="3" fill="#f2dcaf" />
            </g>
          </g>
        ))}
      </g>
    );
  return (
    <g>
      <ellipse rx="30" ry="12" fill="#a8cfdf" opacity=".2" />
      <path d="m-29 0 18-13 29-1 16 14-31 14Z" fill="#707b97" />
      <path d="m-10-6-5-51 17-25 18 28-5 44Z" fill="#a1c4e2" />
      <path d="m2-82 2 69 11 3 5-44Z" fill="#839acc" />
      <path d="m-10-6-5-51 17-25-5 66Z" fill="#d1d7ed" />
      <path d="m-23-1-9-26 8-18 12 16 2 23Z" fill="#baa9d7" />
      <path d="m20 0-1-26 10-17 9 20-6 22Z" fill="#a7cbce" />
      <path d="M-2-48v9m-4-5H3" stroke="#eef5ee" strokeWidth="2" />
    </g>
  );
}
