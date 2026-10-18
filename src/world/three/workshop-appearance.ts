import { projectProgress } from "../../game.ts";
import type { Save } from "../../game";

export type WorkshopAppearance = { projectId: string; stage: number };

// The renderer receives only the chosen build's identity and visible stage.
// Titles, task counts and other projects belong to the React planning interface.
export function workshopAppearance(
  save: Save,
  requested: string,
): WorkshopAppearance {
  const project =
    save.projects.find((p) => p.id === requested && !p.archived) ??
    save.projects.find((p) => !p.archived);
  return {
    projectId: project?.id ?? "",
    stage: project ? projectProgress(save, project).stage : 0,
  };
}
