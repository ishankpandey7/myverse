import { memo } from "react";
import { LAND, TREES } from "./navigation";
import type { Point } from "./navigation";
import { PLOTS } from "../game";
import type { Avatar, Save, RewardId } from "../game";
import { AvatarArt, DecorationArt } from "./PersonalArt";

export const Terrain = memo(function Terrain() {
  const outline = LAND.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id="earth" x2="0" y2="1">
          <stop stopColor="#5b657f" />
          <stop offset="1" stopColor="#202941" />
        </linearGradient>
        <linearGradient id="meadow" x2=".3" y2="1">
          <stop stopColor="#809f99" />
          <stop offset="1" stopColor="#446b71" />
        </linearGradient>
        <linearGradient id="water" x2="0" y2="1">
          <stop stopColor="#7fc1ca" />
          <stop offset="1" stopColor="#326786" />
        </linearGradient>
        <linearGradient id="fall" x2="0" y2="1">
          <stop stopColor="#9adee2" stopOpacity=".8" />
          <stop offset="1" stopColor="#78bdd5" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="mist">
          <stop stopColor="#a3a2da" stopOpacity=".16" />
          <stop offset="1" stopColor="#a3a2da" stopOpacity="0" />
        </radialGradient>
        <pattern
          id="grass-detail"
          width="53"
          height="47"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="m14 22-2-5m2 5 3-7m23 25 2-5"
            stroke="#c0d4ac"
            strokeWidth="1.2"
            opacity=".25"
          />
        </pattern>
      </defs>
      <ellipse cx="710" cy="520" rx="690" ry="430" fill="url(#mist)" />
      <g fill="#ccc9e5">
        {Array.from({ length: 65 }, (_, i) => (
          <circle
            key={i}
            cx={(i * 197 + 37) % 1400}
            cy={(i * 137 + 17) % 900}
            r={i % 4 === 0 ? 1.8 : 1}
            opacity={0.2 + (i % 5) * 0.12}
          />
        ))}
      </g>
      <path d="M1190 128a30 30 0 1 1-30-38 29 29 0 0 0 30 38" fill="#edd9b3" />
      <path
        d="M130 438 230 663 460 807 687 914 1000 825 1160 697 1280 470 1010 542 620 650Z"
        fill="url(#earth)"
      />
      <path
        d="m230 600 0 63 230 144-104-179m264 28 67 258 120-125 20-120m256-37-83 193 160-128 35-120"
        fill="#8590a0"
        opacity=".16"
      />
      <polygon points={outline} transform="translate(0 15)" fill="#314c58" />
      <polygon points={outline} fill="url(#meadow)" />
      <polygon points={outline} fill="url(#grass-detail)" />
      <path
        d="M303 516Q434 498 520 500T695 528Q793 492 980 460M660 577 695 528M695 528Q738 555 740 617M695 528Q740 405 824 376"
        stroke="#a6ac8f"
        strokeWidth="34"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M303 516Q434 498 520 500T695 528Q793 492 980 460M660 577 695 528M695 528Q738 555 740 617M695 528Q740 405 824 376"
        stroke="#d5c5a4"
        strokeWidth="23"
        strokeLinecap="round"
        fill="none"
        opacity=".65"
      />
      <g stroke="#969e88" strokeWidth="2" opacity=".65">
        {Array.from({ length: 10 }, (_, i) => (
          <path
            key={i}
            d={`m${542 + i * 36} ${502 + Math.sin(i * 0.5) * 18} 1 12`}
          />
        ))}
      </g>
      <ellipse cx="840" cy="621" rx="121" ry="65" fill="#394f60" />
      <ellipse cx="840" cy="618" rx="110" ry="55" fill="url(#water)" />
      <path
        d="M912 642Q965 671 956 733"
        fill="none"
        stroke="#80b7bd"
        strokeWidth="24"
      />
      <path d="M943 727 970 724 962 920 938 916Z" fill="url(#fall)" />
      <g
        className="water-ripples"
        fill="none"
        stroke="#d1f0e3"
        strokeWidth="2"
        opacity=".5"
      >
        <path d="M771 606q32-8 56 0m-41 30q42 9 81-2m-18-37 32-1m-55 15 63 4" />
      </g>
      <g fill="#b3c89b">
        <ellipse cx="807" cy="586" rx="10" ry="4" />
        <ellipse cx="889" cy="631" rx="8" ry="4" />
      </g>
      <g transform="translate(1100 300)" opacity=".6">
        <path d="m0 0 77-16 63 32-89 36Z" fill="#768f8f" />
        <path d="m0 0 51 72 89-56-89 36Z" fill="#47546d" />
      </g>
      <g fill="#758598" opacity=".6">
        <path d="m260 744 27 7-11 39Z" />
        <path d="m1145 797 35-14-19 48Z" />
        <path d="m440 862 22 4-9 29Z" />
      </g>
      <g stroke="#c5b795" strokeWidth="4">
        <path d="M370 324 450 302m-80 6v34m27-43v34m27-42v33m25-41v33" />
        <path d="m995 668 84-39m-78 19v35m24-45v31m25-43v32m25-45v35" />
      </g>
      <g fill="#d0b6d1">
        {Array.from({ length: 28 }, (_, i) => (
          <g
            key={i}
            transform={`translate(${380 + ((i * 71) % 640)} ${310 + ((i * 97) % 375)})`}
          >
            <circle r="2.7" />
            <circle cx="4" cy="1" r="2" />
            <path d="M1 3v5" stroke="#8fb291" />
          </g>
        ))}
      </g>
      <g transform="translate(805 377)">
        <ellipse rx="47" ry="20" fill="#6b817d" />
        <ellipse rx="39" ry="15" fill="#b6b6aa" />
        <ellipse rx="32" ry="10" fill="#6f929e" />
        <path d="M-4-4V-29H4V-4" fill="#cbd2c1" />
        <ellipse cy="-29" rx="17" ry="6" fill="#b9c9c8" />
        <path d="M0-30v-14" stroke="#b8e3d7" strokeWidth="4" />
      </g>
      <g fill="#809797" opacity=".7">
        <ellipse cx="1160" cy="580" rx="21" ry="10" />
        <ellipse cx="1137" cy="590" rx="13" ry="7" />
        <ellipse cx="480" cy="688" rx="16" ry="9" />
      </g>
    </g>
  );
});

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} aria-hidden="true">
      <ellipse cy="3" rx="25" ry="9" fill="#233f47" opacity=".4" />
      <path d="M0 0V-54" stroke="#85746c" strokeWidth="9" />
      <path d="m-36-24 36-68 36 68Z" fill="#315d66" />
      <path d="m-31-46 31-66 31 66Z" fill="#49797d" />
      <path d="m-23-72 23-55 23 55Z" fill="#6c9b94" />
      <path d="m0-127 23 55H0Z" fill="#54877f" />
    </g>
  );
}
export function Home() {
  return (
    <g transform="translate(480 420)" aria-hidden="true">
      <ellipse cy="18" rx="114" ry="39" fill="#243e48" opacity=".4" />
      <path d="m-72-15 93-40 65 33-86 45Z" fill="#ad9681" />
      <path d="M-72-15V-108L0-75V23Z" fill="#d3bea1" />
      <path d="M0-75 86-113V-22L0 23Z" fill="#ad947e" />
      <path d="M-93-107-18-179 105-118 0-65Z" fill="#63688e" />
      <path d="m-93-107 75-72 9 53-46 37Z" fill="#9498b9" />
      <path d="m-18-179 123 61-14 10-99-49Z" fill="#a4a8c2" />
      <path d="m53-145 0-59 20 10v60" fill="#baa99e" />
      <path d="m53-204 20 10 8-5-20-10Z" fill="#dac5ac" />
      <path d="m-52-80 24 11v31l-24-11Z" fill="#f1d399" />
      <path d="m-40-75 0 31m-12-21 24 11" stroke="#a58b72" strokeWidth="3" />
      <path d="m30-29 25-12v42l-25 13Z" fill="#473f56" />
      <path d="m36-31 14-7v28l-14 7Z" fill="#edc68c" />
      <path d="m20 22 53-25 19 10-52 25Z" fill="#d5bc97" />
      <path d="m40 32 52-25v8L40 41Z" fill="#ad957e" />
      <path d="m-64-15 32 15v11L-64-4Z" fill="#77677f" />
      <g fill="#afc397">
        <circle cx="-55" cy="-16" r="10" />
        <circle cx="-41" cy="-10" r="9" />
      </g>
      <path d="m70-72 11-5v18l-11 5Z" fill="#f2d69f" />
    </g>
  );
}
export function Observatory() {
  return (
    <g transform="translate(975 380)" aria-hidden="true">
      <ellipse cy="27" rx="87" ry="30" fill="#273e48" opacity=".4" />
      <path d="M-58 15V-96H58V15Q0 51-58 15" fill="#9395b8" />
      <path d="M0-93H58V15Q30 35 0 35Z" fill="#787c9f" />
      <ellipse cy="-96" rx="63" ry="26" fill="#b9bad2" />
      <path d="M-62-97C-62-185 62-185 62-97Q0-60-62-97" fill="#757da7" />
      <path
        d="M0-163Q-30-107 0-76"
        fill="none"
        stroke="#bbc1d8"
        strokeWidth="8"
      />
      <path d="m23-132 75-52 18 25-75 50Z" fill="#d9c195" />
      <path d="m91-180 23-16 21 29-21 16Z" fill="#ebd6ac" />
      <path d="m117-195 18 28" stroke="#6c758f" strokeWidth="9" />
      <ellipse
        cy="7"
        rx="62"
        ry="22"
        fill="none"
        stroke="#b7adc2"
        strokeWidth="5"
      />
      <path d="M-11 34V0a13 13 0 0 1 26 0v34" fill="#f1d59e" />
      <path d="m-39-71 12 4v26l-12-4Zm66 3 12-4v26l-12 4Z" fill="#d8c5c3" />
      <path d="m-17 40 39-1 14 10-48 4Z" fill="#bcb2b3" />
    </g>
  );
}
const staticEntities = [
  ...TREES.map(([x, y, s], i) => ({
    y,
    key: `tree-${i}`,
    node: <Tree key={`tree-${i}`} x={x} y={y} s={s} />,
  })),
  { y: 455, key: "home", node: <Home key="home" /> },
  { y: 425, key: "observatory", node: <Observatory key="observatory" /> },
  ...[
    [430, 509],
    [603, 537],
    [720, 510],
    [891, 479],
    [760, 676],
  ].map(([x, y], i) => ({
    y,
    key: `lamp-${i}`,
    node: (
      <g
        key={`lamp-${i}`}
        transform={`translate(${x} ${y})`}
        aria-hidden="true"
      >
        <ellipse rx="16" ry="7" fill="#eed49a" opacity=".15" />
        <path d="M0 0V-38" stroke="#6b6172" strokeWidth="4" />
        <path d="m-7-40 7-8 7 8v13H-7Z" fill="#f0d9a1" />
        <path d="m-10-41 10-9 10 9Z" fill="#73728b" />
      </g>
    ),
  })),
];
export function WorldEntities({
  position,
  moving,
  avatar,
  decorations,
}: {
  position: Point;
  moving: boolean;
  avatar: Avatar;
  decorations: Save["decorations"];
}) {
  const character = (
    <g
      key="player"
      transform={`translate(${position.x} ${position.y})`}
      data-testid="world-character"
      data-x={Math.round(position.x)}
      data-y={Math.round(position.y)}
      aria-hidden="true"
    >
      <AvatarArt avatar={avatar} moving={moving} />
    </g>
  );
  const personal = (
    Object.entries(decorations) as [RewardId, keyof typeof PLOTS][]
  ).map(([id, plot]) => ({
    y: PLOTS[plot].y,
    key: id,
    node: (
      <g
        key={id}
        className="placed-decoration"
        data-testid={"decoration-" + id}
        data-plot={plot}
        transform={`translate(${PLOTS[plot].x} ${PLOTS[plot].y})`}
        aria-hidden="true"
      >
        <DecorationArt id={id} />
      </g>
    ),
  }));
  return (
    <>
      {[
        ...staticEntities,
        ...personal,
        { y: position.y, key: "player", node: character },
      ]
        .sort((a, b) => a.y - b.y)
        .map((entity) => entity.node)}
    </>
  );
}
