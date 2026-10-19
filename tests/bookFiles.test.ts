import { describe, expect, it } from "vitest";
import { bookFileCalls } from "../src/project/bookFiles";
import { copyExampleProject } from "../src/project/newProject";
import { readProjectFile } from "../src/project/projectFile";
import { findNode, PLACES_ID } from "../src/project/tree";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

async function exampleBook() {
  const fileSystem = createMemoryFileSystem({});
  const dir = await copyExampleProject(fileSystem, "/Skrivro");
  const calls = bookFileCalls({ fileSystem, dir });
  const tree = async () => (await readProjectFile(fileSystem, dir, [])).tree;
  return { fileSystem, dir, calls, tree };
}

describe("bookFileCalls", () => {
  it("adds a chapter with its first scene once, in the tree project.json keeps", async () => {
    const { calls, tree } = await exampleBook();

    const id = await calls.add("chapter", "Stormen");

    const chapter = findNode(await tree(), id)?.node;
    expect(chapter).toMatchObject({ kind: "chapter", title: "Stormen" });
    const sceneId = chapter?.children?.[0]?.id ?? "";
    const rows = (await calls.tree()) as { id: string }[];
    expect(rows.filter((row) => row.id === sceneId)).toHaveLength(1);
  });

  it("writes a scene's text and keeps its front matter, then renames it", async () => {
    const { calls } = await exampleBook();
    const id = "01J9Z4K2QX0000000000000001";

    await calls.write(id, "Det blåste upp på kvällen.\n");
    await calls.rename(id, "Ovädret");

    const file = await calls.read(id);
    expect(file).toContain("title: Ovädret\n");
    expect(file).toContain("status: ");
    expect(file.endsWith("---\nDet blåste upp på kvällen.\n")).toBe(true);
  });

  it("puts a note in a sort by its name, or in a new sort, and sets När on a chapter", async () => {
    const { calls, tree } = await exampleBook();

    const id = await calls.note("Platser", "Hamnkontoret");
    await calls.set("01J9Z4K2QX00000000000000C1", "när", "Mars");

    const now = await tree();
    expect(findNode(now, id)?.parent?.id).toBe(PLACES_ID);
    expect(findNode(now, "01J9Z4K2QX00000000000000C1")?.node.when).toBe("Mars");
    const car = await calls.note("Fordon", "Bilen");
    expect(findNode(await tree(), car)?.parent).toMatchObject({ kind: "sort", title: "Fordon" });
  });
});
