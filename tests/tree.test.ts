import { describe, expect, it } from "vitest";
import {
  ancestorIds,
  dropMove,
  findNode,
  insertAfter,
  insertNode,
  isInTrash,
  manuscriptSceneIds,
  moveNode,
  moveToTrash,
  numberNodes,
  rebuildTree,
  reconcileScenes,
  renameNode,
  RESEARCH_ID,
  TRASH_ID,
  visibleRows,
  withSpecialFolders,
  type TreeNode,
} from "../src/project/tree";

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

describe("special folders", () => {
  it("always ends the tree with Research and Papperskorg", () => {
    const tree = withSpecialFolders([scene("s1")]);

    expect(tree.map((node) => node.id)).toEqual(["s1", RESEARCH_ID, TRASH_ID]);
    expect(tree.at(-1)?.title).toBe("Papperskorg");
  });

  it("keeps existing special folders and their content", () => {
    const once = withSpecialFolders([scene("s1")]);
    const withNote = insertNode(once, scene("s9"), RESEARCH_ID, 0);

    const twice = withSpecialFolders(withNote);

    expect(twice.length).toBe(3);
    expect(childIds(twice, RESEARCH_ID)).toEqual(["s9"]);
  });
});

describe("moveNode", () => {
  it("moves a scene to another chapter", () => {
    const moved = moveNode(sampleTree(), "s1", "kap2", 1);

    expect(childIds(moved, "kap1")).toEqual(["s2"]);
    expect(childIds(moved, "kap2")).toEqual(["s3", "s1"]);
  });

  it("reorders a scene within its chapter", () => {
    const moved = moveNode(sampleTree(), "s2", "kap1", 0);

    expect(childIds(moved, "kap1")).toEqual(["s2", "s1"]);
  });

  it("refuses to put a chapter inside a scene or a part inside a chapter", () => {
    const tree = sampleTree();

    expect(moveNode(tree, "kap2", "s1", 0)).toBe(tree);
    expect(moveNode(tree, "del1", "kap1", 0)).toBe(tree);
  });

  it("refuses to move a node into itself", () => {
    const tree = sampleTree();

    expect(moveNode(tree, "del1", "kap1", 0)).toBe(tree);
    expect(moveNode(tree, "kap1", "kap1", 0)).toBe(tree);
  });

  it("never moves the special folders", () => {
    const tree = sampleTree();

    expect(moveNode(tree, TRASH_ID, null, 0)).toBe(tree);
  });
});

describe("tree edits", () => {
  it("puts a scene in the trash", () => {
    const trashed = moveToTrash(sampleTree(), "s3");

    expect(childIds(trashed, "kap2")).toEqual([]);
    expect(childIds(trashed, TRASH_ID)).toEqual(["s3"]);
  });

  it("renames a chapter", () => {
    const renamed = renameNode(sampleTree(), "kap2", "Fyren");

    expect(findNode(renamed, "kap2")?.node.title).toBe("Fyren");
  });

  it("inserts a new chapter in a part", () => {
    const tree = insertNode(
      sampleTree(),
      { id: "kap3", kind: "chapter", title: "Ny", children: [] },
      "del1",
      2,
    );

    expect(childIds(tree, "del1")).toEqual(["kap1", "kap2", "kap3"]);
  });
});

describe("reading order", () => {
  it("lists the manuscript's scenes in order, without research and trash", () => {
    const tree = insertNode(moveToTrash(sampleTree(), "s2"), scene("r1"), RESEARCH_ID, 0);

    expect(manuscriptSceneIds(tree)).toEqual(["s1", "s3"]);
  });

  it("numbers the chapters through the whole manuscript", () => {
    const numbers = numberNodes(sampleTree(), "chapter");

    expect(numbers.get("kap1")).toBe(1);
    expect(numbers.get("kap2")).toBe(2);
  });
});

describe("scenes on disk", () => {
  it("adds scene files the tree does not know to the end of the manuscript", () => {
    const result = reconcileScenes(sampleTree(), ["s1", "s2", "s3", "s4"]);

    expect(result.tree.map((node) => node.id)).toEqual(["del1", "s4", RESEARCH_ID, TRASH_ID]);
  });

  it("reports scenes in the tree whose file is gone, without removing them", () => {
    const result = reconcileScenes(sampleTree(), ["s1", "s3"]);

    expect(result.missing).toEqual(["s2"]);
    expect(childIds(result.tree, "kap1")).toEqual(["s1", "s2"]);
  });

  it("rebuilds a tree from scene files in creation order", () => {
    const tree = rebuildTree(["01B", "01A"]);

    expect(tree.map((node) => node.id)).toEqual(["01A", "01B", RESEARCH_ID, TRASH_ID]);
  });
});

describe("visibleRows", () => {
  it("lists rows with their depth and skips the inside of collapsed nodes", () => {
    const rows = visibleRows(sampleTree(), new Set(["kap1"]));

    expect(rows.map((row) => `${row.depth}:${row.node.id}`)).toEqual([
      "0:del1",
      "1:kap1",
      "1:kap2",
      "2:s3",
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
