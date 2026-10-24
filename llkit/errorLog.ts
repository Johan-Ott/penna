const KEPT = 20;
const KEY = "llkit.errors";

type Entry = { time: number; message: string };
/** What the last run left: its errors, and whether it was still running, that is, crashed. */
type Kept = { entries: Entry[]; isRunning: boolean };

// A place that outlives the app, as localStorage does; a test gives its own or none.
type Shelf = Pick<Storage, "getItem" | "setItem">;

function readKept(shelf: Shelf | null): Kept | null {
  try {
    const kept = JSON.parse(shelf?.getItem(KEY) ?? "null") as Kept | null;
    return kept && Array.isArray(kept.entries) ? kept : null;
  } catch {
    return null;
  }
}

// A full or blocked store loses only the copy; the errors stay in the report.
function writeKept(shelf: Shelf | null, kept: Kept) {
  try {
    shelf?.setItem(KEY, JSON.stringify(kept));
  } catch {
    return;
  }
}

// Read by a person: the app and device on one line, each error at the writer's own clock.
const reportOf = (entries: Entry[], info: { app: string; version: string; device: string }) => {
  const clock = (time: number) => new Date(time).toLocaleString("sv-SE").slice(0, 16);
  const lines = entries.map(({ time, message }) => `${clock(time)}  ${message}`);
  const errors = lines.length > 0 ? `Fel:\n${lines.join("\n")}` : "Inga fel sedan starten.";
  return `${info.app} ${info.version} · ${info.device}\n\n${errors}\n`;
};

/** The latest errors, kept on the device so they outlive a crash. Never sent by Skrivro itself. */
export function createErrorLog(now: () => number, shelf: Shelf | null = null) {
  const entries: Entry[] = [];
  let isRunning = false;
  const keep = () => writeKept(shelf, { entries, isRunning });
  return {
    record(message: string) {
      entries.push({ time: now(), message });
      if (entries.length > KEPT) entries.shift();
      keep();
    },
    /** At start: the errors of a run that ended without closing, which come first in the report. */
    start() {
      const last = readKept(shelf);
      const crashed = last?.isRunning && last.entries.length > 0 ? last.entries : [];
      entries.splice(0, entries.length, ...crashed.slice(-KEPT));
      isRunning = true;
      keep();
      return crashed.length > 0;
    },
    /** False while the app is put away or closed, as it should be; true again when it is back. */
    setRunning(running: boolean) {
      isRunning = running;
      keep();
    },
    /** Newest first. */
    latest: () => [...entries].reverse(),
    report: (info: { app: string; version: string; device: string }) => reportOf(entries, info),
  };
}

const deviceShelf = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const errorLog = createErrorLog(
  Date.now,
  typeof window === "undefined" ? null : deviceShelf(),
);

const messageOf = (reason: unknown) => (reason instanceof Error ? reason.message : String(reason));

/** A catch handler that keeps the error for the report, prefixed with what failed. */
export const recordFailure = (what: string) => (error: unknown) =>
  errorLog.record(`${what}: ${messageOf(error)}`);

let crashed = false;
/** The last run crashed with errors, which the report now begins with. */
export const crashedLastTime = () => crashed;

export function recordUncaughtErrors() {
  window.addEventListener("error", (event) => errorLog.record(event.message));
  window.addEventListener("unhandledrejection", (event) =>
    errorLog.record(messageOf(event.reason)),
  );
  // A phone closes an app put away without telling it, which is no crash.
  document.addEventListener("visibilitychange", () =>
    errorLog.setRunning(document.visibilityState === "visible"),
  );
  window.addEventListener("pagehide", () => errorLog.setRunning(false));
  crashed = errorLog.start();
}
