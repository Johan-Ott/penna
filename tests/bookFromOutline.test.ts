import { describe, expect, it } from "vitest";
import { createBookFromOutline } from "../src/project/bookFromOutline";
import { labelsOf } from "../src/project/labels";
import { readProjectFile } from "../src/project/projectFile";
import { manuscriptSceneIds, sortsOf } from "../src/project/tree";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

describe("createBookFromOutline", () => {
  it("makes a book in the library with the outline's parts, chapters and scenes", async () => {
    const files = createMemoryFileSystem({});
    const outline = "# Akt 1\n\n## Skörden\n\nVale arbetar.\n\n## Kretsen\n\nMiddag.\n";

    const created = await createBookFromOutline(files, "/Penna", { title: "Vardhavn" }, outline);

    const project = await readProjectFile(files, created.dir, []);
    expect(created.dir).toBe("/Penna/Vardhavn.penna");
    expect(project.fields).toMatchObject({ title: "Vardhavn", type: "roman" });
    const [part] = project.tree;
    expect(part).toMatchObject({ kind: "part", title: "Akt 1" });
    expect(part?.children?.map((chapter) => chapter.title)).toEqual(["Skörden", "Kretsen"]);
    expect(manuscriptSceneIds(project.tree)).toHaveLength(2);
  });

  it("makes a book with one chapter and scene when no outline is given", async () => {
    const files = createMemoryFileSystem({});

    const created = await createBookFromOutline(files, "/Penna", { title: "Vardhavn" });

    const project = await readProjectFile(files, created.dir, []);
    expect(manuscriptSceneIds(project.tree)).toEqual([created.sceneId]);
  });

  it("gives a chapter with no text under it an empty first scene, as Nytt kapitel does", async () => {
    const files = createMemoryFileSystem({});

    const created = await createBookFromOutline(
      files,
      "/Penna",
      { title: "Vardhavn" },
      "# Akt 1\n\n## Kroppen\n",
    );

    const project = await readProjectFile(files, created.dir, []);
    const chapter = project.tree[0]?.children?.[0];
    expect(chapter).toMatchObject({ kind: "chapter", title: "Kroppen" });
    expect(chapter?.children).toHaveLength(1);
  });

  it("takes the structure's goal and the pieces' sorts and labels, as Ny bok does", async () => {
    const files = createMemoryFileSystem({});
    const details = { title: "Vardhavn", structure: "romantasy", pieces: ["deckare"] };

    const created = await createBookFromOutline(
      files,
      "/Penna",
      details,
      "# Akt 1\n\n## Kroppen\n",
    );

    const project = await readProjectFile(files, created.dir, []);
    expect(project.fields["totalGoal"]).toBe(110000);
    expect(sortsOf(project.tree).map((sort) => sort.title)).toContain("Misstänkta");
    expect(labelsOf(project.fields).map((label) => label.name)).toContain("Falskt spår");
  });

  it("names the structures and pieces there are when one is unknown", async () => {
    const files = createMemoryFileSystem({});

    const wrongStructure = createBookFromOutline(files, "/Penna", {
      title: "A",
      structure: "epos",
    });
    const wrongPiece = createBookFromOutline(files, "/Penna", { title: "B", pieces: ["vampyr"] });

    await expect(wrongStructure).rejects.toThrow(/romantasy/);
    await expect(wrongPiece).rejects.toThrow(/deckare/);
  });
});
