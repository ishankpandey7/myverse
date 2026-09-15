import { decodeSave, SAVE_KEY } from "./game.ts";
export const GUIDE_KEY = "myverse-guide-seen";
export function needsGuide() {
  try {
    return localStorage.getItem(GUIDE_KEY) !== "yes";
  } catch {
    return false;
  }
}
import type { Save } from "./game";
export type EditableKind = "missions" | "ideas" | "projects" | "milestones";
export function renameItem(
  save: Save,
  kind: EditableKind,
  id: string,
  title: string,
): Save {
  title = title.trim();
  if (!title || title.length > 160) return save;
  if (kind === "milestones") {
    if (!save.projects.some((p) => p.milestones.some((m) => m.id === id)))
      return save;
    return {
      ...save,
      projects: save.projects.map((p) => ({
        ...p,
        milestones: p.milestones.map((m) =>
          m.id === id ? { ...m, title } : m,
        ),
      })),
    };
  }
  if (!save[kind].some((item) => item.id === id)) return save;
  return {
    ...save,
    [kind]: save[kind].map((item) =>
      item.id === id ? { ...item, title } : item,
    ),
  };
}
export const BEFORE_RESTORE = "myverse-before-restore";
export const RAW_BEFORE_RESTORE = "myverse-raw-before-restore";
export function restoreGame(
  storage: Pick<Storage, "getItem" | "setItem">,
  incoming: Save,
  current: Save,
): string {
  try {
    const validated = decodeSave(JSON.stringify(incoming));
    const raw = storage.getItem(SAVE_KEY);
    // Save both the current session and any unreadable original before replacing it.
    if (raw !== null) storage.setItem(RAW_BEFORE_RESTORE, raw);
    storage.setItem(BEFORE_RESTORE, JSON.stringify(current));
    storage.setItem(SAVE_KEY, JSON.stringify(validated));
    return "";
  } catch {
    return "Restore could not be saved. Your current world has not been replaced. Download a backup and try again.";
  }
}
