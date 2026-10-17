import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { markdownFolderZip } from "../src/export/markdownFolder";
import type { TreeNode } from "../src/project/tree";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

const scene = (id: string): TreeNode => ({ id, kind: "scene" });

const tree: TreeNode[] = [
  {
    id: "d1",
    kind: "part",
    title: "Isen",
    children: [
      { id: "k1", kind: "chapter", title: "Brevet", children: [scene("hamn"), scene("fraga")] },
    ],
  },
  { id: "karaktarer", kind: "sort", title: "Personer", children: [scene("elin")] },
  { id: "trash", kind: "folder", title: "Papperskorg", children: [scene("bort")] },
];

const summaries = {
  hamn: { title: "Hamnen" },
  fraga: { title: "Vad: hände?" },
  bort: { title: "Bort" },
  elin: { title: "Elin" },
} as never;

describe("markdownFolderZip", () => {
  it("names folders after parts and chapters and files after scenes, notes apart, trash left out", async () => {
    const files = createMemoryFileSystem({
      "/Penna/Isen.penna/scenes/hamn.md": "---\nid: hamn\n---\nBåten låg still.",
      "/Penna/Isen.penna/scenes/fraga.md": "---\nid: fraga\n---\nIngen visste.",
      "/Penna/Isen.penna/scenes/elin.md": "---\nid: elin\n---\nFiskare.",
      "/Penna/Isen.penna/scenes/bort.md": "---\nid: bort\n---\nBorta.",
    });
    const book = { dir: "/Penna/Isen.penna", name: "Isen", tree, summaries };

    const zip = await JSZip.loadAsync(await markdownFolderZip(files, book));

    const paths = Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .map((entry) => entry.name)
      .sort();
    expect(paths).toEqual([
      "Isen/Anteckningar/Personer/Elin.md",
      "Isen/Del 1 Isen/01 Brevet/01 Hamnen.md",
      "Isen/Del 1 Isen/01 Brevet/02 Vad hände.md",
    ]);
    const text = await zip.file("Isen/Del 1 Isen/01 Brevet/01 Hamnen.md")?.async("string");
    expect(text).toBe("# Hamnen\n\nBåten låg still.");
  });
});
