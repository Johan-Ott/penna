import { describe, expect, it } from "vitest";
import { createErrorLog } from "../src/app/errorLog";

describe("errorLog", () => {
  it("writes a report with the version, the device and the errors, newest last", () => {
    const log = createErrorLog(() => Date.parse("2026-10-05T10:00:00Z"));
    log.record("Kunde inte spara Köket");
    log.record("Drive svarade 500");

    const report = log.report({ version: "0.1.0", device: "Windows" });

    expect(report).toContain("Penna 0.1.0");
    expect(report).toContain("Windows");
    expect(report.indexOf("Kunde inte spara")).toBeLessThan(report.indexOf("Drive svarade"));
    expect(report).toContain("2026-10-05T10:00:00");
  });

  it("keeps only the latest twenty errors", () => {
    const log = createErrorLog(() => 0);

    for (let number = 1; number <= 25; number++) log.record(`fel ${number}`);
    const report = log.report({ version: "0.1.0", device: "Android" });

    expect(report).not.toContain("fel 5\n");
    expect(report).toContain("fel 6");
    expect(report).toContain("fel 25");
  });

  it("says so when nothing has gone wrong", () => {
    const log = createErrorLog(() => 0);

    expect(log.report({ version: "0.1.0", device: "Android" })).toContain("Inga fel");
  });
});
