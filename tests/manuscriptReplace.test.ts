import { SearchQuery } from "prosemirror-search";
import { describe, expect, it } from "vitest";
import { replaceInScenes, undoReplace } from "../src/app/manuscriptReplace";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const scene = (id: string, body: string) => `---\nid: ${id}\ntitle: ${id}\n---\n${body}`;
const KOKET = scene("01KOKET", "Sjöbergh kom.\n");
const ISEN = scene("01ISEN", "Isen låg.\n");
const FYREN = scene("01FYREN", "Sjöbergh och Sjöbergh.\n");
const QUERY = new SearchQuery({ search: "Sjöbergh", replace: "Sjöberg" });

function setup() {
  return createMemoryFileSystem({
    "/bok/scenes/01KOKET.md": KOKET,
    "/bok/scenes/01ISEN.md": ISEN,
    "/bok/scenes/01FYREN.md": FYREN,
  });
}

describe("replaceInScenes", () => {
  it("replaces in every given scene and counts all the replacements", async () => {
    const files = setup();

    const result = await replaceInScenes(files, "/bok", ["01KOKET", "01ISEN", "01FYREN"], QUERY);

    expect(result.count).toBe(3);
    expect(result.changes.map((change) => change.id)).toEqual(["01KOKET", "01FYREN"]);
    expect(await files.readText("/bok/scenes/01FYREN.md")).toContain("Sjöberg och Sjöberg.");
    expect(await files.readText("/bok/scenes/01ISEN.md")).toBe(ISEN);
  });
});

describe("undoReplace", () => {
  it("puts every changed scene back", async () => {
    const files = setup();
    const { changes } = await replaceInScenes(files, "/bok", ["01KOKET", "01FYREN"], QUERY);

    await undoReplace(files, "/bok", changes);

    expect(await files.readText("/bok/scenes/01KOKET.md")).toBe(KOKET);
    expect(await files.readText("/bok/scenes/01FYREN.md")).toBe(FYREN);
  });

  it("leaves a scene alone that was written in after the replacement", async () => {
    const files = setup();
    const { changes } = await replaceInScenes(files, "/bok", ["01KOKET", "01FYREN"], QUERY);
    const later = scene("01KOKET", "Sjöberg kom. Ny mening.\n");
    await files.writeText("/bok/scenes/01KOKET.md", later);

    const skipped = await undoReplace(files, "/bok", changes);

    expect(await files.readText("/bok/scenes/01KOKET.md")).toBe(later);
    expect(await files.readText("/bok/scenes/01FYREN.md")).toBe(FYREN);
    expect(skipped).toEqual(["01KOKET"]);
  });
});
