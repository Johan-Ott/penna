import { describe, expect, it } from "vitest";
import { libraryCandidates } from "../src/project/libraryFolders";
import { createProject, copyExampleProject, projectFolderName } from "../src/project/newProject";
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
  const details = { title: "Vintervägen", type: "roman", dailyGoal: 1000, deadline: "" };

  it("makes a project folder with a first chapter and scene, ready to write in", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Penna", details);

    const project = await readProjectFile(files, created.dir, []);
    expect(created.dir).toBe("/Penna/Vintervägen.penna");
    expect(project.fields).toMatchObject({ title: "Vintervägen", type: "roman", dailyGoal: 1000 });
    expect(manuscriptSceneIds(project.tree)).toEqual([created.sceneId]);
    expect((await openProjectFolder(files, created.dir)).scenes).toEqual([created.sceneId]);
  });

  it("never writes into an existing project with the same name", async () => {
    const files = createMemoryFileSystem({ "/Penna/Vintervägen.penna/project.json": "{}" });

    const created = await createProject(files, "/Penna", details);

    expect(created.dir).toBe("/Penna/Vintervägen 2.penna");
    expect(await files.readText("/Penna/Vintervägen.penna/project.json")).toBe("{}");
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
      ["Bara den här datorn", "C:/Users/Elin/Documents/Penna"],
    ]);
  });
});
