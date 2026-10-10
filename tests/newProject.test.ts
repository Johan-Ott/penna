import { describe, expect, it } from "vitest";
import { libraryCandidates } from "../src/project/libraryFolders";
import { createProject, copyExampleProject, projectFolderName } from "../src/project/newProject";
import { splitManuscript } from "../src/import/markdownImport";
import { readProjectFile } from "../src/project/projectFile";
import { manuscriptSceneIds } from "../src/project/tree";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";
import { openProjectFolder } from "../src/storage/projectFolder";

describe("projectFolderName", () => {
  it("turns a title into a folder name that works on every system", () => {
    expect(projectFolderName("Vintervägen")).toBe("Vintervägen.penna");
    expect(projectFolderName('Del 1: "Isen"?')).toBe("Del 1 Isen.penna");
    expect(projectFolderName("   ")).toBe("Namnlöst projekt.penna");
  });
});

describe("createProject", () => {
  const details = {
    title: "Vintervägen",
    type: "roman",
    structure: "tom",
    pieces: [],
    dailyGoal: 1000,
    deadline: "",
    narration: null,
  };

  it("keeps how the book is told, for Granska to watch", async () => {
    const files = createMemoryFileSystem({});
    const narration = { voice: "nara", tense: "dåtid" } as const;

    const created = await createProject(files, "/Penna", { ...details, narration });

    expect((await readProjectFile(files, created.dir, [])).fields["narration"]).toEqual(narration);
  });

  it("makes a project folder with a first chapter and scene, ready to write in", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Penna", details);

    const project = await readProjectFile(files, created.dir, []);
    expect(created.dir).toBe("/Penna/Vintervägen.penna");
    expect(project.fields).toMatchObject({ title: "Vintervägen", type: "roman", dailyGoal: 1000 });
    expect(manuscriptSceneIds(project.tree)).toEqual([created.sceneId]);
    expect((await openProjectFolder(files, created.dir)).scenes).toEqual([created.sceneId]);
  });

  it("starts from a template: its parts and steps, notes, labels and goal", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Penna", {
      ...details,
      structure: "deckare",
      pieces: ["deckare", "serie"],
    });

    const project = await readProjectFile(files, created.dir, []);
    const [part] = project.tree;
    expect(part).toMatchObject({ kind: "part", title: "Brottet" });
    expect(part?.children?.[0]).toMatchObject({
      kind: "chapter",
      title: "Brottet",
      summary: "Brottet upptäcks, gärna redan i första kapitlet.",
    });
    expect(manuscriptSceneIds(project.tree)).toHaveLength(13);
    const sorts = project.tree.filter((node) => node.kind === "sort").map((node) => node.title);
    expect(sorts.slice(-3)).toEqual(["Misstänkta", "Ledtrådar", "Tidslinje"]);
    expect(project.fields).toMatchObject({ totalGoal: 80_000 });
    expect((project.fields["labels"] as { name: string }[]).map((label) => label.name)).toContain(
      "Falskt spår",
    );
  });

  it("never writes into an existing project with the same name", async () => {
    const files = createMemoryFileSystem({ "/Penna/Vintervägen.penna/project.json": "{}" });

    const created = await createProject(files, "/Penna", details);

    expect(created.dir).toBe("/Penna/Vintervägen 2.penna");
    expect(await files.readText("/Penna/Vintervägen.penna/project.json")).toBe("{}");
  });

  it("writes an imported book as scene files under its parts and chapters", async () => {
    const files = createMemoryFileSystem({});
    const book = splitManuscript("# Brevet\n\nBrevet låg där.\n\n***\n\nIsen bar.\n");

    const created = await createProject(files, "/Penna", details, book);

    const project = await readProjectFile(files, created.dir, []);
    const sceneIds = manuscriptSceneIds(project.tree);
    expect(project.tree[0]).toMatchObject({ kind: "chapter", title: "Brevet" });
    expect(sceneIds).toHaveLength(2);
    expect(created.sceneId).toBe(sceneIds[0]);
    const second = await files.readText(`${created.dir}/scenes/${sceneIds[1]}.md`);
    expect(second).toContain("title: Isen bar\nstatus: utkast\n---\nIsen bar.\n");
  });

  it("copies the example project into the library", async () => {
    const files = createMemoryFileSystem({});

    const dir = await copyExampleProject(files, "/Penna");

    expect(dir).toBe("/Penna/Vintervägen.penna");
    expect((await openProjectFolder(files, dir)).scenes.length).toBeGreaterThan(0);
  });
});

describe("libraryCandidates", () => {
  it("offers the cloud folders a Windows computer may have, and Documents for this computer only", () => {
    const candidates = libraryCandidates({
      home: "C:/Users/Elin",
      documents: "C:/Users/Elin/Documents",
    });

    expect(candidates.map((candidate) => [candidate.label, candidate.path])).toEqual([
      ["iCloud Drive", "C:/Users/Elin/iCloudDrive/Penna"],
      ["iCloud Drive", "C:/Users/Elin/Library/Mobile Documents/com~apple~CloudDocs/Penna"],
      ["Dropbox", "C:/Users/Elin/Dropbox/Penna"],
      ["OneDrive", "C:/Users/Elin/OneDrive/Penna"],
      ["Bara den här enheten", "C:/Users/Elin/Documents/Penna"],
    ]);
  });
});
