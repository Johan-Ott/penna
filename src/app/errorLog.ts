const KEPT = 20;

/** The latest errors in this session, for a report the writer copies and sends. Never sent. */
export function createErrorLog(now: () => number) {
  const entries: string[] = [];
  return {
    record(message: string) {
      entries.push(`${new Date(now()).toISOString()}  ${message}`);
      if (entries.length > KEPT) entries.shift();
    },
    report({ version, device }: { version: string; device: string }) {
      const errors = entries.length > 0 ? entries.join("\n") : "Inga fel sedan starten.";
      return `Penna ${version}\n${device}\n\n${errors}\n`;
    },
  };
}

export const errorLog = createErrorLog(Date.now);

const messageOf = (reason: unknown) => (reason instanceof Error ? reason.message : String(reason));

export function recordUncaughtErrors() {
  window.addEventListener("error", (event) => errorLog.record(event.message));
  window.addEventListener("unhandledrejection", (event) =>
    errorLog.record(messageOf(event.reason)),
  );
}
