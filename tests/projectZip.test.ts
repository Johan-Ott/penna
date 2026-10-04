import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { projectZip } from "../src/export/projectZip";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

describe("projectZip", () => {
  it("packs every file in the project folder, subfolders included, inside a folder of its name", async () => {
    const files = createMemoryFileSystem({
      "/Penna/Isen.penna/project.json": "{}",
      "/Penna/Isen.penna/scenes/s1.md": "Brevet låg där.",
      "/Penna/Isen.penna/snapshots/s1/2026-10-04T10-00.md": "Brevet.",
      "/Penna/Annat.penna/project.json": "{}",
    });

    const bytes = await projectZip(files, "/Penna/Isen.penna");

    const zip = await JSZip.loadAsync(bytes);
    const paths = Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .map((entry) => entry.name)
      .sort();
    expect(paths).toEqual([
      "Isen.penna/project.json",
      "Isen.penna/scenes/s1.md",
      "Isen.penna/snapshots/s1/2026-10-04T10-00.md",
    ]);
    expect(await zip.file("Isen.penna/scenes/s1.md")?.async("string")).toBe("Brevet låg där.");
  });
});
