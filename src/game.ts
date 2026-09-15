export type Entry = { id: string; title: string; done: boolean };
export const OUTFITS = {
  twilight: {
    name: "Twilight",
    coat: "#c499b2",
    hat: "#8e84b7",
    trim: "#b3a7d4",
  },
  sage: {
    name: "Forest sage",
    coat: "#80ad96",
    hat: "#507e76",
    trim: "#aad0ab",
  },
  ember: {
    name: "Amber dusk",
    coat: "#cd926d",
    hat: "#a36d66",
    trim: "#edbe8d",
  },
  ocean: {
    name: "Ocean blue",
    coat: "#80a6c7",
    hat: "#5d729c",
    trim: "#bad0e2",
  },
} as const;
export const SKINS = {
  warm: "#efd0b0",
  golden: "#c99267",
  deep: "#865942",
} as const;
export type Avatar = {
  name: string;
  outfit: keyof typeof OUTFITS;
  skin: keyof typeof SKINS;
  hat: "wizard" | "beanie" | "none";
};
export const REWARDS = {
  lantern: {
    name: "Wish lantern",
    xp: 25,
    description: "A warm light for your first small victory.",
  },
  flowers: {
    name: "Moonflower patch",
    xp: 75,
    description: "A little garden, grown from your effort.",
  },
  crystal: {
    name: "Stargazer crystal",
    xp: 150,
    description: "A piece of the night sky to call your own.",
  },
} as const;
export type RewardId = keyof typeof REWARDS;
export const PLOTS = {
  garden: { name: "Home garden", x: 370, y: 550 },
  ridge: { name: "Stargazer ridge", x: 850, y: 345 },
  pond: { name: "Pond overlook", x: 1000, y: 560 },
  meadow: { name: "Quiet meadow", x: 600, y: 640 },
} as const;
export type PlotId = keyof typeof PLOTS;
export type Project = {
  archived?: boolean;
  id: string;
  title: string;
  milestones: { id: string; title: string; taskIds: string[] }[];
};
export type Save = {
  version: 3;
  projects: Project[];
  missions: Entry[];
  ideas: Entry[];
  avatar: Avatar;
  decorations: Partial<Record<RewardId, PlotId>>;
};
export const SAVE_KEY = "myverse-save-v1"; // Keep the original key so existing worlds migrate in place.
export const defaultAvatar: Avatar = {
  name: "World builder",
  outfit: "twilight",
  skin: "warm",
  hat: "wizard",
};
export function freshSave(): Save {
  return {
    version: 3,
    projects: [],
    missions: [],
    ideas: [],
    avatar: { ...defaultAvatar },
    decorations: {},
  };
}
export const totalXP = (save: Save) =>
  save.missions.filter((item) => item.done).length * 25;
export const unlockedRewards = (save: Save) =>
  (Object.keys(REWARDS) as RewardId[]).filter(
    (id) => totalXP(save) >= REWARDS[id].xp,
  );
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const member = <T extends object>(
  value: unknown,
  options: T,
): value is keyof T =>
  typeof value === "string" && Object.hasOwn(options, value);
function entries(value: unknown): value is Entry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        record(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.done === "boolean",
    ) &&
    new Set(value.map((item) => item.id)).size === value.length
  );
}
export function validAvatar(value: unknown): value is Avatar {
  return (
    record(value) &&
    typeof value.name === "string" &&
    !!value.name.trim() &&
    value.name.length <= 24 &&
    member(value.outfit, OUTFITS) &&
    member(value.skin, SKINS) &&
    ["wizard", "beanie", "none"].includes(value.hat as string)
  );
}
export function decodeSave(raw: string): Save {
  const value: unknown = JSON.parse(raw);
  if (!record(value) || !entries(value.missions) || !entries(value.ideas))
    throw new Error(
      "The saved world could not be read. Its original data has been kept.",
    );
  if (value.version === 1)
    return { ...freshSave(), missions: value.missions, ideas: value.ideas };
  if (value.version !== 2 && value.version !== 3)
    throw new Error(
      "This save uses an unsupported version. Its original data has been kept.",
    );
  if (!validAvatar(value.avatar) || !record(value.decorations))
    throw new Error(
      "The saved world could not be read. Its original data has been kept.",
    );
  const pairs = Object.entries(value.decorations);
  const xp = value.missions.filter((item) => item.done).length * 25;
  if (
    pairs.some(
      ([id, plot]) =>
        !member(id, REWARDS) || !member(plot, PLOTS) || xp < REWARDS[id].xp,
    ) ||
    new Set(pairs.map(([, plot]) => plot)).size !== pairs.length
  )
    throw new Error(
      "The saved decorations could not be read. Their original data has been kept.",
    );
  const projects = value.version === 2 ? [] : value.projects;
  if (!validProjects(projects, value.missions))
    throw new Error(
      "The saved projects could not be read. Their original data has been kept.",
    );
  return {
    version: 3,
    projects,
    missions: value.missions,
    ideas: value.ideas,
    avatar: value.avatar,
    decorations: value.decorations as Save["decorations"],
  };
}
type StorageLike = Pick<Storage, "getItem" | "setItem">;
export function loadGame(storage: StorageLike): { save: Save; error: string } {
  try {
    const raw = storage.getItem(SAVE_KEY);
    return { save: raw === null ? freshSave() : decodeSave(raw), error: "" };
  } catch (error) {
    return {
      save: freshSave(),
      error:
        error instanceof Error
          ? error.message
          : "Saving is unavailable in this browser.",
    };
  }
}
export function persistGame(storage: StorageLike, save: Save): string {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw !== null) {
      decodeSave(raw); // Never replace an unreadable or newer save with a fresh world.
      const version = JSON.parse(raw).version;
      if (
        version < 3 &&
        storage.getItem(`${SAVE_KEY}-backup-v${version}`) === null
      )
        storage.setItem(`${SAVE_KEY}-backup-v${version}`, raw);
    }
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return "";
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "Saving is unavailable. Keep this tab open.";
  }
}
export function completeMission(save: Save, id: string): Save {
  if (!save.missions.some((item) => item.id === id && !item.done)) return save;
  return {
    ...save,
    missions: save.missions.map((item) =>
      item.id === id ? { ...item, done: true } : item,
    ),
  };
}
export function promoteIdea(save: Save, id: string): Save {
  const idea = save.ideas.find((item) => item.id === id);
  if (!idea || save.missions.some((item) => item.id === id)) return save;
  return {
    ...save,
    ideas: save.ideas.filter((item) => item.id !== id),
    missions: [...save.missions, { ...idea, done: false }],
  };
}
export function placeReward(save: Save, id: RewardId, plot: PlotId): Save {
  if (
    !member(id, REWARDS) ||
    !member(plot, PLOTS) ||
    !unlockedRewards(save).includes(id)
  )
    return save;
  if (
    Object.entries(save.decorations).some(
      ([other, occupied]) => other !== id && occupied === plot,
    )
  )
    return save;
  return { ...save, decorations: { ...save.decorations, [id]: plot } };
}
export function removeReward(save: Save, id: RewardId): Save {
  const decorations = { ...save.decorations };
  delete decorations[id];
  return { ...save, decorations };
}
function validProjects(value: unknown, missions: Entry[]): value is Project[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>(),
    tasks = new Set<string>();
  const title = (s: unknown) =>
    typeof s === "string" && !!s.trim() && s.length <= 160;
  const unique = (id: unknown) => {
    if (typeof id !== "string" || !id || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  return value.every(
    (p) =>
      record(p) &&
      unique(p.id) &&
      title(p.title) &&
      (p.archived === undefined || typeof p.archived === "boolean") &&
      Array.isArray(p.milestones) &&
      p.milestones.every((m) => {
        if (
          !record(m) ||
          !unique(m.id) ||
          !title(m.title) ||
          !Array.isArray(m.taskIds)
        )
          return false;
        return m.taskIds.every((id) => {
          if (
            typeof id !== "string" ||
            tasks.has(id) ||
            !missions.some((task) => task.id === id)
          )
            return false;
          tasks.add(id);
          return true;
        });
      }),
  );
}
export function createProject(save: Save, id: string, title: string): Save {
  if (
    !id ||
    !title.trim() ||
    title.trim().length > 160 ||
    save.projects.some(
      (p) => p.id === id || p.milestones.some((m) => m.id === id),
    )
  )
    return save;
  return {
    ...save,
    projects: [...save.projects, { id, title: title.trim(), milestones: [] }],
  };
}
export function addMilestone(
  save: Save,
  projectId: string,
  id: string,
  title: string,
): Save {
  if (
    !id ||
    !title.trim() ||
    title.trim().length > 160 ||
    !save.projects.some((p) => p.id === projectId) ||
    save.projects.some(
      (p) => p.id === id || p.milestones.some((m) => m.id === id),
    )
  )
    return save;
  return {
    ...save,
    projects: save.projects.map((p) =>
      p.id === projectId
        ? {
            ...p,
            milestones: [
              ...p.milestones,
              { id, title: title.trim(), taskIds: [] },
            ],
          }
        : p,
    ),
  };
}
export function addProjectTask(
  save: Save,
  projectId: string,
  milestoneId: string,
  id: string,
  title: string,
): Save {
  if (
    !id ||
    !title.trim() ||
    title.trim().length > 160 ||
    save.missions.some((m) => m.id === id) ||
    !save.projects.some(
      (p) =>
        p.id === projectId && p.milestones.some((m) => m.id === milestoneId),
    )
  )
    return save;
  return {
    ...save,
    missions: [...save.missions, { id, title: title.trim(), done: false }],
    projects: save.projects.map((p) =>
      p.id === projectId
        ? {
            ...p,
            milestones: p.milestones.map((m) =>
              m.id === milestoneId ? { ...m, taskIds: [...m.taskIds, id] } : m,
            ),
          }
        : p,
    ),
  };
}
export function projectProgress(save: Save, project: Project) {
  const ids = project.milestones.flatMap((m) => m.taskIds);
  const done = ids.filter((id) =>
    save.missions.some((task) => task.id === id && task.done),
  ).length;
  const milestones = project.milestones.filter(
    (m) =>
      m.taskIds.length > 0 &&
      m.taskIds.every((id) =>
        save.missions.some((task) => task.id === id && task.done),
      ),
  ).length;
  const complete =
    project.milestones.length > 0 && milestones === project.milestones.length;
  return {
    total: ids.length,
    done,
    milestones,
    complete,
    percent: ids.length ? Math.round((done / ids.length) * 100) : 0,
    stage: complete ? 3 : done > 0 ? 2 : ids.length > 0 ? 1 : 0,
  };
}

// Optional archive state keeps existing v3 worlds compatible.
export function archiveProject(save: Save, id: string, archived: boolean): Save {
  const project = save.projects.find((p) => p.id === id);
  if (!project || !!project.archived === archived) return save;
  return { ...save, projects: save.projects.map((p) => p.id === id ? { ...p, archived } : p) };
}
export function projectFromIdea(save: Save, id: string): Save {
  const idea = save.ideas.find((item) => item.id === id);
  if (!idea) return save;
  const next = createProject(save, id, idea.title);
  if (next === save) return save;
  return { ...next, ideas: next.ideas.filter((item) => item.id !== id) };
}
