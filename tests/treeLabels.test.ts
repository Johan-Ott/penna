import { describe, expect, it } from "vitest";
import {
  chapterOf,
  chapterWords,
  manuscriptWords,
  nodeLabel,
  nodeMeta,
  nodeWords,
  romanNumeral,
  shortWordCount,
} from "../src/project/treeLabels";
import { findNode, insertAfter, withSpecialFolders, type TreeNode } from "../src/project/tree";

const tree: TreeNode[] = withSpecialFolders([
  {
    id: "del1",
    kind: "part",
    title: "Vintern",
    children: [
      { id: "kap1", kind: "chapter", title: "Arvid", children: [{ id: "scene1", kind: "scene" }] },
      { id: "kap2", kind: "chapter", title: "Brevet", children: [{ id: "scene2", kind: "scene" }] },
    ],
  },
]);
const summaries = {
  scene1: { title: "Köket", words: 1240, status: "utkast" as const },
  scene2: { title: "Isen", words: 6060, status: "utkast" as const },
};
const find = (id: string) => findNode(tree, id)?.node as TreeNode;

describe("words in the manuscript", () => {
  it("lists each chapter with its number and words, and sums the manuscript", () => {
    const chapters = chapterWords(tree, summaries);

    expect(chapters).toEqual([
      { id: "kap1", label: "1. Arvid", words: 1240 },
      { id: "kap2", label: "2. Brevet", words: 6060 },
    ]);
    expect(manuscriptWords(tree, summaries)).toBe(7300);
  });
});

describe("tree labels", () => {
  it("numbers parts with roman numerals and chapters with digits", () => {
    const part = nodeLabel(find("del1"), tree, summaries);
    const chapter = nodeLabel(find("kap2"), tree, summaries);

    expect(part).toBe("Del I · Vintern");
    expect(chapter).toBe("2. Brevet");
  });

  it("names a scene by the title in its file, and a missing file plainly", () => {
    expect(nodeLabel({ id: "scene1", kind: "scene" }, tree, summaries)).toBe("Köket");
    expect(nodeLabel({ id: "borta", kind: "scene" }, tree, summaries)).toBe("Hittas inte");
  });

  it("sums the words of everything inside a node", () => {
    expect(nodeWords(find("del1"), summaries)).toBe(7300);
  });

  it("shows full numbers for scenes, short ones for chapters and nothing for parts", () => {
    expect(nodeMeta({ id: "scene1", kind: "scene" }, summaries)).toBe("1 240");
    expect(nodeMeta(find("kap2"), summaries)).toBe("6,1k");
    expect(nodeMeta(find("del1"), summaries)).toBe("");
  });

  it("shortens large word counts the way the design does", () => {
    expect(shortWordCount(812)).toBe("812");
    expect(shortWordCount(7300)).toBe("7,3k");
    expect(shortWordCount(48210)).toBe("48k");
  });

  it("writes roman numerals", () => {
    expect([1, 4, 9, 14, 40].map(romanNumeral)).toEqual(["I", "IV", "IX", "XIV", "XL"]);
  });
});

describe("insertAfter", () => {
  it("puts a new scene right after the open one, in the same chapter", () => {
    const result = insertAfter(tree, { id: "s3", kind: "scene" }, "scene1");

    expect(result[0]?.children?.[0]?.children?.map((node) => node.id)).toEqual(["scene1", "s3"]);
  });

  it("puts it at the end of the manuscript when there is no open scene", () => {
    const result = insertAfter(tree, { id: "s3", kind: "scene" }, null);

    expect(result.map((node) => node.id).slice(0, 2)).toEqual(["del1", "s3"]);
  });
});

describe("chapterOf", () => {
  it("finds the chapter around a scene and whether the scene opens it", () => {
    const chapter = chapterOf(tree, "scene2");

    expect(chapter).toEqual({ id: "kap2", number: 2, title: "Brevet", isFirstScene: true });
  });

  it("returns null for a scene outside any chapter, such as one in the trash", () => {
    const chapter = chapterOf(withSpecialFolders([{ id: "s9", kind: "scene" }]), "s9");

    expect(chapter).toBeNull();
  });
});
