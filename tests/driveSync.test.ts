import { describe, expect, it } from "vitest";
import { syncProject } from "../src/sync/driveSync";
import { BOOK, twoDevices } from "./fakeDrive";

const NOW = Date.parse("2026-10-04T12:00:00Z");

describe("syncProject", () => {
  it("puts a book in Penna/<book> in Drive, and brings it to another device", async () => {
    const { cloud, computer, phone } = twoDevices();

    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    expect(cloud.textAt("Penna/Isen.penna/scenes/S1.md")).toBe("Brevet låg där.");
    expect(await phone.readText(`${BOOK}/scenes/S1.md`)).toBe("Brevet låg där.");
  });

  it("sends what changed here and fetches what changed in Drive", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    await phone.writeText(`${BOOK}/scenes/S1.md`, "Brevet låg på bordet.");
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });

    expect(await computer.readText(`${BOOK}/scenes/S1.md`)).toBe("Brevet låg på bordet.");
  });

  it("keeps both texts when both devices changed the same scene, Drive's as a copy", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });
    await phone.writeText(`${BOOK}/scenes/S1.md`, "Från telefonen.");
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    await computer.writeText(`${BOOK}/scenes/S1.md`, "Från datorn.");
    const result = await syncProject(computer, cloud.drive, BOOK, { now: NOW });

    expect(await computer.readText(`${BOOK}/scenes/S1.md`)).toBe("Från datorn.");
    expect(await computer.readText(`${BOOK}/scenes/S1 (Drive 2026-10-04).md`)).toBe(
      "Från telefonen.",
    );
    expect(result.conflicts).toEqual(["scenes/S1.md"]);
  });

  it("merges project.json changed on both devices instead of keeping a copy", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });
    await phone.writeText(`${BOOK}/project.json`, '{"title":"Isen","dailyGoal":800}');
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    await computer.writeText(`${BOOK}/project.json`, '{"title":"Vintervägen"}');
    const result = await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    const merged = { title: "Vintervägen", dailyGoal: 800 };
    expect(JSON.parse(await computer.readText(`${BOOK}/project.json`))).toEqual(merged);
    expect(JSON.parse(await phone.readText(`${BOOK}/project.json`))).toEqual(merged);
    expect(result.conflicts).toEqual([]);
    expect(await computer.list(BOOK)).not.toContain("project (Drive 2026-10-04).json");
  });

  it("moves a file removed on one device to the trash on the other", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    await computer.rename(`${BOOK}/scenes/S1.md`, "/elsewhere/S1.md");
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    expect(cloud.isInTrash("Penna/Isen.penna/scenes/S1.md")).toBe(true);
    expect(await phone.list(`${BOOK}/scenes`)).toEqual([]);
    expect(await phone.readText(`${BOOK}/trash/S1.md`)).toBe("Brevet låg där.");
  });

  it("keeps a removed file that the other device changed in the meantime", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });
    await phone.writeText(`${BOOK}/scenes/S1.md`, "Ändrad på telefonen.");
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    await computer.rename(`${BOOK}/scenes/S1.md`, "/elsewhere/S1.md");
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });

    expect(await computer.readText(`${BOOK}/scenes/S1.md`)).toBe("Ändrad på telefonen.");
  });

  it("never sends a conflict copy to Drive", async () => {
    const { cloud, computer } = twoDevices();
    await computer.writeText(`${BOOK}/scenes/S1 (Drive 2026-10-04).md`, "Kopia.");

    await syncProject(computer, cloud.drive, BOOK, { now: NOW });

    expect(cloud.textAt("Penna/Isen.penna/scenes/S1 (Drive 2026-10-04).md")).toBeNull();
  });

  it("keeps the earlier text of a scene as a version before Drive's text replaces it", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });
    await phone.writeText(`${BOOK}/scenes/S1.md`, "Från telefonen.");
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    await syncProject(computer, cloud.drive, BOOK, { now: NOW });

    const versions = await computer.list(`${BOOK}/snapshots/S1`);
    expect(versions).toHaveLength(1);
    const version = await computer.readText(`${BOOK}/snapshots/S1/${versions[0] ?? ""}`);
    expect(version).toContain("Brevet låg där.");
  });

  it("brings a new scene written on the phone to the computer", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    await phone.writeText(`${BOOK}/scenes/S2.md`, "Isen bar.");
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });
    const result = await syncProject(computer, cloud.drive, BOOK, { now: NOW });

    expect(await computer.readText(`${BOOK}/scenes/S2.md`)).toBe("Isen bar.");
    expect(result.downloaded).toEqual(["scenes/S2.md"]);
  });

  it("finds nothing to do when both sides already have the same text", async () => {
    const { cloud, computer } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });

    const again = await syncProject(computer, cloud.drive, BOOK, { now: NOW });

    expect(again).toEqual({ uploaded: [], downloaded: [], conflicts: [], trashed: [] });
  });

  it("leaves its own memory and half-written files out of Drive", async () => {
    const { cloud, computer } = twoDevices();
    await computer.writeText(`${BOOK}/scenes/S1.md.penna-tmp`, "halv");

    await syncProject(computer, cloud.drive, BOOK, { now: NOW });

    expect(cloud.textAt("Penna/Isen.penna/.penna-sync.json")).toBeNull();
    expect(cloud.textAt("Penna/Isen.penna/scenes/S1.md.penna-tmp")).toBeNull();
  });
});
