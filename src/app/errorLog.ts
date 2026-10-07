const KEPT = 20;

/** The latest errors in this session, for a report the writer copies and sends. Never sent. */
export function createErrorLog(now: () => number) {
  const entries: { time: number; message: string }[] = [];
  return {
    record(message: string) {
      entries.push({ time: now(), message });
      if (entries.length > KEPT) entries.shift();
    },
    /** Newest first. */
    latest: () => [...entries].reverse(),
    report({ version, device }: { version: string; device: string }) {
      const lines = entries.map(
        ({ time, message }) => `${new Date(time).toISOString()}  ${message}`,
      );
      const errors = lines.length > 0 ? lines.join("\n") : "Inga fel sedan starten.";
      return `Penna ${version}\n${device}\n\n${errors}\n`;
    },
  };
}

export const errorLog = createErrorLog(Date.now);

const messageOf = (reason: unknown) => (reason instanceof Error ? reason.message : String(reason));

/** A catch handler that keeps the error for the report, prefixed with what failed. */
export const recordFailure = (what: string) => (error: unknown) =>
  errorLog.record(`${what}: ${messageOf(error)}`);

export function recordUncaughtErrors() {
  window.addEventListener("error", (event) => errorLog.record(event.message));
  window.addEventListener("unhandledrejection", (event) =>
    errorLog.record(messageOf(event.reason)),
  );
}
