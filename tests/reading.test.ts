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
  it("reads the whole book in order, each scene with its chapter and whether it opens it", () => {
    const book = readingScenes(tree);

    expect(
      book.map((each) => [each.sceneId, each.chapter?.number, each.chapter?.isFirstScene]),
    ).toEqual([
      ["s1", 1, true],
      ["s2", 1, false],
      ["s3", 2, true],
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
