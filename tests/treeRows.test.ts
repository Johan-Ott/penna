import { describe, expect, it } from "vitest";
import {
  ancestorIds,
  findNode,
  insertAfter,
  insertNode,
  isInTrash,
  moveToTrash,
  withSpecialFolders,
  CHARACTERS_ID,
  NOTES_ID,
  PLACES_ID,
  TIMELINE_ID,
  RESEARCH_ID,
  TRASH_ID,
  type TreeNode,
} from "../src/project/tree";
import { dropMove, visibleRows } from "../src/project/treeRows";

const scene = (id: string): TreeNode => ({ id, kind: "scene" });

function sampleTree(): TreeNode[] {
  return withSpecialFolders([
    {
      id: "del1",
      kind: "part",
      title: "Hemkomsten",
      children: [
        { id: "kap1", kind: "chapter", title: "Arvid", children: [scene("s1"), scene("s2")] },
        { id: "kap2", kind: "chapter", title: "Udden", children: [scene("s3")] },
      ],
    },
  ]);
}

const childIds = (tree: TreeNode[], id: string) =>
  findNode(tree, id)?.node.children?.map((child) => child.id);

describe("visibleRows", () => {
  it("lists rows with their depth and skips the inside of collapsed nodes", () => {
    const rows = visibleRows(sampleTree(), new Set(["kap1"]));

    expect(rows.map((row) => `${row.depth}:${row.node.id}`)).toEqual([
      "0:del1",
      "1:kap1",
      "1:kap2",
      "2:s3",
      `0:${CHARACTERS_ID}`,
      `0:${PLACES_ID}`,
      `0:${TIMELINE_ID}`,
      `0:${NOTES_ID}`,
      `0:${RESEARCH_ID}`,
      `0:${TRASH_ID}`,
    ]);
  });
});

describe("dropMove", () => {
  const rowOf = (tree: TreeNode[], id: string) => {
    const row = visibleRows(tree, new Set()).find((candidate) => candidate.node.id === id);
    if (!row) throw new Error(`no row ${id}`);
    return row;
  };

  it("drops a scene before another scene in the same chapter", () => {
    const tree = sampleTree();

    const moved = dropMove(tree, "s2", rowOf(tree, "s1"), "before");

    expect(childIds(moved, "kap1")).toEqual(["s2", "s1"]);
  });

  it("drops a scene after a scene further down in the same chapter", () => {
    const tree = sampleTree();

    const moved = dropMove(tree, "s1", rowOf(tree, "s2"), "after");

    expect(childIds(moved, "kap1")).toEqual(["s2", "s1"]);
  });

  it("drops a scene inside another chapter, at its end", () => {
    const tree = sampleTree();

    const moved = dropMove(tree, "s1", rowOf(tree, "kap2"), "inside");

    expect(childIds(moved, "kap2")).toEqual(["s3", "s1"]);
  });
});

describe("isInTrash", () => {
  it("tells whether a node lies in Papperskorg", () => {
    const tree = moveToTrash(sampleTree(), "kap2");

    expect(isInTrash(tree, "s3")).toBe(true);
    expect(isInTrash(tree, "s1")).toBe(false);
  });
});

describe("ancestorIds", () => {
  it("lists the nodes above a scene from the root down", () => {
    expect(ancestorIds(sampleTree(), "s3")).toEqual(["del1", "kap2"]);
    expect(ancestorIds(sampleTree(), "saknas")).toEqual([]);
  });
});

describe("insertAfter keeps the nesting rules", () => {
  it("puts a new chapter after the chapter around the scene, never inside it", () => {
    const tree = insertAfter(sampleTree(), { id: "kap9", kind: "chapter", children: [] }, "s1");

    expect(childIds(tree, "del1")).toEqual(["kap1", "kap9", "kap2"]);
    expect(childIds(tree, "kap1")).toEqual(["s1", "s2"]);
  });

  it("puts a new part after the part around a chapter, at the root", () => {
    const tree = insertAfter(sampleTree(), { id: "del9", kind: "part", children: [] }, "kap1");

    expect(tree.map((node) => node.id).slice(0, 2)).toEqual(["del1", "del9"]);
  });
});

describe("insertNode inside a node that can not hold it", () => {
  it("puts a chapter after a chapter instead of inside it", () => {
    const tree = insertNode(sampleTree(), { id: "kap9", kind: "chapter", children: [] }, "kap1", 0);

    expect(childIds(tree, "del1")).toEqual(["kap1", "kap9", "kap2"]);
  });
});
