import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { projectZip } from "../src/export/projectZip";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

describe("projectZip", () => {
  it("packs every file in the project folder, subfolders included, inside a folder of its name", async () => {
    const files = createMemoryFileSystem({
      "/Skrivro/Isen.skrivro/project.json": "{}",
      "/Skrivro/Isen.skrivro/scenes/s1.md": "Brevet låg där.",
      "/Skrivro/Isen.skrivro/snapshots/s1/2026-10-04T10-00.md": "Brevet.",
      "/Skrivro/Annat.skrivro/project.json": "{}",
    });

    const bytes = await projectZip(files, ["/Skrivro/Isen.skrivro"]);

    const zip = await JSZip.loadAsync(bytes);
    const paths = Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .map((entry) => entry.name)
      .sort();
    expect(paths).toEqual([
      "Isen.skrivro/project.json",
      "Isen.skrivro/scenes/s1.md",
      "Isen.skrivro/snapshots/s1/2026-10-04T10-00.md",
    ]);
    expect(await zip.file("Isen.skrivro/scenes/s1.md")?.async("string")).toBe("Brevet låg där.");
  });

  it("leaves out a file it cannot read instead of failing the whole copy", async () => {
    const files = createMemoryFileSystem({
      "/Skrivro/Isen.skrivro/project.json": "{}",
      "/Skrivro/Isen.skrivro/scenes/s1.md": "Låst.",
    });
    const { readBytes, list } = files;
    files.readBytes = (path) =>
      path.endsWith("s1.md") ? Promise.reject(new Error("os error 32")) : readBytes(path);
    files.list = (dir) =>
      dir.endsWith("s1.md") ? Promise.reject(new Error("not a folder")) : list(dir);

    const zip = await JSZip.loadAsync(await projectZip(files, ["/Skrivro/Isen.skrivro"]));

    expect(zip.file("Isen.skrivro/project.json")).not.toBeNull();
  });

  it("packs the book's series beside the book, so both unpack into the library together", async () => {
    const files = createMemoryFileSystem({
      "/Skrivro/Isen.skrivro/project.json": '{"series":"Vintern.serie"}',
      "/Skrivro/Vintern.serie/scenes/arvid.md": "Fiskare.",
    });

    const bytes = await projectZip(files, ["/Skrivro/Isen.skrivro", "/Skrivro/Vintern.serie"]);

    const zip = await JSZip.loadAsync(bytes);
    expect(await zip.file("Vintern.serie/scenes/arvid.md")?.async("string")).toBe("Fiskare.");
    expect(zip.file("Isen.skrivro/project.json")).not.toBeNull();
  });
});
