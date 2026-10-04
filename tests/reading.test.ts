import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import { cursorAtBlock } from "../src/editor/commands";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { readingScenes } from "../src/project/reading";
import { withSpecialFolders, type TreeNode } from "../src/project/tree";

const scene = (id: string): TreeNode => ({ id, kind: "scene" });
const tree = withSpecialFolders([
  { id: "kap1", kind: "chapter", title: "Ankomsten", children: [scene("s1"), scene("s2")] },
  { id: "kap2", kind: "chapter", title: "Isen", children: [scene("s3")] },
]);

describe("readingScenes", () => {
  it("reads one chapter's scenes, or the whole book with each chapter's title at its start", () => {
    const chapter = readingScenes(tree, "kap2");
    const book = readingScenes(tree, null);

    expect(chapter).toEqual([{ sceneId: "s3", chapterTitle: "2. Isen" }]);
    expect(book).toEqual([
      { sceneId: "s1", chapterTitle: "1. Ankomsten" },
      { sceneId: "s2", chapterTitle: null },
      { sceneId: "s3", chapterTitle: "2. Isen" },
    ]);
  });
});

describe("cursorAtBlock", () => {
  it("puts the cursor at the start of the paragraph that was clicked in the reading view", () => {
    const state = EditorState.create({ doc: parseMarkdown("Brevet låg där.\n\nIsen bar.\n") });

    let moved = state;
    cursorAtBlock(1)(state, (transaction) => (moved = state.apply(transaction)));

    expect(moved.selection.$from.parent.textContent).toBe("Isen bar.");
  });
});
