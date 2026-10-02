import { describe, expect, it } from "vitest";
import { classifySceneFiles, decideExternalChange } from "../src/storage/syncFiles";

describe("classifySceneFiles", () => {
  it("finds plain scene files by id", () => {
    const names = ["01J9Z4K2QX.md", "01J9Z5A1BB.md"];

    const listing = classifySceneFiles(names);

    expect(listing.scenes).toEqual(["01J9Z4K2QX", "01J9Z5A1BB"]);
    expect(listing.conflicts).toEqual([]);
  });

  it("recognises conflict copies from Dropbox, iCloud and OneDrive", () => {
    const names = [
      "01J9Z4K2QX.md",
      "01J9Z4K2QX (Johan's conflicted copy 2026-10-02).md",
      "01J9Z4K2QX 2.md",
      "01J9Z4K2QX-DESKTOP-7Q2.md",
    ];

    const listing = classifySceneFiles(names);

    expect(listing.scenes).toEqual(["01J9Z4K2QX"]);
    expect(listing.conflicts.map((copy) => copy.fileName)).toEqual(names.slice(1));
    expect(listing.conflicts.every((copy) => copy.sceneId === "01J9Z4K2QX")).toBe(true);
  });

  it("reports iCloud files that are not downloaded yet", () => {
    const names = [".01J9Z4K2QX.md.icloud"];

    const listing = classifySceneFiles(names);

    expect(listing.scenes).toEqual([]);
    expect(listing.notDownloaded).toEqual([
      { sceneId: "01J9Z4K2QX", fileName: ".01J9Z4K2QX.md.icloud" },
    ]);
  });

  it("ignores temp files and unrelated files", () => {
    const names = ["01J9Z4K2QX.md.penna-tmp", "desktop.ini", ".DS_Store", "readme.txt"];

    const listing = classifySceneFiles(names);

    expect(listing).toEqual({ scenes: [], conflicts: [], notDownloaded: [] });
  });
});

describe("decideExternalChange", () => {
  it("ignores the echo of our own save", () => {
    const texts = { diskText: "a", lastSavedText: "a", editorText: "a" };

    const decision = decideExternalChange(texts);

    expect(decision).toBe("unchanged");
  });

  it("reloads silently when the editor has no unsaved changes", () => {
    const texts = { diskText: "from sync", lastSavedText: "a", editorText: "a" };

    const decision = decideExternalChange(texts);

    expect(decision).toBe("reload");
  });

  it("asks the user when both the disk and the editor changed", () => {
    const texts = { diskText: "from sync", lastSavedText: "a", editorText: "typed" };

    const decision = decideExternalChange(texts);

    expect(decision).toBe("conflict");
  });

  it("treats a disk version equal to the editor as unchanged", () => {
    const texts = { diskText: "typed", lastSavedText: "a", editorText: "typed" };

    const decision = decideExternalChange(texts);

    expect(decision).toBe("unchanged");
  });
});
