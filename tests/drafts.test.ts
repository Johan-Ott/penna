import { describe, expect, it } from "vitest";
import { listDrafts, restoreDraft, saveDraft } from "../src/project/drafts";
import { listSnapshots } from "../src/project/snapshots";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const BOOK = "/bok.penna";
const scene = (body: string) => `---\nid: S1\ntitle: Köket\nstatus: utkast\n---\n${body}\n`;

describe("drafts", () => {
  it("keep a chapter's scenes under a name, newest first", async () => {
    const fileSystem = createMemoryFileSystem({
      [`${BOOK}/scenes/S1.md`]: scene("Brevet låg där."),
    });

    await saveDraft(fileSystem, BOOK, { name: "Första", chapterId: "K1", sceneIds: ["S1"] }, 1000);
    await saveDraft(fileSystem, BOOK, { name: "Andra", chapterId: "K1", sceneIds: ["S1"] }, 2000);

    const drafts = await listDrafts(fileSystem, BOOK);
    expect(drafts.map((draft) => draft.name)).toEqual(["Andra", "Första"]);
    expect(drafts[0]?.words).toBe(3);
  });

  it("put a draft back, keeping the text it replaced as a version", async () => {
    const fileSystem = createMemoryFileSystem({
      [`${BOOK}/scenes/S1.md`]: scene("Brevet låg där."),
    });
    const draft = await saveDraft(
      fileSystem,
      BOOK,
      { name: "Första", chapterId: null, sceneIds: ["S1"] },
      1000,
    );
    await fileSystem.writeText(`${BOOK}/scenes/S1.md`, scene("Allt omskrivet."));

    await restoreDraft(fileSystem, BOOK, draft, 3000);

    expect(await fileSystem.readText(`${BOOK}/scenes/S1.md`)).toContain("Brevet låg där.");
    const [kept] = await listSnapshots(fileSystem, { dir: BOOK, id: "S1" });
    expect(kept?.body).toContain("Allt omskrivet.");
    expect(kept?.label).toBe("Före utkastet Första");
  });
});
