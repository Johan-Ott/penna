import { describe, expect, it } from "vitest";
import { syncProject } from "../src/sync/driveSync";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { BOOK, twoDevices } from "./fakeDrive";

const NOW = Date.parse("2026-10-04T12:00:00Z");

// What the sync must never do: write over text here, or empty a book.
describe("syncProject keeps the text here", () => {
  it("leaves a file that changed here during the download for the next sync", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    await syncProject(phone, cloud.drive, BOOK, { now: NOW });
    await cloud.writeAt("Skrivro/Isen.penna/scenes/S1.md", "Från telefonen.");
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
      await cloud.writeAt("Skrivro/Isen.penna/scenes/S1.md", `Telefonen ${round}.`);
      await computer.writeText(`${BOOK}/scenes/S1.md`, `Datorn ${round}.`);
      await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    }

    const copies = (await computer.list(`${BOOK}/scenes`)).filter((name) => name.includes("Drive"));
    expect(copies.sort()).toEqual(["S1 (Drive 2026-10-04) 2.md", "S1 (Drive 2026-10-04).md"]);
  });
});

describe("syncProject keeps two books apart", () => {
  it("gives a different book with the same name a Drive folder of its own", async () => {
    const { cloud, computer } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    const other = createMemoryFileSystem({
      [`${BOOK}/project.json`]: '{"title":"Isen, en annan"}',
      [`${BOOK}/scenes/T1.md`]: "En helt annan bok.",
    });

    await syncProject(other, cloud.drive, BOOK, { now: NOW });

    expect(cloud.textAt("Skrivro/Isen.penna (2)/scenes/T1.md")).toBe("En helt annan bok.");
    expect(cloud.textAt("Skrivro/Isen.penna/scenes/T1.md")).toBeNull();
    expect(await other.list(`${BOOK}/scenes`)).toEqual(["T1.md"]);
  });

  it("lets a copied book folder start afresh instead of changing the original's Drive folder", async () => {
    const { cloud, computer } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    const copy = `${BOOK.replace(".penna", "")} kopia.penna`;
    for (const name of ["project.json", "scenes/S1.md", ".penna-sync.json"]) {
      await computer.writeText(`${copy}/${name}`, await computer.readText(`${BOOK}/${name}`));
    }
    await computer.writeText(`${copy}/scenes/S1.md`, "Ett försök i kopian.");

    await syncProject(computer, cloud.drive, copy, { now: NOW });

    expect(cloud.textAt("Skrivro/Isen.penna/scenes/S1.md")).toBe("Brevet låg där.");
    expect(cloud.textAt("Skrivro/Isen kopia.penna/scenes/S1.md")).toBe("Ett försök i kopian.");
  });
});

describe("syncProject and a file it cannot read", () => {
  it("stops instead of counting a locked file as removed and removing it from Drive", async () => {
    const { cloud, computer } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    const readBytes = computer.readBytes;
    computer.readBytes = (path) =>
      path.endsWith("S1.md") ? Promise.reject(new Error("os error 32")) : readBytes(path);

    await expect(syncProject(computer, cloud.drive, BOOK, { now: NOW })).rejects.toThrow();

    expect(cloud.textAt("Skrivro/Isen.penna/scenes/S1.md")).toBe("Brevet låg där.");
  });
});

describe("syncProject and a book emptied on one side", () => {
  it("stops instead of trashing most of the book in Drive when its folder here lost the files", async () => {
    const cloud = twoDevices().cloud;
    const scenes = Object.fromEntries(
      Array.from({ length: 12 }, (_slot, index) => [
        `${BOOK}/scenes/S${index}.md`,
        `Scen ${index}.`,
      ]),
    );
    const computer = createMemoryFileSystem({ [`${BOOK}/project.json`]: "{}", ...scenes });
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    const emptied = createMemoryFileSystem({
      [`${BOOK}/project.json`]: "{}",
      [`${BOOK}/.penna-sync.json`]: await computer.readText(`${BOOK}/.penna-sync.json`),
    });

    await expect(syncProject(emptied, cloud.drive, BOOK, { now: NOW })).rejects.toThrow();

    expect(cloud.isInTrash("Skrivro/Isen.penna/scenes/S0.md")).toBe(false);
  });
});
