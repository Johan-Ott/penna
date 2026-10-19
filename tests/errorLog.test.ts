import { describe, expect, it } from "vitest";
import { createErrorLog } from "@llkit/errorLog.js";

describe("errorLog", () => {
  it("writes a report with the version, the device and the errors, newest last", () => {
    const log = createErrorLog(() => Date.parse("2026-10-05T10:00:00Z"));
    log.record("Kunde inte spara Köket");
    log.record("Drive svarade 500");

    const report = log.report({ app: "Penna", version: "0.1.0", device: "Windows" });

    expect(report).toContain("Penna 0.1.0");
    expect(report).toContain("Windows");
    expect(report.indexOf("Kunde inte spara")).toBeLessThan(report.indexOf("Drive svarade"));
    expect(report).toContain("2026-10-05T10:00:00");
  });

  it("shows the errors newest first, each with its time", () => {
    const log = createErrorLog(() => 5);
    log.record("Först");
    log.record("Sedan");

    expect(log.latest()).toEqual([
      { time: 5, message: "Sedan" },
      { time: 5, message: "Först" },
    ]);
  });

  it("keeps only the latest twenty errors", () => {
    const log = createErrorLog(() => 0);

    for (let number = 1; number <= 25; number++) log.record(`fel ${number}`);
    const report = log.report({ app: "Penna", version: "0.1.0", device: "Android" });

    expect(report).not.toContain("fel 5\n");
    expect(report).toContain("fel 6");
    expect(report).toContain("fel 25");
  });

  it("says so when nothing has gone wrong", () => {
    const log = createErrorLog(() => 0);

    expect(log.report({ app: "Penna", version: "0.1.0", device: "Android" })).toContain("Inga fel");
  });

  const shelf = () => {
    const items = new Map<string, string>();
    return {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
    };
  };

  it("brings the errors of a run that crashed into the next run's report", () => {
    const device = shelf();
    const first = createErrorLog(() => 0, device);
    first.start();
    first.record("Kunde inte spara Köket");

    const next = createErrorLog(() => 0, device);

    expect(next.start()).toBe(true);
    expect(next.report({ app: "Penna", version: "0.4.4", device: "Android" })).toContain(
      "Kunde inte spara Köket",
    );
  });

  it("starts empty after a run that was put away or closed as it should", () => {
    const device = shelf();
    const first = createErrorLog(() => 0, device);
    first.start();
    first.record("Drive svarade 500");
    first.setRunning(false);

    const next = createErrorLog(() => 0, device);

    expect(next.start()).toBe(false);
    expect(next.latest()).toEqual([]);
  });
});
