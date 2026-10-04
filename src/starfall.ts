import type { Save } from "./game";

export const FRAGMENTS = {
  grove: {
    name: "Whispering grove",
    clue: "A fallen star is waiting beyond the cottage, where the trees meet the path.",
    memory: "Even the biggest dreams begin quietly.",
    x: 390,
    y: 580,
    color: "#bce5cc",
  },
  tide: {
    name: "Silverwater shore",
    clue: "Follow the light east of the Observatory, above the water's edge.",
    memory: "A little curiosity can take you somewhere new.",
    x: 1040,
    y: 525,
    color: "#a8dcef",
  },
  meadow: {
    name: "The dreaming meadow",
    clue: "Look south of the Workshop, in the open grass beside the pond.",
    memory: "Small steps leave a trail worth following.",
    x: 675,
    y: 680,
    color: "#dfbdf6",
  },
} as const;
export type FragmentId = keyof typeof FRAGMENTS;
export const FRAGMENT_IDS = Object.keys(FRAGMENTS) as FragmentId[];
export const BEACON = { x: 805, y: 377 };
export type Starfall = { fragments: FragmentId[]; beaconLit: boolean };
export function validStarfall(value: unknown): value is Starfall {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return (
    Array.isArray(data.fragments) &&
    data.fragments.every(
      (id) => typeof id === "string" && Object.hasOwn(FRAGMENTS, id),
    ) &&
    new Set(data.fragments).size === data.fragments.length &&
    typeof data.beaconLit === "boolean" &&
    (!data.beaconLit || data.fragments.length === FRAGMENT_IDS.length)
  );
}
export function collectFragment(save: Save, id: FragmentId): Save {
  if (!Object.hasOwn(FRAGMENTS, id) || save.starfall?.fragments.includes(id))
    return save;
  return {
    ...save,
    starfall: {
      fragments: [...(save.starfall?.fragments ?? []), id],
      beaconLit: save.starfall?.beaconLit ?? false,
    },
  };
}
export function canLightBeacon(save: Save): boolean {
  return (
    save.starfall?.fragments.length === FRAGMENT_IDS.length &&
    save.missions.some((mission) => mission.done)
  );
}
export function lightBeacon(save: Save): Save {
  if (!canLightBeacon(save) || save.starfall?.beaconLit) return save;
  return {
    ...save,
    starfall: { fragments: [...save.starfall!.fragments], beaconLit: true },
  };
}
