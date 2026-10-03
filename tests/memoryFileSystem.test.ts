import { describe, expect, it } from "vitest";
import { writeAtomic } from "../src/storage/atomicWrite";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

describe("createMemoryFileSystem", () => {
  it("lists the files and folders directly inside a folder", async () => {
    const files = createMemoryFileSystem({ "/bok/scenes/a.md": "A", "/bok/project.json": "{}" });

    const names = await files.list("/bok");

    expect(names.sort()).toEqual(["project.json", "scenes"]);
  });

  it("supports an atomic write like a real disk", async () => {
    const files = createMemoryFileSystem({ "/bok/scenes/a.md": "gammal" });

    await writeAtomic(files, "/bok/scenes/a.md", "ny");

    expect(await files.readText("/bok/scenes/a.md")).toBe("ny");
    expect(await files.list("/bok/scenes")).toEqual(["a.md"]);
  });

  it("reports a missing file the way a disk does", async () => {
    const files = createMemoryFileSystem({});

    const reading = files.readText("/saknas.md");

    await expect(reading).rejects.toMatchObject({ code: "ENOENT" });
    expect(await files.modifiedAt("/saknas.md")).toBeNull();
    expect(await files.list("/saknas")).toEqual([]);
  });
});
