import { describe, expect, it } from "vitest";
import { syncProject } from "../src/sync/driveSync";
import { BOOK, twoDevices } from "./fakeDrive";

const NOW = Date.parse("2026-10-04T12:00:00Z");

// What the sync must never do: write over text here, or empty a book.
describe("syncProject keeps the text here", () => {
  it("leaves a file that changed here during the download for the next sync", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });
    await cloud.writeAt("Penna/Isen.penna/scenes/S1.md", "Från telefonen.");
    const download = cloud.drive.download;
    cloud.drive.download = async (id) => {
      await computer.writeText(`${BOOK}/scenes/S1.md`, "Skrivet under synken.");
      return download(id);
    };

    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    cloud.drive.download = download;
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });

    expect(await computer.readText(`${BOOK}/scenes/S1.md`)).toBe("Skrivet under synken.");
    expect(await computer.readText(`${BOOK}/scenes/S1 (Drive 2026-10-04).md`)).toBe(
      "Från telefonen.",
    );
  });

  it("writes over a file here only through the guard", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    const guarded: string[] = [];

    await syncProject(phone, cloud.drive, BOOK, {
      now: NOW,
      guard: async (path, write) => {
        guarded.push(path);
        await write();
      },
    });

    expect(guarded.sort()).toEqual([`${BOOK}/project.json`, `${BOOK}/scenes/S1.md`]);
  });

  it("refuses to sync with a book folder in Drive that has gone empty", async () => {
    const { cloud, computer } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    cloud.drive.list = async () => [];

    await expect(syncProject(computer, cloud.drive, BOOK, { now: NOW })).rejects.toThrow();

    expect(await computer.readText(`${BOOK}/scenes/S1.md`)).toBe("Brevet låg där.");
  });

  it("gives a second conflict copy the same day a name of its own", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });
    for (const round of ["1", "2"]) {
      await cloud.writeAt("Penna/Isen.penna/scenes/S1.md", `Telefonen ${round}.`);
      await computer.writeText(`${BOOK}/scenes/S1.md`, `Datorn ${round}.`);
      await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    }

    const copies = (await computer.list(`${BOOK}/scenes`)).filter((name) => name.includes("Drive"));
    expect(copies.sort()).toEqual(["S1 (Drive 2026-10-04) 2.md", "S1 (Drive 2026-10-04).md"]);
  });
});
