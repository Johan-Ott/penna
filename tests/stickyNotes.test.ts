import { describe, expect, it } from "vitest";
import { readStickyNotes } from "../src/project/stickyNotes";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

describe("readStickyNotes", () => {
  it("gives a book with only the old Kladdlapp its text as the first note", async () => {
    const files = createMemoryFileSystem({ "/bok/kladdlapp.md": "Kolla årtalet." });

    const notes = await readStickyNotes(files, "/bok");

    expect(notes).toMatchObject([{ text: "Kolla årtalet.", color: "gul", strokes: [] }]);
  });

  it("fails on a file it cannot read, so it is never written over with nothing", async () => {
    const files = createMemoryFileSystem({ "/bok/lappar.json": "[{ trasig" });

    await expect(readStickyNotes(files, "/bok")).rejects.toThrow();
  });
});
