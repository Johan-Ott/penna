import { describe, expect, it } from "vitest";
import type { Mentions } from "../src/project/cards";
import { fadingPeople } from "../src/project/fadingPeople";
import { CHARACTERS_ID, type TreeNode } from "../src/project/tree";

const chapters: TreeNode[] = Array.from({ length: 9 }, (_unused, index) => ({
  id: `k${index + 1}`,
  kind: "chapter",
  title: `Kapitel ${index + 1}`,
  children: [{ id: `s${index + 1}`, kind: "scene" }],
}));
const named = (count: number, sceneIds: string[]): Mentions => ({ count, sceneIds, sentences: {} });

describe("fadingPeople", () => {
  const maja = { id: "maja", sortId: CHARACTERS_ID, name: "Maja" };
  const elin = { id: "elin", sortId: CHARACTERS_ID, name: "Elin" };
  const isen = { id: "isen", sortId: "platser", name: "Isen" };

  it("names someone gone from the last third, not those still there or seldom named", () => {
    const mentions = new Map([
      ["maja", named(5, ["s1", "s2"])],
      ["elin", named(9, ["s1", "s9"])],
      ["isen", named(4, ["s1"])],
    ]);

    expect(fadingPeople([maja, elin, isen], mentions, chapters).map((note) => note.text)).toEqual([
      "Maja nämns senast i kapitel 2 av 9.",
    ]);
  });

  it("waits until the book has six chapters", () => {
    const mentions = new Map([["maja", named(5, ["s1"])]]);

    expect(fadingPeople([maja], mentions, chapters.slice(0, 5))).toEqual([]);
  });
});
