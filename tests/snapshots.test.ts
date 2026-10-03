import { describe, expect, it } from "vitest";
import {
  listSnapshots,
  snapshotFileName,
  snapshotOnSave,
  snapshotWhen,
  takeSnapshot,
} from "../src/project/snapshots";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const SCENE_ID = "01J9Z4K2QX";
const scene = (body: string) => `---\nid: ${SCENE_ID}\ntitle: Köket\nstatus: utkast\n---\n${body}`;
const BOOK = { dir: "/bok", id: SCENE_ID };
const AT_1403 = new Date(2026, 9, 2, 14, 3).getTime();
const AT_1520 = new Date(2026, 9, 2, 15, 20).getTime();
const words = (count: number, word = "ord") => `${Array(count).fill(word).join(" ")}.\n`;

describe("snapshotFileName", () => {
  it("follows the spec: local date and time to the minute", () => {
    const name = snapshotFileName(AT_1403);

    expect(name).toBe("2026-10-02T14-03.md");
  });
});

describe("takeSnapshot and listSnapshots", () => {
  it("lists the newest first, with name, kind and word count", async () => {
    const files = createMemoryFileSystem({});
    await takeSnapshot(files, BOOK, scene("Brevet låg där.\n"), { time: AT_1403 });
    await takeSnapshot(files, BOOK, scene(words(5)), { time: AT_1520, label: "Före omskrivning" });

    const snapshots = await listSnapshots(files, BOOK);

    expect(
      snapshots.map((snapshot) => [snapshot.label, snapshot.isManual, snapshot.words]),
    ).toEqual([
      ["Före omskrivning", true, 5],
      [null, false, 3],
    ]);
    expect(snapshots[1]?.time).toBe(AT_1403);
    expect(snapshots[1]?.body).toBe("Brevet låg där.\n");
  });

  it("never replaces a snapshot taken the same minute", async () => {
    const files = createMemoryFileSystem({});

    await takeSnapshot(files, BOOK, scene("Ett.\n"), { time: AT_1403, label: "Första" });
    await takeSnapshot(files, BOOK, scene("Två.\n"), { time: AT_1403, label: "Andra" });

    const labels = (await listSnapshots(files, BOOK)).map((snapshot) => snapshot.label);
    expect(labels).toEqual(["Andra", "Första"]);
  });

  it("gives an empty list for a scene without snapshots", async () => {
    const files = createMemoryFileSystem({});

    const snapshots = await listSnapshots(files, BOOK);

    expect(snapshots).toEqual([]);
  });
});

describe("snapshotOnSave", () => {
  it("keeps the original text at the first change of a scene", async () => {
    const files = createMemoryFileSystem({});

    const took = await snapshotOnSave(
      files,
      BOOK,
      { before: scene("Original.\n"), after: scene("Original. Mer.\n") },
      AT_1403,
    );

    const snapshots = await listSnapshots(files, BOOK);
    expect(took).toBe(true);
    expect(snapshots.map((snapshot) => snapshot.body)).toEqual(["Original.\n"]);
  });

  it("waits for a larger change before taking the next one", async () => {
    const files = createMemoryFileSystem({});
    const start = scene(words(20));
    await takeSnapshot(files, BOOK, start, { time: AT_1403 });
    const edited = scene(words(20) + words(50, "ny"));
    const rewritten = scene(words(20) + words(50, "ny") + words(80, "mer"));

    const small = await snapshotOnSave(files, BOOK, { before: start, after: edited }, AT_1520);
    const large = await snapshotOnSave(files, BOOK, { before: edited, after: rewritten }, AT_1520);

    expect([small, large]).toEqual([false, true]);
    const bodies = (await listSnapshots(files, BOOK)).map((snapshot) => snapshot.body);
    expect(bodies).toEqual([words(20) + words(50, "ny"), words(20)]);
  });

  it("takes none of an empty new scene", async () => {
    const files = createMemoryFileSystem({});

    const took = await snapshotOnSave(
      files,
      BOOK,
      { before: scene(""), after: scene("Första ordet.\n") },
      AT_1403,
    );

    expect(took).toBe(false);
  });
});

describe("snapshotWhen", () => {
  it("says today, yesterday or the date, with the time", () => {
    const now = new Date(2026, 9, 3, 9, 0).getTime();

    const labels = [
      snapshotWhen(new Date(2026, 9, 3, 8, 5).getTime(), now),
      snapshotWhen(AT_1403, now),
      snapshotWhen(new Date(2026, 9, 1, 23, 59).getTime(), now),
    ];

    expect(labels).toEqual(["Idag 08:05", "Igår 14:03", "1 okt 23:59"]);
  });
});
