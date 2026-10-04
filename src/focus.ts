export const FOCUS_KEY = "myverse-focus-v1";
export type FocusSession = {
  version: 1;
  missionId: string;
  durationMs: number;
  remainingMs: number;
  deadline: number | null;
  status: "running" | "paused" | "finished";
};
type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

export function startFocus(
  minutes: number,
  missionId: string,
  now: number,
): FocusSession | null {
  if (
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 120 ||
    !Number.isFinite(now)
  )
    return null;
  const durationMs = minutes * 60_000;
  return {
    version: 1,
    missionId,
    durationMs,
    remainingMs: durationMs,
    deadline: now + durationMs,
    status: "running",
  };
}
export function remainingFocus(session: FocusSession, now: number) {
  return session.status === "running"
    ? Math.max(0, Math.min(session.remainingMs, session.deadline! - now))
    : session.remainingMs;
}
export function advanceFocus(session: FocusSession, now: number): FocusSession {
  return session.status === "running" && remainingFocus(session, now) === 0
    ? { ...session, remainingMs: 0, deadline: null, status: "finished" }
    : session;
}
export function pauseFocus(session: FocusSession, now: number): FocusSession {
  const current = advanceFocus(session, now);
  return current.status === "running"
    ? {
        ...current,
        remainingMs: remainingFocus(current, now),
        deadline: null,
        status: "paused",
      }
    : current;
}
export function resumeFocus(session: FocusSession, now: number): FocusSession {
  return session.status === "paused"
    ? { ...session, deadline: now + session.remainingMs, status: "running" }
    : session;
}
export function formatFocus(milliseconds: number) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
export function readFocus(
  storage: Storage,
  now: number,
): { session: FocusSession | null; error: string } {
  try {
    const raw = storage.getItem(FOCUS_KEY);
    if (!raw) return { session: null, error: "" };
    const value = JSON.parse(raw) as Partial<FocusSession> | null;
    if (
      !value ||
      value.version !== 1 ||
      typeof value.missionId !== "string" ||
      !Number.isInteger(value.durationMs) ||
      value.durationMs! < 60_000 ||
      value.durationMs! > 120 * 60_000 ||
      !Number.isFinite(value.remainingMs) ||
      value.remainingMs! < 0 ||
      value.remainingMs! > value.durationMs! ||
      !["running", "paused", "finished"].includes(value.status ?? "") ||
      (value.status === "running"
        ? !Number.isFinite(value.deadline) ||
          value.remainingMs === 0 ||
          value.deadline! > now + value.remainingMs!
        : value.deadline !== null) ||
      (value.status === "finished"
        ? value.remainingMs !== 0
        : value.remainingMs === 0)
    )
      throw new Error();
    return { session: advanceFocus(value as FocusSession, now), error: "" };
  } catch {
    return {
      session: null,
      error:
        "The previous timer could not be recovered. You can start a new session.",
    };
  }
}
export function storeFocus(storage: Storage, session: FocusSession | null) {
  try {
    if (session) storage.setItem(FOCUS_KEY, JSON.stringify(session));
    else storage.removeItem(FOCUS_KEY);
    return "";
  } catch {
    return "Timer recovery is unavailable. It still works while this page stays open.";
  }
}
