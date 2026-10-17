import { useEffect, useState, useSyncExternalStore } from "react";
import { createSaveSession } from "./saveRepository";
import { SAVE_KEY } from "./game";
import { storeFocus } from "./focus";

export function useGameSession() {
  const [session] = useState(() =>
    createSaveSession({
      storage: () => localStorage,
      onReplace: () => {
        storeFocus(sessionStorage, null);
      },
      exclusive: navigator.locks?.request
        ? (operation) =>
            navigator.locks.request("myverse-world-write", operation)
        : undefined,
    }),
  );
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => {
    const storage = (event: StorageEvent) => {
      // sessionStorage events and other applications' keys are unrelated.
      try {
        if (
          event.storageArea === localStorage &&
          (event.key === SAVE_KEY || event.key === null)
        )
          void session.checkExternal();
      } catch {
        /* Resume/retry also checks storage availability. */
      }
    };
    const resume = () => {
      if (!document.hidden) void session.checkExternal();
    };
    window.addEventListener("storage", storage);
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", resume);
    void session.checkExternal();
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [session]);
  useEffect(() => {
    if (!state.dirty && !state.busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.dirty, state.busy]);
  return { session, ...state };
}
