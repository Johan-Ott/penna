import { describe, expect, it } from "vitest";
import {
  backupFileName,
  backupFolderOf,
  backupsIn,
  backupsToRemove,
  listBackups,
  restoreBackup,
  takeBackup,
  type BackupFile,
} from "../src/project/backups";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 5, 18, 0).getTime();
const copy = (time: number, label: string | null = null): BackupFile => ({
  path: `/kopior/${time}.zip`,
  time,
  label,
});

describe("which copies are kept", () => {
  it("keeps the ten newest, one a day for thirty days, and every named one", () => {
    const today = Array.from({ length: 12 }, (_unused, index) => copy(NOW - index * 60_000));
    const lastMonth = Array.from({ length: 40 }, (_unused, index) => copy(NOW - (index + 1) * DAY));
    const named = copy(NOW - 400 * DAY, "Före redaktören");

    const removed = backupsToRemove([...today, ...lastMonth, named], NOW);

    expect(removed).toHaveLength(2 + 11);
    expect(removed).not.toContain(named);
    expect(removed).not.toContain(today[0]);
    expect(removed).toContain(lastMonth[39]);
  });
});

describe("a copy of a book", () => {
  it("is a zip of the whole book in a folder of its own, under a name that tells when", async () => {
    const files = createMemoryFileSystem({
      "/bok/Isen.penna/project.json": "{}",
      "/bok/Isen.penna/scenes/S1.md": "Isen låg tjock.",
    });

    const path = await takeBackup(
      files,
      "/kopior",
      ["/bok/Isen.penna"],
      backupFileName(NOW, "Före"),
    );

    expect(path).toBe(`${backupFolderOf("/kopior", "/bok/Isen.penna")}/2026-10-05 18-00 Före.zip`);
    const [found] = await backupsIn(files, backupFolderOf("/kopior", "/bok/Isen.penna"));
    expect(found).toMatchObject({ time: NOW, label: "Före" });
    expect((await listBackups(files, "/kopior")).map((book) => book.book)).toEqual(["Isen"]);
  });

  it("is restored as a new book beside the original, without the sync's state", async () => {
    const files = createMemoryFileSystem({
      "/bok/Isen.penna/project.json": "{}",
      "/bok/Isen.penna/scenes/S1.md": "Isen låg tjock.",
      "/bok/Isen.penna/.penna-sync.json": "{}",
    });
    const path = await takeBackup(files, "/kopior", ["/bok/Isen.penna"], backupFileName(NOW));
    await files.writeText("/bok/Isen.penna/scenes/S1.md", "Förstörd.");

    const dir = await restoreBackup(files, await files.readBytes(path), "/bok", "Isen från 5 okt");

    expect(dir).toBe("/bok/Isen från 5 okt.penna");
    expect(await files.readText(`${dir}/scenes/S1.md`)).toBe("Isen låg tjock.");
    expect(await files.list(dir)).not.toContain(".penna-sync.json");
    expect(await files.readText("/bok/Isen.penna/scenes/S1.md")).toBe("Förstörd.");
  });
});
