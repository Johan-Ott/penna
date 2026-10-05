import { describe, expect, it } from "vitest";
import { syncProject } from "../src/sync/driveSync";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";
import { createFakeDrive } from "./fakeDrive";

const BOOK = "/Penna/Isen.penna";
const NOW = Date.parse("2026-10-04T12:00:00Z");

function twoDevices() {
  const cloud = createFakeDrive();
  const computer = createMemoryFileSystem({
    [`${BOOK}/project.json`]: '{"title":"Isen"}',
    [`${BOOK}/scenes/S1.md`]: "Brevet låg där.",
  });
  const phone = createMemoryFileSystem({});
  return { cloud, computer, phone };
}

describe("syncProject", () => {
  it("puts a book in Penna/<book> in Drive, and brings it to another device", async () => {
    const { cloud, computer, phone } = twoDevices();

    await syncProject(computer, cloud.drive, BOOK, NOW);
    await syncProject(phone, cloud.drive, BOOK, NOW);

    expect(cloud.textAt("Penna/Isen.penna/scenes/S1.md")).toBe("Brevet låg där.");
    expect(await phone.readText(`${BOOK}/scenes/S1.md`)).toBe("Brevet låg där.");
  });

  it("sends what changed here and fetches what changed in Drive", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, NOW);
    await syncProject(phone, cloud.drive, BOOK, NOW);

    await phone.writeText(`${BOOK}/scenes/S1.md`, "Brevet låg på bordet.");
    await syncProject(phone, cloud.drive, BOOK, NOW);
    await syncProject(computer, cloud.drive, BOOK, NOW);

    expect(await computer.readText(`${BOOK}/scenes/S1.md`)).toBe("Brevet låg på bordet.");
  });

  it("keeps both texts when both devices changed the same scene, Drive's as a copy", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, NOW);
    await syncProject(phone, cloud.drive, BOOK, NOW);
    await phone.writeText(`${BOOK}/scenes/S1.md`, "Från telefonen.");
    await syncProject(phone, cloud.drive, BOOK, NOW);

    await computer.writeText(`${BOOK}/scenes/S1.md`, "Från datorn.");
    const result = await syncProject(computer, cloud.drive, BOOK, NOW);

    expect(await computer.readText(`${BOOK}/scenes/S1.md`)).toBe("Från datorn.");
    expect(await computer.readText(`${BOOK}/scenes/S1 (Drive 2026-10-04).md`)).toBe(
      "Från telefonen.",
    );
    expect(result.conflicts).toEqual(["scenes/S1.md"]);
  });

  it("brings a new scene written on the phone to the computer", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, NOW);
    await syncProject(phone, cloud.drive, BOOK, NOW);

    await phone.writeText(`${BOOK}/scenes/S2.md`, "Isen bar.");
    await syncProject(phone, cloud.drive, BOOK, NOW);
    const result = await syncProject(computer, cloud.drive, BOOK, NOW);

    expect(await computer.readText(`${BOOK}/scenes/S2.md`)).toBe("Isen bar.");
    expect(result.downloaded).toEqual(["scenes/S2.md"]);
  });

  it("finds nothing to do when both sides already have the same text", async () => {
    const { cloud, computer } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, NOW);

    const again = await syncProject(computer, cloud.drive, BOOK, NOW);

    expect(again).toEqual({ uploaded: [], downloaded: [], conflicts: [] });
  });

  it("leaves its own memory and half-written files out of Drive", async () => {
    const { cloud, computer } = twoDevices();
    await computer.writeText(`${BOOK}/scenes/S1.md.penna-tmp`, "halv");

    await syncProject(computer, cloud.drive, BOOK, NOW);

    expect(cloud.textAt("Penna/Isen.penna/.penna-sync.json")).toBeNull();
    expect(cloud.textAt("Penna/Isen.penna/scenes/S1.md.penna-tmp")).toBeNull();
  });
});
