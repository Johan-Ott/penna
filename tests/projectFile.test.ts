import { describe, expect, it } from "vitest";
import { readProjectFile, writeProjectFile } from "../src/project/projectFile";
import {
  CHARACTERS_ID,
  NOTES_ID,
  PLACES_ID,
  RESEARCH_ID,
  TIMELINE_ID,
  TRASH_ID,
} from "../src/project/tree";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const PROJECT_PATH = "/bok/project.json";

describe("readProjectFile", () => {
  it("reads the tree and keeps every other field", async () => {
    const stored = { title: "Vintervägen", goal: 90000, tree: [{ id: "s1", kind: "scene" }] };
    const files = createMemoryFileSystem({ [PROJECT_PATH]: JSON.stringify(stored) });

    const project = await readProjectFile(files, "/bok", ["s1"]);

    expect(project.tree.map((node) => node.id)).toEqual(["s1"]);
    expect(project.fields).toEqual({ title: "Vintervägen", goal: 90000 });
    expect(project.repairCopy).toBeNull();
    expect(project.isNewerFormat).toBe(false);
  });

  it("knows a project saved by a newer Penna, so it can be opened read-only", async () => {
    const stored = { formatVersion: 2, tree: [{ id: "s1", kind: "scene" }] };
    const files = createMemoryFileSystem({ [PROJECT_PATH]: JSON.stringify(stored) });

    const project = await readProjectFile(files, "/bok", ["s1"]);

    expect(project.isNewerFormat).toBe(true);
  });

  it("starts a tree from the scene files when the folder has no project.json", async () => {
    const files = createMemoryFileSystem({});

    const project = await readProjectFile(files, "/bok", ["s2", "s1"]);

    expect(project.tree.map((node) => node.id)).toEqual([
      "s1",
      "s2",
      CHARACTERS_ID,
      PLACES_ID,
      TIMELINE_ID,
      NOTES_ID,
      RESEARCH_ID,
      TRASH_ID,
    ]);
  });

  it("keeps a copy of a broken project.json and rebuilds the tree", async () => {
    const files = createMemoryFileSystem({ [PROJECT_PATH]: '{ "tree": [ trasig' });

    const project = await readProjectFile(files, "/bok", ["s1"]);

    expect(project.tree.map((node) => node.id)).toEqual([
      "s1",
      CHARACTERS_ID,
      PLACES_ID,
      TIMELINE_ID,
      NOTES_ID,
      RESEARCH_ID,
      TRASH_ID,
    ]);
    expect(project.repairCopy).toMatch(/^project\.json\.trasig-/);
    expect(await files.readText(`/bok/${project.repairCopy ?? ""}`)).toBe('{ "tree": [ trasig');
    expect(JSON.parse(await files.readText(PROJECT_PATH)).tree).toHaveLength(7);
  });

  it("treats a tree with invalid nodes as broken", async () => {
    const files = createMemoryFileSystem({ [PROJECT_PATH]: '{ "tree": [{ "id": 5 }] }' });

    const project = await readProjectFile(files, "/bok", []);

    expect(project.repairCopy).not.toBeNull();
  });
});

describe("writeProjectFile", () => {
  it("writes the tree next to the other fields, readable by people", async () => {
    const files = createMemoryFileSystem({});

    await writeProjectFile(files, "/bok", { title: "Vintervägen" }, [{ id: "s1", kind: "scene" }]);

    const text = await files.readText(PROJECT_PATH);
    expect(JSON.parse(text)).toEqual({
      title: "Vintervägen",
      formatVersion: 1,
      tree: [{ id: "s1", kind: "scene" }],
    });
    expect(text).toContain('\n  "tree"');
  });
});
