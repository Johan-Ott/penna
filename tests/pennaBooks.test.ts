import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { findRecoverableTemps } from "@llkit/storage/atomicWrite.js";
import { readShelf } from "../src/project/shelf";
import { readState, STATE_FILE } from "../src/sync/syncState";

// The app was called Penna before; what it wrote then still opens.
describe("books made while the app was called Penna", () => {
  it("are on the shelf next to new ones, without the old ending in their title", async () => {
    const files = createMemoryFileSystem({
      "/Bok/Isen.penna/project.json": JSON.stringify({ title: "Isen" }),
      "/Bok/Fyren.skrivro/project.json": JSON.stringify({ title: "Fyren" }),
    });

    const books = await readShelf(files, "/Bok", []);

    expect(books.map((book) => book.title).sort()).toEqual(["Fyren", "Isen"]);
  });

  it("keep their sync state, which gets the new name", async () => {
    const state = { folderId: "drive-id", files: {} };
    const files = createMemoryFileSystem({
      "/Bok/Isen.penna/.penna-sync.json": JSON.stringify(state),
    });

    expect((await readState(files, "/Bok/Isen.penna")).folderId).toBe("drive-id");
    expect(await files.list("/Bok/Isen.penna")).toEqual([STATE_FILE]);
  });

  it("have a half-written scene from a crash found and offered back", async () => {
    const files = createMemoryFileSystem({
      "/Bok/Isen.penna/scenes/S1.md.penna-tmp": "Nyare text.",
    });

    const found = await findRecoverableTemps(files, "/Bok/Isen.penna/scenes");

    expect(found).toEqual([
      {
        tempPath: "/Bok/Isen.penna/scenes/S1.md.penna-tmp",
        targetPath: "/Bok/Isen.penna/scenes/S1.md",
      },
    ]);
  });
});
