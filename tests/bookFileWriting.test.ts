import { describe, expect, it } from "vitest";
import { bookFileCalls } from "../src/project/bookFiles";
import { copyExampleProject } from "../src/project/newProject";
import { readProjectFile } from "../src/project/projectFile";
import { listSnapshots } from "../src/project/snapshots";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const SCENE = "01J9Z4K2QX0000000000000001";

async function exampleBook() {
  const fileSystem = createMemoryFileSystem({});
  const dir = await copyExampleProject(fileSystem, "/Penna");
  const calls = bookFileCalls({ fileSystem, dir });
  const fields = async () => (await readProjectFile(fileSystem, dir, [])).fields;
  return { fileSystem, dir, calls, fields };
}

describe("bookFileCalls for writing", () => {
  it("keeps the scene's earlier text as a version before write replaces it", async () => {
    const { fileSystem, dir, calls } = await exampleBook();
    const before = await calls.read(SCENE);

    await calls.write(SCENE, "Ny text.\n");

    const versions = await listSnapshots(fileSystem, { dir, id: SCENE });
    expect(versions).toHaveLength(1);
    expect(before.endsWith(versions[0]?.body ?? "-")).toBe(true);
  });

  it("leaves a comment on a quote in the scene and reads it back", async () => {
    const { calls } = await exampleBook();
    await calls.write(SCENE, "Det blåste upp på kvällen. Isen sjöng.\n");

    await calls.comment(SCENE, "Isen sjöng", "Starkt. Behåll.");

    const comments = await calls.comments(SCENE);
    expect(comments).toMatchObject([{ quote: "Isen sjöng", body: "Starkt. Behåll." }]);
  });

  it("refuses a comment on a quote the scene does not have", async () => {
    const { calls } = await exampleBook();

    await expect(calls.comment(SCENE, "finns inte här", "Text")).rejects.toThrow(/Citatet/);
  });

  it("sets the book's goal and how it is told", async () => {
    const { calls, fields } = await exampleBook();

    await calls.book("totalmål", "115000");
    await calls.book("röst", "jag dåtid djup");

    expect(await fields()).toMatchObject({
      totalGoal: 115000,
      narration: { voice: "jag", tense: "dåtid", deep: true },
    });
  });

  it("puts a book in a series by name, the same series for the next book", async () => {
    const { fileSystem, calls, fields } = await exampleBook();
    const second = await copyExampleProject(fileSystem, "/Penna");

    const folder = await calls.series("Vale");
    const again = await bookFileCalls({ fileSystem, dir: second }).series("vale");

    expect(folder).toBe("Vale.serie");
    expect(again).toBe(folder);
    expect((await fields())["series"]).toBe(folder);
  });

  it("runs several calls in order, where $0 is the first call's answer", async () => {
    const { calls } = await exampleBook();

    const answers = await calls.batch([
      ["add", "chapter", "Stormen"],
      ["set", "$0", "vad", "Ovädret kommer."],
      ["label", "$0", "Ledtråd"],
    ]);

    const rows = (await calls.tree()) as { id: string; title: string }[];
    expect(rows.find((row) => row.id === answers[0])?.title).toContain("Stormen");
  });
});
