import { describe, expect, it } from "vitest";
import { contentsRows } from "../src/project/contents";
import { rowMatches } from "../src/project/contentsFilter";
import type { TreeNode } from "../src/project/tree";

const tree: TreeNode[] = [
  { id: "kap1", kind: "chapter", title: "Brevet", children: [{ id: "koket", kind: "scene" }] },
  {
    id: "kap2",
    kind: "chapter",
    title: "Smältningen",
    children: [{ id: "regnet", kind: "scene" }],
  },
];
const summaries = {
  koket: { title: "Köket", words: 10, status: "utkast" },
  regnet: { title: "Regnet", words: 10, status: "utkast" },
} as never;

describe("Innehåll's filter", () => {
  it("keeps the chapters where a person is named, and those only", () => {
    const sources = {
      tree,
      fields: {},
      cards: [{ id: "arvid", sortId: "karaktarer", name: "Arvid" }],
      mentions: new Map([["arvid", { count: 1, sceneIds: ["koket"], sentences: {} }]]),
    };
    const [brevet, smaltningen] = contentsRows(tree, summaries);

    expect(brevet && rowMatches(sources, brevet, "arv")).toBe(true);
    expect(smaltningen && rowMatches(sources, smaltningen, "arv")).toBe(false);
  });
});
