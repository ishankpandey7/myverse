import { decodeSave, freshSave, persistGame, SAVE_KEY } from "./game.ts";
import type { Save } from "./game";
import { BEFORE_RESTORE, RAW_BEFORE_RESTORE, restoreGame } from "./polish.ts";

export type SaveStatus =
  | "saved"
  | "saving"
  | "conflict"
  | "protected"
  | "unavailable";
export type SessionState = {
  save: Save;
  status: SaveStatus;
  message: string;
  dirty: boolean;
  busy: boolean;
  epoch: number;
};
export type WorldPreview = {
  save: Save;
  raw: string | null;
  serial: number;
  epoch: number;
  recoveryRaw?: string;
};
export type SaveResult =
  | { ok: true }
  | { ok: false; message: string; stale?: boolean };
type StorageLike = Pick<Storage, "getItem" | "setItem">;
type Options = {
  storage: () => StorageLike;
  exclusive?: (operation: () => void) => Promise<unknown>;
  onReplace?: () => void;
};
const unavailable =
  "Safe saving is unavailable. Keep this tab open and download this session's backup.";
const conflict =
  "Another tab changed the saved world. Your changes are kept in this tab. Review the saved world before continuing.";
const stale =
  "The saved world or this session changed. Refresh the preview and review it again.";

// Every application write, including recovery copies, goes through this coordinator.
// The lock serializes cooperating tabs; the raw base detects a stale valid snapshot.
export function createSaveSession(options: Options) {
  let base: string | null = null,
    serial = 0,
    tail = Promise.resolve();
  let state: SessionState = {
    save: freshSave(),
    status: options.exclusive ? "saved" : "unavailable",
    message: options.exclusive ? "" : unavailable,
    dirty: false,
    busy: false,
    epoch: 0,
  };
  try {
    base = options.storage().getItem(SAVE_KEY);
    if (base !== null) {
      try {
        state.save = decodeSave(base);
      } catch (error) {
        state.status = "protected";
        state.message = String((error as Error).message);
      }
    }
  } catch {
    state.status = "unavailable";
    state.message = unavailable;
  }
  const listeners = new Set<() => void>();
  function publish(change: Partial<SessionState>) {
    state = { ...state, ...change };
    listeners.forEach((listener) => listener());
  }
  function enqueue<T>(work: () => T | Promise<T>): Promise<T> {
    const result = tail.then(work);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  async function locked<T>(work: () => T): Promise<T> {
    if (!options.exclusive) throw new Error(unavailable);
    let result: T;
    await options.exclusive(() => {
      result = work();
    });
    return result!;
  }
  function protectRaw(raw: string | null) {
    if (raw === null) return true;
    try {
      decodeSave(raw);
      return true;
    } catch (error) {
      publish({ status: "protected", message: (error as Error).message });
      return false;
    }
  }
  function write(save: Save, changeSerial: number, epoch: number) {
    return enqueue(async () => {
      if (state.epoch !== epoch || state.busy || state.status !== "saving")
        return;
      try {
        await locked(() => {
          if (state.epoch !== epoch || state.status !== "saving") return;
          const storage = options.storage(),
            raw = storage.getItem(SAVE_KEY);
          if (!protectRaw(raw)) return;
          if (raw !== base) {
            publish({ status: "conflict", message: conflict });
            return;
          }
          decodeSave(JSON.stringify(save));
          const error = persistGame(storage, save);
          if (error) {
            publish({ status: "unavailable", message: error });
            return;
          }
          base = JSON.stringify(save);
          if (serial === changeSerial)
            publish({ dirty: false, status: "saved", message: "" });
        });
      } catch {
        publish({ status: "unavailable", message: unavailable });
      }
    });
  }
  function update(transform: (previous: Save) => Save) {
    if (state.busy) return false;
    const next = transform(state.save);
    if (next === state.save) return false;
    serial++;
    const canWrite = state.status === "saved" || state.status === "saving";
    publish({
      save: next,
      dirty: true,
      ...(canWrite ? { status: "saving", message: "" } : {}),
    });
    if (canWrite) void write(next, serial, state.epoch);
    return true;
  }
  function checkExternal() {
    return enqueue(async () => {
      if (state.busy) return;
      try {
        const inspect = () => {
          const raw = options.storage().getItem(SAVE_KEY);
          if (!protectRaw(raw)) return;
          if (raw === base) {
            if (!state.dirty && options.exclusive && state.status !== "saved")
              publish({ status: "saved", message: "" });
            return;
          }
          if (state.dirty) {
            publish({ status: "conflict", message: conflict });
            return;
          }
          const save = raw === null ? freshSave() : decodeSave(raw);
          base = raw;
          serial++;
          publish({
            save,
            status: options.exclusive ? "saved" : "unavailable",
            message: options.exclusive ? "" : unavailable,
          });
        };
        if (options.exclusive) await locked(inspect);
        else inspect();
      } catch {
        publish({ status: "unavailable", message: unavailable });
      }
    });
  }
  function preview(source: Save | "saved" | "recovery") {
    return enqueue(async (): Promise<WorldPreview> => {
      const read = () => {
        const storage = options.storage(),
          raw = storage.getItem(SAVE_KEY);
        const recoveryRaw =
          source === "recovery" ? storage.getItem(BEFORE_RESTORE) : undefined;
        if (source === "recovery" && !recoveryRaw)
          throw new Error("No previous restore to recover yet.");
        const save =
          source === "saved"
            ? raw === null
              ? freshSave()
              : decodeSave(raw)
            : source === "recovery"
              ? decodeSave(recoveryRaw!)
              : decodeSave(JSON.stringify(source));
        return {
          save,
          raw,
          serial,
          epoch: state.epoch,
          ...(recoveryRaw ? { recoveryRaw } : {}),
        };
      };
      return options.exclusive ? locked(read) : read();
    });
  }
  function replace(
    preview: WorldPreview,
    loadOnly = false,
  ): Promise<SaveResult> {
    if (state.busy)
      return Promise.resolve({
        ok: false,
        message: "A world change is already in progress.",
      });
    // Block new commands while awaiting the lock. Earlier queued writes are either
    // skipped (the replacement preserves their in-memory world) or already finished.
    publish({ busy: true });
    return enqueue(async () => {
      try {
        return await locked((): SaveResult => {
          const storage = options.storage(),
            raw = storage.getItem(SAVE_KEY);
          if (
            raw !== preview.raw ||
            serial !== preview.serial ||
            state.epoch !== preview.epoch ||
            (preview.recoveryRaw !== undefined &&
              storage.getItem(BEFORE_RESTORE) !== preview.recoveryRaw)
          )
            return { ok: false, stale: true, message: stale };
          const incoming = loadOnly
            ? raw === null
              ? freshSave()
              : decodeSave(raw)
            : decodeSave(JSON.stringify(preview.save));
          if (loadOnly) {
            if (state.dirty) {
              if (raw !== null) storage.setItem(RAW_BEFORE_RESTORE, raw);
              storage.setItem(BEFORE_RESTORE, JSON.stringify(state.save));
            }
          } else {
            const error = restoreGame(storage, incoming, state.save);
            if (error) return { ok: false, message: error };
          }
          base = loadOnly ? raw : JSON.stringify(incoming);
          serial++;
          try {
            options.onReplace?.();
          } catch {
            /* Optional timer recovery may be unavailable. */
          }
          publish({
            save: incoming,
            dirty: false,
            status: "saved",
            message: "",
            epoch: state.epoch + 1,
          });
          return { ok: true };
        });
      } catch {
        return {
          ok: false,
          message: options.exclusive
            ? "This world could not be loaded or saved. Your session is kept. Download a backup and try again."
            : unavailable,
        };
      } finally {
        publish({ busy: false });
        // A rejected preview must not leave skipped ordinary saves marked 'saving'.
        if (state.dirty && state.status === "saving")
          void write(state.save, serial, state.epoch);
      }
    });
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update,
    checkExternal,
    preview,
    restore: (value: WorldPreview) => replace(value),
    loadSaved: (value: WorldPreview) => replace(value, true),
    retry() {
      if (state.busy) return;
      if (!state.dirty) {
        void checkExternal();
        return;
      }
      publish({ status: "saving", message: "" });
      void write(state.save, serial, state.epoch);
    },
    idle: () => tail,
  };
}

export type SaveSession = ReturnType<typeof createSaveSession>;
