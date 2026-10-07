import { describe, expect, it } from "vitest";
import { hasLabel, labelsOf, withLabel, withoutLabel } from "../src/project/labels";
import type { TreeNode } from "../src/project/tree";

const tree: TreeNode[] = [
  { id: "K1", kind: "chapter", title: "Brevet", children: [{ id: "S1", kind: "scene" }] },
];

describe("labels", () => {
  it("reads only well-formed labels from project.json", () => {
    const fields = { labels: [{ id: "a", name: "Elin", color: "#d4483b" }, { id: "b" }, "x"] };

    expect(labelsOf(fields)).toEqual([{ id: "a", name: "Elin", color: "#d4483b" }]);
    expect(labelsOf({})).toEqual([]);
  });

  it("puts a label on a scene and takes it off, leaving no empty list behind", () => {
    const labelled = withLabel(tree, "S1", "a", true);
    expect(hasLabel(labelled, "S1", "a")).toBe(true);

    const cleared = withLabel(labelled, "S1", "a", false);

    expect(cleared).toEqual(tree);
  });

  it("a removed label is taken off every node", () => {
    const labelled = withLabel(withLabel(tree, "S1", "a", true), "K1", "a", true);

    expect(withoutLabel(labelled, "a")).toEqual(tree);
  });
});
