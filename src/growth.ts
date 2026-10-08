import type { Save } from "./game";

export const SKILLS = {
  craft: {
    name: "Craft",
    symbol: "⚒",
    color: "#e4b099",
    plant: "Ember lily",
    hint: "Build, practise, make something yours.",
  },
  curiosity: {
    name: "Curiosity",
    symbol: "✧",
    color: "#b9b0ec",
    plant: "Astral fern",
    hint: "Read, explore, follow a question.",
  },
  wellbeing: {
    name: "Wellbeing",
    symbol: "❋",
    color: "#9cceb0",
    plant: "Moonleaf",
    hint: "Move, rest, care for yourself.",
  },
} as const;
export type SkillId = keyof typeof SKILLS;
export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];
export const STAGES = [
  { name: "Seed", at: 0 },
  { name: "Sprout", at: 1 },
  { name: "Sapling", at: 3 },
  { name: "In bloom", at: 6 },
] as const;
export const ACHIEVEMENTS = {
  "first-step": {
    name: "A beginning",
    symbol: "✦",
    description: "Complete your first real mission.",
    target: 1,
  },
  pathfinder: {
    name: "A trail of small wins",
    symbol: "⌁",
    description: "Complete 10 real missions.",
    target: 10,
  },
  cultivator: {
    name: "Patient hands",
    symbol: "❧",
    description: "Grow any path through 3 completed missions.",
    target: 3,
  },
  "in-bloom": {
    name: "Living proof",
    symbol: "❋",
    description: "Bring one plant into bloom with 6 completed missions.",
    target: 6,
  },
  balanced: {
    name: "Room for all of you",
    symbol: "◈",
    description: "Complete at least one mission in each growth path.",
    target: 3,
  },
  builder: {
    name: "From dream to done",
    symbol: "⚒",
    description: "Finish every task in a project with no empty milestones.",
    target: 1,
  },
  stargazer: {
    name: "The night remembers",
    symbol: "☄",
    description: "Awaken the Starfall beacon.",
    target: 1,
  },
} as const;
export type AchievementId = keyof typeof ACHIEVEMENTS;
export type GrowthRecord = { earned: AchievementId[] };
export function validSkill(value: unknown): value is SkillId {
  return typeof value === "string" && Object.hasOwn(SKILLS, value);
}
export function validGrowth(value: unknown): value is GrowthRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const earned = (value as Record<string, unknown>).earned;
  return (
    Array.isArray(earned) &&
    earned.every(
      (id) => typeof id === "string" && Object.hasOwn(ACHIEVEMENTS, id),
    ) &&
    new Set(earned).size === earned.length
  );
}
export function gardenProgress(save: Save) {
  const counts = {
    craft: { done: 0, total: 0 },
    curiosity: { done: 0, total: 0 },
    wellbeing: { done: 0, total: 0 },
  };
  for (const mission of save.missions) {
    if (!mission.skill) continue;
    counts[mission.skill].total++;
    if (mission.done) counts[mission.skill].done++;
  }
  return SKILL_IDS.map((id) => {
    const { done, total } = counts[id],
      stage = done >= 6 ? 3 : done >= 3 ? 2 : done >= 1 ? 1 : 0;
    const next = STAGES[stage + 1];
    return {
      id,
      ...SKILLS[id],
      done,
      total,
      stage,
      stageName: STAGES[stage].name,
      next,
      progress: next
        ? (done - STAGES[stage].at) / (next.at - STAGES[stage].at)
        : 1,
    };
  });
}
export function galleryProgress(save: Save) {
  const paths = gardenProgress(save),
    done = new Set(save.missions.filter((m) => m.done).map((m) => m.id));
  const finishedProject = save.projects.some(
    (p) =>
      p.milestones.length > 0 &&
      p.milestones.every(
        (m) => m.taskIds.length > 0 && m.taskIds.every((id) => done.has(id)),
      ),
  );
  const values: Record<AchievementId, number> = {
    "first-step": done.size,
    pathfinder: done.size,
    cultivator: Math.max(...paths.map((p) => p.done)),
    "in-bloom": Math.max(...paths.map((p) => p.done)),
    balanced: paths.filter((p) => p.done > 0).length,
    builder: Number(finishedProject),
    stargazer: Number(save.starfall?.beaconLit === true),
  };
  return (Object.keys(ACHIEVEMENTS) as AchievementId[]).map((id) => ({
    id,
    ...ACHIEVEMENTS[id],
    value: Math.min(values[id], ACHIEVEMENTS[id].target),
    earned:
      save.growth?.earned.includes(id) === true ||
      values[id] >= ACHIEVEMENTS[id].target,
  }));
}
export function recordAchievements(save: Save): Save {
  const previous = save.growth?.earned ?? [],
    extra = galleryProgress(save)
      .filter((a) => a.earned && !previous.includes(a.id))
      .map((a) => a.id);
  return extra.length
    ? { ...save, growth: { earned: [...previous, ...extra] } }
    : save;
}
export function assignSkill(save: Save, id: string, skill: SkillId | ""): Save {
  if (
    (skill !== "" && !validSkill(skill)) ||
    !save.missions.some((m) => m.id === id && (m.skill ?? "") !== skill)
  )
    return save;
  save = recordAchievements(save);
  return recordAchievements({
    ...save,
    missions: save.missions.map((m) => {
      if (m.id !== id) return m;
      const next = { ...m };
      if (skill) next.skill = skill;
      else delete next.skill;
      return next;
    }),
  });
}
export function planGrowthMission(
  save: Save,
  id: string,
  title: string,
  skill: SkillId,
): Save {
  title = title.trim();
  if (
    !id ||
    !title ||
    title.length > 160 ||
    !validSkill(skill) ||
    [...save.missions, ...save.ideas].some((m) => m.id === id)
  )
    return save;
  return {
    ...save,
    missions: [...save.missions, { id, title, done: false, skill }],
  };
}
